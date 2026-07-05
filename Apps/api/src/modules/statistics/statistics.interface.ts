import type {
  DashboardStatsDTO,
  ActivatorsSummaryDTO,
  DistributorsSummaryDTO,
  InventorySummaryDTO,
  OrdersSummaryDTO,
  ActivationsSummaryDTO,
  StatisticsOverviewDTO,
  StatisticsOverviewQuery,
  WilayaHeatmapDTO,
  WilayaHeatmapQuery,
  WilayaDrilldownDTO,
  WilayaDrilldownQuery,
} from '@my-app/contract';

export interface IStatisticsService {
  dashboard(): Promise<DashboardStatsDTO>;
  activatorsSummary(): Promise<ActivatorsSummaryDTO>;
  distributorsSummary(): Promise<DistributorsSummaryDTO>;
  inventorySummary(): Promise<InventorySummaryDTO>;
  ordersSummary(): Promise<OrdersSummaryDTO>;
  activationsSummary(): Promise<ActivationsSummaryDTO>;
  overview(query: StatisticsOverviewQuery): Promise<StatisticsOverviewDTO>;
  wilayaHeatmap(query: WilayaHeatmapQuery): Promise<WilayaHeatmapDTO>;
  wilayaDrilldown(wilayaId: string, query: WilayaDrilldownQuery): Promise<WilayaDrilldownDTO>;
}
