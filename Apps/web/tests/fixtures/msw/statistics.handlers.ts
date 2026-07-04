import { http } from "msw";
import { STATISTICS_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail } from "./envelope";
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
} from "../data/statistics.mock";

export const statisticsUrls = {
  dashboard: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.DASHBOARD),
  activatorsSummary: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.ACTIVATORS_SUMMARY),
  distributorsSummary: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.DISTRIBUTORS_SUMMARY),
  inventorySummary: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.INVENTORY_SUMMARY),
  ordersSummary: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.ORDERS_SUMMARY),
  activationsSummary: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.ACTIVATIONS_SUMMARY),
  overview: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.OVERVIEW),
  wilayaHeatmap: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.WILAYA_HEATMAP),
  wilayaDrilldown: apiUrl(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.WILAYA_DRILLDOWN),
};

// Static '/wilaya-heatmap' registered before the parameterized '/wilaya/:wilayaId' — mirrors
// Apps/api's own router comment ("Static /wilaya-heatmap must be registered BEFORE the param
// route /wilaya/:wilayaId").
export const statisticsHandlers = [
  http.get(statisticsUrls.dashboard, () => ok(mockDashboardStats)),
  http.get(statisticsUrls.activatorsSummary, () => ok(mockActivatorsSummary)),
  http.get(statisticsUrls.distributorsSummary, () => ok(mockDistributorsSummary)),
  http.get(statisticsUrls.inventorySummary, () => ok(mockInventorySummary)),
  http.get(statisticsUrls.ordersSummary, () => ok(mockOrdersSummary)),
  http.get(statisticsUrls.activationsSummary, () => ok(mockActivationsSummary)),
  http.get(statisticsUrls.overview, () => ok(mockStatisticsOverview)),
  http.get(statisticsUrls.wilayaHeatmap, () => ok(mockWilayaHeatmap)),
  http.get(statisticsUrls.wilayaDrilldown, () => ok(mockWilayaDrilldown)),
];

export const statisticsErrorHandlers = {
  dashboardServerError: () =>
    http.get(statisticsUrls.dashboard, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
};
