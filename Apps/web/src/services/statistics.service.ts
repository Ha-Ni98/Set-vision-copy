import {
  STATISTICS_ROUTES,
  type ApiResponse,
  type DashboardStatsDTO,
  type ActivatorsSummaryDTO,
  type DistributorsSummaryDTO,
  type InventorySummaryDTO,
  type OrdersSummaryDTO,
  type ActivationsSummaryDTO,
  type StatisticsOverviewDTO,
  type StatisticsOverviewQuery,
  type WilayaHeatmapDTO,
  type WilayaHeatmapQuery,
  type WilayaDrilldownDTO,
  type WilayaDrilldownQuery,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function dashboard(signal?: AbortSignal): Promise<DashboardStatsDTO> {
  const res = await api.get<ApiResponse<DashboardStatsDTO>>(
    apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.DASHBOARD),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function activatorsSummary(signal?: AbortSignal): Promise<ActivatorsSummaryDTO> {
  const res = await api.get<ApiResponse<ActivatorsSummaryDTO>>(
    apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.ACTIVATORS_SUMMARY),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function distributorsSummary(signal?: AbortSignal): Promise<DistributorsSummaryDTO> {
  const res = await api.get<ApiResponse<DistributorsSummaryDTO>>(
    apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.DISTRIBUTORS_SUMMARY),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function inventorySummary(signal?: AbortSignal): Promise<InventorySummaryDTO> {
  const res = await api.get<ApiResponse<InventorySummaryDTO>>(
    apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.INVENTORY_SUMMARY),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function ordersSummary(signal?: AbortSignal): Promise<OrdersSummaryDTO> {
  const res = await api.get<ApiResponse<OrdersSummaryDTO>>(
    apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.ORDERS_SUMMARY),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function activationsSummary(signal?: AbortSignal): Promise<ActivationsSummaryDTO> {
  const res = await api.get<ApiResponse<ActivationsSummaryDTO>>(
    apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.ACTIVATIONS_SUMMARY),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// StatisticsOverviewQuery.period is required by the contract.
export async function overview(
  query: StatisticsOverviewQuery,
  signal?: AbortSignal,
): Promise<StatisticsOverviewDTO> {
  const res = await api.get<ApiResponse<StatisticsOverviewDTO>>(
    apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.OVERVIEW),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// WilayaHeatmapDTO is a top-level array — the envelope's `data` is an array, not an object.
export async function wilayaHeatmap(
  query: WilayaHeatmapQuery,
  signal?: AbortSignal,
): Promise<WilayaHeatmapDTO> {
  const res = await api.get<ApiResponse<WilayaHeatmapDTO>>(
    apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.WILAYA_HEATMAP),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function wilayaDrilldown(
  wilayaId: string,
  query: WilayaDrilldownQuery,
  signal?: AbortSignal,
): Promise<WilayaDrilldownDTO> {
  const res = await api.get<ApiResponse<WilayaDrilldownDTO>>(
    withParams(apiPath(STATISTICS_ROUTES.BASE, STATISTICS_ROUTES.WILAYA_DRILLDOWN), { wilayaId }),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
