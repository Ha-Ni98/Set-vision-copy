import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { statisticsUrls } from "../../fixtures/msw/statistics.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import {
  mockDashboardStats,
  mockActivatorsSummary,
  mockDistributorsSummary,
  mockInventorySummary,
  mockOrdersSummary,
  mockActivationsSummary,
  mockStatisticsOverview,
  mockWilayaHeatmap,
  mockWilayaDrilldown,
} from "../../fixtures/data/statistics.mock";
import {
  useDashboardStats,
  useActivatorsSummary,
  useDistributorsSummary,
  useInventorySummary,
  useOrdersSummary,
  useActivationsSummary,
  useStatisticsOverview,
  useWilayaHeatmap,
  useWilayaDrilldown,
} from "@/hooks/useStatistics";

describe("statistics query hooks", () => {
  it("useDashboardStats resolves with the unwrapped DTO", async () => {
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDashboardStats);
  });

  it("useActivatorsSummary resolves with the unwrapped DTO", async () => {
    const { result } = renderHook(() => useActivatorsSummary(), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockActivatorsSummary);
  });

  it("useDistributorsSummary resolves with the unwrapped DTO", async () => {
    const { result } = renderHook(() => useDistributorsSummary(), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockDistributorsSummary);
  });

  it("useInventorySummary resolves with the unwrapped DTO", async () => {
    const { result } = renderHook(() => useInventorySummary(), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockInventorySummary);
  });

  it("useOrdersSummary resolves with the unwrapped DTO", async () => {
    const { result } = renderHook(() => useOrdersSummary(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockOrdersSummary);
  });

  it("useActivationsSummary resolves with the unwrapped DTO", async () => {
    const { result } = renderHook(() => useActivationsSummary(), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockActivationsSummary);
  });

  it("useStatisticsOverview resolves with the unwrapped DTO given a required period", async () => {
    const { result } = renderHook(() => useStatisticsOverview({ period: "this_month" }), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStatisticsOverview);
  });

  it("useWilayaHeatmap resolves with the unwrapped top-level array", async () => {
    const { result } = renderHook(() => useWilayaHeatmap({}), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockWilayaHeatmap);
  });

  it("useWilayaDrilldown is enabled-gated on a truthy wilayaId", async () => {
    let called = false;
    server.use(
      http.get(statisticsUrls.wilayaDrilldown, () => {
        called = true;
        return ok(mockWilayaDrilldown);
      }),
    );
    renderHook(() => useWilayaDrilldown("", {}), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("useWilayaDrilldown fetches once given a real wilayaId", async () => {
    const { result } = renderHook(() => useWilayaDrilldown("id", {}), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockWilayaDrilldown);
  });
});
