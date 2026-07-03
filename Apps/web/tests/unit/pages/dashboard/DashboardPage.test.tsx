import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivationStat } from "@my-app/contract";
import DashboardPage from "@/pages/admin/DashboardPage";
import * as useStatisticsHook from "@/hooks/useStatistics";
import * as useAdminActivationsHook from "@/hooks/useAdminActivations";
import * as useRecentActivationsHook from "@/hooks/useRecentActivations";
import * as usePendingActivationsHook from "@/hooks/usePendingActivations";

vi.mock("@/hooks/useStatistics");
vi.mock("@/hooks/useAdminActivations");
vi.mock("@/hooks/useRecentActivations");
vi.mock("@/hooks/usePendingActivations");
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const loadingQuery = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };
const emptyQuery = { data: [], isLoading: false, isError: false, refetch: vi.fn() };

function mockAllLoading() {
  vi.mocked(useStatisticsHook.useActivationsSummary).mockReturnValue(loadingQuery as never);
  vi.mocked(useStatisticsHook.useActivatorsSummary).mockReturnValue(loadingQuery as never);
  vi.mocked(useStatisticsHook.useDistributorsSummary).mockReturnValue(loadingQuery as never);
  vi.mocked(useAdminActivationsHook.useAdminActivations).mockReturnValue(loadingQuery as never);
  vi.mocked(useAdminActivationsHook.useActivateByAdmin).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(useAdminActivationsHook.useCancelByAdmin).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(useRecentActivationsHook.useRecentActivations).mockReturnValue(loadingQuery as never);
  vi.mocked(usePendingActivationsHook.usePendingActivations).mockReturnValue(loadingQuery as never);
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllLoading();
  });

  it("renders 4 stat-card skeletons while summaries are loading", () => {
    const { container } = render(<DashboardPage />);
    // StatCardSkeleton is the only skeleton with `p-5` on its wrapper — TableSkeleton's
    // wrapper (also `rounded-2xl border`, also loading in this test) has no padding there.
    expect(container.querySelectorAll(".rounded-2xl.border.p-5")).toHaveLength(4);
  });

  it("renders card values from the mocked summary DTOs", () => {
    vi.mocked(useStatisticsHook.useActivationsSummary).mockReturnValue({
      data: {
        total: { all: 500, today: 3, week: 20, month: 42 },
        byState: [
          { state: ActivationStat.ACTIVATED, count: 300 },
          { state: ActivationStat.ACTIVATED_BY_ADMIN, count: 12 },
        ],
        avgDurationSeconds: 200,
        totalRevenue: 0,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useStatisticsHook.useActivatorsSummary).mockReturnValue({
      data: { totalActivators: 25, onlineNow: 4, totalSuccessful: 300, totalCreditsOwed: 1000 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useStatisticsHook.useDistributorsSummary).mockReturnValue({
      data: {
        totalDistributors: 10,
        activeWithStock: 6,
        totalCardsInStock: 88,
        activationsThisMonth: 40,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    render(<DashboardPage />);
    expect(screen.getByText("312")).toBeInTheDocument(); // 300 + 12 completed
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
  });

  it("shows each region's empty state on an empty array, and its error state with a working retry on isError", async () => {
    const user = userEvent.setup();
    vi.mocked(useAdminActivationsHook.useAdminActivations).mockReturnValue(emptyQuery as never);
    const recentRefetch = vi.fn();
    vi.mocked(useRecentActivationsHook.useRecentActivations).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: recentRefetch,
    } as never);
    vi.mocked(usePendingActivationsHook.usePendingActivations).mockReturnValue(emptyQuery as never);

    render(<DashboardPage />);

    expect(screen.getByText("admin.dashboard.frozen.empty")).toBeInTheDocument();
    expect(screen.getByText("admin.dashboard.pending.empty")).toBeInTheDocument();

    const retryButton = screen.getByText("common.actions.tryAgain");
    await user.click(retryButton);
    expect(recentRefetch).toHaveBeenCalledTimes(1);
  });

  it("confirms Activate on a frozen row and calls useActivateByAdmin.mutate with its id", async () => {
    const user = userEvent.setup();
    const activateMutate = vi.fn();
    vi.mocked(useAdminActivationsHook.useAdminActivations).mockReturnValue({
      data: {
        items: [
          {
            id: "activation-1",
            key: "KEY-1",
            subscriptionLabel: "Snap+ 1mo",
            activatorFullName: "Ali",
            distributorStoreName: "Store",
            clientName: "Client",
            clientPhone: "0555",
            state: ActivationStat.FREEZE,
            requestedAt: new Date().toISOString(),
            takenAt: null,
            completedAt: null,
            durationSeconds: null,
            activationPrice: null,
            freezeReason: "Suspicious",
          },
        ],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useAdminActivationsHook.useActivateByAdmin).mockReturnValue({
      mutate: activateMutate,
      isPending: false,
    } as never);

    render(<DashboardPage />);

    await user.click(screen.getByText("common.actions.activate"));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByText("common.actions.activate"));

    expect(activateMutate).toHaveBeenCalledWith("activation-1");
  });
});
