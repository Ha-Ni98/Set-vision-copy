import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ActivationStat } from "@my-app/contract";
import ActivationsPage from "@/pages/admin/activations/ActivationsPage";
import * as useStatisticsHook from "@/hooks/useStatistics";
import * as useAdminActivationsHook from "@/hooks/useAdminActivations";
import * as useSubscriptionPlansHook from "@/hooks/useSubscriptionPlans";
import * as useActivatorsHook from "@/hooks/useActivators";
import * as useDistributorsHook from "@/hooks/useDistributors";
import * as useGeographyHook from "@/hooks/useGeography";

vi.mock("@/hooks/useStatistics");
vi.mock("@/hooks/useAdminActivations");
vi.mock("@/hooks/useSubscriptionPlans");
vi.mock("@/hooks/useActivators");
vi.mock("@/hooks/useDistributors");
vi.mock("@/hooks/useGeography");

function activation(overrides: Record<string, unknown> = {}) {
  return {
    id: "act-1",
    key: "KEY-1",
    subscriptionLabel: "Snap+ 1mo",
    activatorFullName: "Ali Benali",
    distributorStoreName: "Store One",
    clientName: "Client One",
    clientPhone: "0555000000",
    state: ActivationStat.PENDING,
    requestedAt: new Date().toISOString(),
    takenAt: null,
    completedAt: null,
    durationSeconds: null,
    activationPrice: null,
    freezeReason: null,
    ...overrides,
  };
}

function mockActivations(items: unknown[]) {
  vi.mocked(useAdminActivationsHook.useAdminActivations).mockReturnValue({
    data: { items, meta: { page: 1, limit: 10, total: items.length, totalPages: 1 } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
}

describe("ActivationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStatisticsHook.useActivationsSummary).mockReturnValue({
      data: {
        total: { all: 0, today: 0, week: 0, month: 0 },
        byState: [],
        avgDurationSeconds: null,
        totalRevenue: 0,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useSubscriptionPlansHook.useSubscriptionPlans).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useActivatorsHook.useActivators).mockReturnValue({
      data: { items: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useDistributorsHook.useDistributors).mockReturnValue({
      data: { items: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } },
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useGeographyHook.useWilayas).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useGeographyHook.useCommunes).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useAdminActivationsHook.useActivateByAdmin).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useAdminActivationsHook.useCancelByAdmin).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useAdminActivationsHook.useSetActivationPrice).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    mockActivations([]);
  });

  function renderPage(initialRoute = "/admin/activations") {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <ActivationsPage />
      </MemoryRouter>,
    );
  }

  it("renders stat-card and donut skeletons while the summary is loading", () => {
    vi.mocked(useStatisticsHook.useActivationsSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const { container } = renderPage();
    // 3 stat cards + the ByStateDonut's ChartSkeleton, all driven by the same summary query —
    // both skeleton components share this exact wrapper markup, so count rather than
    // distinguish them.
    expect(container.querySelectorAll(".rounded-2xl.border.p-5")).toHaveLength(4);
  });

  it("shows the no-activations empty state, then no-match+Clear once a search term is typed", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("admin.activations.empty.noActivations")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("admin.activations.search.placeholder"), "zzz");
    expect(await screen.findByText("admin.activations.empty.noMatch")).toBeInTheDocument();

    await user.click(screen.getByText("common.actions.clear"));
    expect(await screen.findByText("admin.activations.empty.noActivations")).toBeInTheDocument();
  });

  it("shows NotFoundState with a working retry on error", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    vi.mocked(useAdminActivationsHook.useAdminActivations).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never);
    renderPage();
    await user.click(screen.getByText("common.actions.tryAgain"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows Activate/Cancel for a FREEZE row and confirms Activate with the right mutate", async () => {
    const user = userEvent.setup();
    const activateMutate = vi.fn();
    vi.mocked(useAdminActivationsHook.useActivateByAdmin).mockReturnValue({
      mutate: activateMutate,
      isPending: false,
    } as never);
    mockActivations([
      activation({ id: "act-freeze", state: ActivationStat.FREEZE, freezeReason: "Suspicious" }),
    ]);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("common.actions.activate")).toBeInTheDocument();
    expect(within(menu).getByText("common.actions.cancel")).toBeInTheDocument();
    expect(within(menu).queryByText("admin.activations.actions.setPrice")).not.toBeInTheDocument();

    await user.click(within(menu).getByText("common.actions.activate"));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByText("common.actions.activate"));
    expect(activateMutate).toHaveBeenCalledWith("act-freeze");
  });

  it("shows Set Price (not Resolve) for a completed+unpriced row, and submits the real amount", async () => {
    const user = userEvent.setup();
    const setPriceMutate = vi.fn();
    vi.mocked(useAdminActivationsHook.useSetActivationPrice).mockReturnValue({
      mutate: setPriceMutate,
      isPending: false,
    } as never);
    mockActivations([
      activation({ id: "act-completed", state: ActivationStat.ACTIVATED, activationPrice: null }),
    ]);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("admin.activations.actions.setPrice")).toBeInTheDocument();
    expect(within(menu).queryByText("common.actions.activate")).not.toBeInTheDocument();

    await user.click(within(menu).getByText("admin.activations.actions.setPrice"));
    const priceDialog = await screen.findByRole("dialog");
    const amountInput = within(priceDialog).getByLabelText(
      "admin.activations.setPriceModal.amount",
    );
    await user.clear(amountInput);
    await user.type(amountInput, "750");
    await user.click(within(priceDialog).getByText("common.actions.confirm"));

    expect(setPriceMutate).toHaveBeenCalledWith({
      id: "act-completed",
      command: { amount: 750 },
    });
  });

  it("shows neither Resolve nor Set Price for an already-priced completed row", async () => {
    const user = userEvent.setup();
    mockActivations([
      activation({ id: "act-priced", state: ActivationStat.ACTIVATED, activationPrice: 500 }),
    ]);
    renderPage();

    await user.click(screen.getByLabelText("common.actions.action"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).queryByText("admin.activations.actions.setPrice")).not.toBeInTheDocument();
    expect(within(menu).queryByText("common.actions.activate")).not.toBeInTheDocument();
  });

  it("seeds the activator/distributor/state filters once from the URL", () => {
    renderPage("/admin/activations?activator=act-9&distributor=dist-9&state=FREEZE");
    expect(useAdminActivationsHook.useAdminActivations).toHaveBeenCalledWith(
      expect.objectContaining({
        activatorId: "act-9",
        distributorId: "dist-9",
        state: "FREEZE",
      }),
    );
  });
});
