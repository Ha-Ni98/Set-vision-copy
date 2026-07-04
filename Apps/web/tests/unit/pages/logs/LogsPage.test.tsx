import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LogActionType } from "@my-app/contract";
import LogsPage from "@/pages/admin/logs/LogsPage";
import * as useLogsHook from "@/hooks/useLogs";
import * as useAdminsHook from "@/hooks/useAdmins";

vi.mock("@/hooks/useLogs");
vi.mock("@/hooks/useAdmins");

const ADMINS = [
  {
    id: "admin-1",
    userId: "u-1",
    fullName: "Admin One",
    username: "admin1",
    phone: "0555000000",
    isEnabled: true,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  },
];

function log(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    actionType: LogActionType.CHANGE_USER_PASSWORD,
    actionDescription: "Reset password for Ali Benali",
    userName: "Admin One",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockLogs(items: unknown[]) {
  vi.mocked(useLogsHook.useLogs).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

describe("LogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminsHook.useAdmins).mockReturnValue({
      data: { items: ADMINS, meta: { page: 1, limit: 100, total: 1, totalPages: 1 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    mockLogs([]);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <LogsPage />
      </MemoryRouter>,
    );
  }

  it("renders a table skeleton while loading", () => {
    vi.mocked(useLogsHook.useLogs).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const { container } = renderPage();
    expect(container.querySelectorAll("table")).toHaveLength(0);
  });

  it("shows the no-logs empty state, then no-match+Clear once a search term is typed", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("admin.logs.empty.noLogs")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("admin.logs.search.placeholder"), "zzz");
    expect(await screen.findByText("admin.logs.empty.noMatch")).toBeInTheDocument();

    await user.click(screen.getByText("common.actions.clear"));
    expect(await screen.findByText("admin.logs.empty.noLogs")).toBeInTheDocument();
  });

  it("shows NotFoundState with a working retry on error", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    vi.mocked(useLogsHook.useLogs).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never);
    renderPage();
    await user.click(screen.getByText("common.actions.tryAgain"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders a LogActionBadge and a relative-time cell per row", () => {
    mockLogs([log()]);
    renderPage();
    // DataTable renders both desktop and mobile row variants at once in JSDOM (no CSS media
    // query evaluation) — both share this text, take the first. StatusPill's "● {label}" is a
    // single text node (leading bullet), so match by substring rather than exact text.
    expect(
      screen.getAllByText(/enums\.logActionType\.CHANGE_USER_PASSWORD/)[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText("Reset password for Ali Benali")[0]).toBeInTheDocument();
  });

  it("changing the user filter re-issues useLogs with the selected userId", async () => {
    const user = userEvent.setup();
    renderPage();

    const userTrigger = screen.getAllByRole("combobox")[0];
    await user.click(userTrigger);
    await user.click(await screen.findByRole("option", { name: "Admin One" }));

    expect(useLogsHook.useLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: "admin-1" }),
    );
  });

  it("changing the action-type filter re-issues useLogs with the selected actionType", async () => {
    const user = userEvent.setup();
    renderPage();

    const actionTrigger = screen.getAllByRole("combobox")[1];
    await user.click(actionTrigger);
    await user.click(
      await screen.findByRole("option", {
        name: "enums.logActionType.CHANGE_USER_PASSWORD",
      }),
    );

    expect(useLogsHook.useLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ actionType: LogActionType.CHANGE_USER_PASSWORD }),
    );
  });
});
