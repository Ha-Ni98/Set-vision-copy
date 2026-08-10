import { useQuery } from "@tanstack/react-query";
import type {
  StatisticsOverviewQuery,
  WilayaHeatmapQuery,
  WilayaDrilldownQuery,
  RevenueSummaryQuery,
  RevenueSeriesQuery,
  RevenueBreakdownQuery,
} from "@my-app/contract";
import * as statisticsService from "@/services/statistics.service";
import { qk } from "@/lib/query-keys";

// Grouped per domain (plan.md D6) — statistics reads everything and touches nothing, so no
// mutation hooks exist here and no other domain's mutations invalidate these keys (§3.2).

export function useDashboardStats() {
  return useQuery({
    queryKey: qk.statistics.dashboard(),
    queryFn: ({ signal }) => statisticsService.dashboard(signal),
  });
}

export function useActivatorsSummary() {
  return useQuery({
    queryKey: qk.statistics.activatorsSummary(),
    queryFn: ({ signal }) => statisticsService.activatorsSummary(signal),
  });
}

export function useDistributorsSummary() {
  return useQuery({
    queryKey: qk.statistics.distributorsSummary(),
    queryFn: ({ signal }) => statisticsService.distributorsSummary(signal),
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: qk.statistics.inventorySummary(),
    queryFn: ({ signal }) => statisticsService.inventorySummary(signal),
  });
}

export function useOrdersSummary() {
  return useQuery({
    queryKey: qk.statistics.ordersSummary(),
    queryFn: ({ signal }) => statisticsService.ordersSummary(signal),
  });
}

export function useActivationsSummary() {
  return useQuery({
    queryKey: qk.statistics.activationsSummary(),
    queryFn: ({ signal }) => statisticsService.activationsSummary(signal),
  });
}

export function useStatisticsOverview(query: StatisticsOverviewQuery) {
  return useQuery({
    queryKey: qk.statistics.overview(query),
    queryFn: ({ signal }) => statisticsService.overview(query, signal),
  });
}

export function useWilayaHeatmap(query: WilayaHeatmapQuery) {
  return useQuery({
    queryKey: qk.statistics.wilayaHeatmap(query),
    queryFn: ({ signal }) => statisticsService.wilayaHeatmap(query, signal),
  });
}

export function useWilayaDrilldown(wilayaId: string, query: WilayaDrilldownQuery) {
  return useQuery({
    queryKey: qk.statistics.wilayaDrilldown(wilayaId, query),
    queryFn: ({ signal }) => statisticsService.wilayaDrilldown(wilayaId, query, signal),
    enabled: !!wilayaId,
  });
}

export function useRevenueSummary(query: RevenueSummaryQuery) {
  return useQuery({
    queryKey: qk.statistics.revenueSummary(query),
    queryFn: ({ signal }) => statisticsService.revenueSummary(query, signal),
  });
}

export function useRevenueSeries(query: RevenueSeriesQuery) {
  return useQuery({
    queryKey: qk.statistics.revenueSeries(query),
    queryFn: ({ signal }) => statisticsService.revenueSeries(query, signal),
  });
}

export function useRevenueBreakdown(query: RevenueBreakdownQuery) {
  return useQuery({
    queryKey: qk.statistics.revenueBreakdown(query),
    queryFn: ({ signal }) => statisticsService.revenueBreakdown(query, signal),
  });
}
