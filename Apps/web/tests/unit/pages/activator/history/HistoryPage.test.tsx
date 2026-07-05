import "../../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ActivationStat } from "@my-app/contract";
import type { ActivatorHistoryItemDTO, RecentActivationDTO } from "@my-app/contract";
import HistoryPage from "@/pages/activator/HistoryPage";
import * as useMyHistoryHook from "@/hooks/useMyHistory";
import * as useRecentActivationsHook from "@/hooks/useRecentActivations";

vi.mock("@/hooks/useMyHistory");
vi.mock("@/hooks/useRecentActivations");

function recent(overrides: Partial<RecentActivationDTO> = {}): RecentActivationDTO {
  return {
    id: "recent-1",
    subscriptionLabel: "Snap+ 1mo",
    keyMasked: "****-1234",
    completedAt: "2026-06-30T10:00:00.000Z",
    state: ActivationStat.ACTIVATED,
    activationEmail: null,
    ...overrides,
  };
}

function historyItem(overrides: Partial<ActivatorHistoryItemDTO> = {}): ActivatorHistoryItemDTO {
  return {
    id: "hist-1",
    subscriptionLabel: "Snap+ 1mo",
    key: "FULL-KEY-0001",
    state: ActivationStat.ACTIVATED,
    requestedAt: "2026-06-30T09:00:00.000Z",
    takenAt: "2026-06-30T09:01:00.000Z",
    completedAt: "2026-06-30T09:05:00.000Z",
    durationSeconds: 240,
    earning: 500,
    client: { fullName: "Client One", phone: "0555000001" },
    ...overrides,
  };
}

function mockRecent(data: RecentActivationDTO[], overrides: Record<string, unknown> = {}) {
  vi.mocked(useRecentActivationsHook.useRecentActivations).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as never);
}

function mockHistory(items: ActivatorHistoryItemDTO[], overrides: Record<string, unknown> = {}) {
  vi.mocked(useMyHistoryHook.useMyHistory).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  );
}

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecent([]);
    mockHistory([]);
  });

  it("renders the Global Recent columns, including the activation email (Stage-04-fix #2)", () => {
    mockRecent([recent()]);
    renderPage();

    const table = screen.getByText("activator.history.recentTable.subscription").closest("table")!;
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    expect(headers).toEqual([
      "activator.history.recentTable.subscription",
      "activator.history.recentTable.key",
      "activator.history.recentTable.email",
      "activator.history.recentTable.completed",
      "activator.history.recentTable.status",
    ]);
  });

  it("shows Section A's empty state when there's no recent activity", () => {
    renderPage();
    expect(screen.getByText("activator.history.recentEmpty")).toBeInTheDocument();
  });

  it("mutates the query when typing in the search box (debounced)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.type(screen.getByPlaceholderText("activator.history.searchPlaceholder"), "ali");
    await vi.advanceTimersByTimeAsync(350);

    expect(useMyHistoryHook.useMyHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "ali" }),
    );
    vi.useRealTimers();
  });

  it("mutates the query with the selected status and sort", async () => {
    const user = userEvent.setup();
    renderPage();

    const statusTrigger = screen.getAllByRole("combobox")[0];
    await user.click(statusTrigger);
    await user.click(
      await screen.findByRole("option", { name: `enums.activationStat.${ActivationStat.FREEZE}` }),
    );
    expect(useMyHistoryHook.useMyHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: ActivationStat.FREEZE }),
    );
  });

  it("re-sorts the rendered rows client-side by earning without re-querying", async () => {
    const user = userEvent.setup();
    mockHistory([
      historyItem({ id: "low", earning: 100 }),
      historyItem({ id: "high", earning: 900 }),
    ]);
    renderPage();

    const sortTrigger = screen.getAllByRole("combobox")[1];
    await user.click(sortTrigger);
    await user.click(await screen.findByRole("option", { name: "activator.history.sortEarning" }));

    const table = screen.getByText("activator.history.myTable.subscription").closest("table")!;
    const rows = within(table).getAllByRole("row");
    // rows[0] is the header row — the highest earner ("900 DZD") should now render first.
    expect(within(rows[1]).getByText("900 DZD")).toBeInTheDocument();
  });

  it("shows the true-empty state (with a link to Requests) when there are no filters active", () => {
    renderPage();
    expect(screen.getByText("activator.history.myEmpty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "activator.dashboard.goToRequests" })).toHaveAttribute(
      "href",
      "/requests",
    );
  });

  it("shows the no-match+Clear state once a filter is active, and Clear resets it", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("activator.history.searchPlaceholder"), "zzz");
    expect(await screen.findByText("activator.history.noMatch")).toBeInTheDocument();

    await user.click(screen.getByText("common.actions.clear"));
    expect(await screen.findByText("activator.history.myEmpty")).toBeInTheDocument();
  });

  it("shows NotFoundState with a working retry for each section on error", async () => {
    const user = userEvent.setup();
    const refetchRecent = vi.fn();
    const refetchHistory = vi.fn();
    mockRecent([], { data: undefined, isError: true, refetch: refetchRecent });
    mockHistory([], { data: undefined, isError: true, refetch: refetchHistory });
    renderPage();

    const retries = screen.getAllByText("common.actions.tryAgain");
    expect(retries).toHaveLength(2);
    await user.click(retries[0]);
    await user.click(retries[1]);
    expect(refetchRecent).toHaveBeenCalledTimes(1);
    expect(refetchHistory).toHaveBeenCalledTimes(1);
  });

  it("disables Previous on page 1 and Next once the last page is reached", () => {
    mockHistory([historyItem()], {
      data: {
        items: [historyItem()],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    });
    renderPage();
    expect(screen.getByText("common.actions.previous").closest("button")).toBeDisabled();
    expect(screen.getByText("common.actions.next").closest("button")).toBeDisabled();
  });

  it("moving to page 2 re-queries with the new page number", async () => {
    const user = userEvent.setup();
    mockHistory([historyItem()], {
      data: {
        items: [historyItem()],
        meta: { page: 1, limit: 10, total: 25, totalPages: 3 },
      },
    });
    renderPage();

    await user.click(screen.getByText("common.actions.next").closest("button")!);
    expect(useMyHistoryHook.useMyHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });
});
