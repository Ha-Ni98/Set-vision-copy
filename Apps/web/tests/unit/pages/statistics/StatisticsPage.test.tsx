import "../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import StatisticsPage from "@/pages/admin/statistics/StatisticsPage";
import * as useStatisticsHook from "@/hooks/useStatistics";
import * as useSubscriptionPlansHook from "@/hooks/useSubscriptionPlans";
import * as useGeographyHook from "@/hooks/useGeography";

vi.mock("@/hooks/useStatistics");
vi.mock("@/hooks/useSubscriptionPlans");
vi.mock("@/hooks/useGeography");

const EMPTY_OVERVIEW = {
  activationsOverTime: [],
  activationsByState: [],
  topActivators: [],
  topDistributors: [],
  avgTimeTrend: [],
  revenueOverTime: [],
};

const HEATMAP_DATA = [
  {
    wilayaId: "w-alger",
    wilayaName: "Alger",
    wilayaCode: "16",
    distributorsCount: 5,
    activationsCount: 20,
    cancellationsCount: 1,
    avgActivationTimeSeconds: 120,
  },
];

function mockOverview(data: unknown, extra: Record<string, unknown> = {}) {
  vi.mocked(useStatisticsHook.useStatisticsOverview).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...extra,
  } as never);
}

describe("StatisticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSubscriptionPlansHook.useSubscriptionPlans).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useGeographyHook.useWilayas).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    vi.mocked(useStatisticsHook.useWilayaHeatmap).mockReturnValue({
      data: HEATMAP_DATA,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useStatisticsHook.useWilayaDrilldown).mockReturnValue({
      data: {
        wilayaId: "w-alger",
        wilayaName: "Alger",
        topDistributors: [],
        activationsByPlan: [],
        activationsOverTime: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    mockOverview(EMPTY_OVERVIEW);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <StatisticsPage />
      </MemoryRouter>,
    );
  }

  it("shows each chart's own empty state when the shared overview has no data", () => {
    renderPage();
    expect(screen.getAllByText("admin.statistics.charts.empty")).toHaveLength(6);
  });

  it("shows each chart's own error state with a shared, working retry", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockOverview(undefined, { isError: true, refetch });
    renderPage();

    const retryButtons = screen.getAllByText("common.actions.tryAgain");
    expect(retryButtons).toHaveLength(6);
    await user.click(retryButtons[0]);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("changing the period re-issues useStatisticsOverview with the new period", async () => {
    const user = userEvent.setup();
    renderPage();

    const periodTrigger = screen.getAllByRole("combobox")[0];
    await user.click(periodTrigger);
    await user.click(
      await screen.findByRole("option", { name: "admin.statistics.period.this_year" }),
    );

    expect(useStatisticsHook.useStatisticsOverview).toHaveBeenLastCalledWith(
      expect.objectContaining({ period: "this_year" }),
    );
  });

  it("switching color mode changes the heatmap's colorMode prop (via HeatmapColorModeSelect)", async () => {
    const user = userEvent.setup();
    renderPage();

    const colorModeTrigger = screen.getByLabelText("admin.statistics.colorMode.label");
    await user.click(colorModeTrigger);
    await user.click(
      await screen.findByRole("option", { name: "admin.statistics.colorMode.cancellations" }),
    );

    // Re-selecting the trigger reflects the newly chosen value.
    expect(colorModeTrigger).toHaveTextContent("admin.statistics.colorMode.cancellations");
  });

  it("clicking a wilaya opens the drilldown panel and enables useWilayaDrilldown with its id", async () => {
    const user = userEvent.setup();
    renderPage();

    const wilaya = screen.getByLabelText("Alger");
    await user.click(wilaya);

    expect(useStatisticsHook.useWilayaDrilldown).toHaveBeenLastCalledWith(
      "w-alger",
      expect.objectContaining({ period: expect.any(String) }),
    );
    const panel = await screen.findByRole("dialog");
    expect(within(panel).getByText("Alger")).toBeInTheDocument();
  });
});
