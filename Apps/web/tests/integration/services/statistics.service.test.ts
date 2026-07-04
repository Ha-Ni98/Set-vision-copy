import { describe, it, expect } from "vitest";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { statisticsUrls, statisticsErrorHandlers } from "../../fixtures/msw/statistics.handlers";
import { ok } from "../../fixtures/msw/envelope";
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
import * as statisticsService from "@/services/statistics.service";

describe("statistics.service", () => {
  it("dashboard returns the unwrapped DTO", async () => {
    const result = await statisticsService.dashboard();
    expect(result).toEqual(mockDashboardStats);
  });

  it("dashboard throws on 500", async () => {
    server.use(statisticsErrorHandlers.dashboardServerError());
    await expect(statisticsService.dashboard()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("activatorsSummary returns the unwrapped DTO", async () => {
    const result = await statisticsService.activatorsSummary();
    expect(result).toEqual(mockActivatorsSummary);
  });

  it("distributorsSummary returns the unwrapped DTO", async () => {
    const result = await statisticsService.distributorsSummary();
    expect(result).toEqual(mockDistributorsSummary);
  });

  it("inventorySummary returns the unwrapped DTO, zero-count stats omitted from the arrays", async () => {
    const result = await statisticsService.inventorySummary();
    expect(result).toEqual(mockInventorySummary);
    expect(result.sets).toHaveLength(2);
  });

  it("ordersSummary returns the unwrapped DTO", async () => {
    const result = await statisticsService.ordersSummary();
    expect(result).toEqual(mockOrdersSummary);
  });

  it("activationsSummary returns the unwrapped DTO", async () => {
    const result = await statisticsService.activationsSummary();
    expect(result).toEqual(mockActivationsSummary);
  });

  it("overview sends the required period and returns the unwrapped DTO", async () => {
    let seenSearch = "";
    server.use(
      http.get(statisticsUrls.overview, ({ request }) => {
        seenSearch = new URL(request.url).search;
        return ok(mockStatisticsOverview);
      }),
    );
    const result = await statisticsService.overview({ period: "this_month" });
    expect(result).toEqual(mockStatisticsOverview);
    expect(seenSearch).toContain("period=this_month");
  });

  it("wilayaHeatmap returns the unwrapped top-level array", async () => {
    const result = await statisticsService.wilayaHeatmap({});
    expect(result).toEqual(mockWilayaHeatmap);
    expect(Array.isArray(result)).toBe(true);
  });

  it("wilayaDrilldown sends the wilayaId param and returns the unwrapped DTO", async () => {
    const result = await statisticsService.wilayaDrilldown("id", {});
    expect(result).toEqual(mockWilayaDrilldown);
  });
});
