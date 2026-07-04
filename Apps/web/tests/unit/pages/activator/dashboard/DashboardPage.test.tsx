import "../../../../fixtures/wrappers/mockTranslation";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ActivatorDashboardDTO } from "@my-app/contract";
import DashboardPage from "@/pages/activator/DashboardPage";
import * as useMyStatsHook from "@/hooks/useMyStats";

vi.mock("@/hooks/useMyStats");

function dto(overrides: Partial<ActivatorDashboardDTO> = {}): ActivatorDashboardDTO {
  return {
    totalEarnings: 15000,
    earningsTrendPercent: 12,
    creditsBalance: 3000,
    totalActivations: 42,
    activationsToday: 3,
    avgActivationTimeSeconds: 180,
    activeSlotsUsed: 1,
    weekly: [
      { date: "2026-06-28T00:00:00.000Z", count: 2 },
      { date: "2026-06-29T00:00:00.000Z", count: 5 },
    ],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 4 stat-card skeletons plus the chart skeleton while loading", () => {
    vi.mocked(useMyStatsHook.useMyStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const { container } = renderPage();
    // StatCardSkeleton and ChartSkeleton share the same "rounded-2xl border ... p-5" wrapper
    // markup — 4 stat cards (top row) + 1 chart + 1 stat card (Active Slots slot) = 6.
    expect(container.querySelectorAll(".rounded-2xl.border.p-5")).toHaveLength(6);
  });

  it("renders values, trend, today count, avg-tier pace, and slots from the mocked DTO", () => {
    vi.mocked(useMyStatsHook.useMyStats).mockReturnValue({
      data: dto(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(screen.getByText("15,000 DZD")).toBeInTheDocument();
    expect(screen.getByText("3,000 DZD")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("3:00")).toBeInTheDocument();
    expect(screen.getByText("activator.dashboard.pacExcellent")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows the above-target pace label once avg time crosses 5 minutes", () => {
    vi.mocked(useMyStatsHook.useMyStats).mockReturnValue({
      data: dto({ avgActivationTimeSeconds: 400 }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();
    expect(screen.getByText("activator.dashboard.paceAboveTarget")).toBeInTheDocument();
  });

  it("shows the new-activator empty state (not the chart) when totalActivations is 0", () => {
    vi.mocked(useMyStatsHook.useMyStats).mockReturnValue({
      data: dto({ totalActivations: 0 }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();

    expect(screen.getByText("activator.dashboard.emptyTitle")).toBeInTheDocument();
    expect(screen.queryByText("activator.dashboard.weeklyChart")).not.toBeInTheDocument();
    // Emphasised (filled/"default" variant, not "outline") quick-action button for a
    // brand-new activator — the default variant is the only one with a `bg-primary` class.
    const cta = screen.getByRole("link", { name: /activator.dashboard.goToRequests/ });
    expect(cta.className).toMatch(/bg-primary\b/);
  });

  it("shows the outline (non-emphasised) quick-action button once there's real activity", () => {
    vi.mocked(useMyStatsHook.useMyStats).mockReturnValue({
      data: dto({ totalActivations: 5 }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderPage();
    const cta = screen.getByRole("link", { name: /activator.dashboard.goToRequests/ });
    expect(cta.className).toMatch(/border-input/);
  });

  it("shows NotFoundState with a working retry on error", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    vi.mocked(useMyStatsHook.useMyStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as never);
    renderPage();

    await user.click(screen.getByText("common.actions.tryAgain"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
