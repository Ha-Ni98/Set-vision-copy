import type { SubscriptionPlan } from '@prisma/client';
import {
  DashboardStatsResponseSchema,
  ActivatorsSummaryResponseSchema,
  DistributorsSummaryResponseSchema,
  InventorySummaryResponseSchema,
  OrdersSummaryResponseSchema,
  ActivationsSummaryResponseSchema,
  StatisticsOverviewResponseSchema,
  WilayaHeatmapResponseSchema,
  WilayaDrilldownResponseSchema,
  RevenueSummaryResponseSchema,
  RevenueSeriesResponseSchema,
  RevenueBreakdownResponseSchema,
  ActivationStat,
  CardStat,
  LotStat,
  OrderStat,
  SetStat,
  type RevenueGranularity,
  type RevenueDimension,
  type DashboardStatsDTO,
  type ActivatorsSummaryDTO,
  type DistributorsSummaryDTO,
  type InventorySummaryDTO,
  type OrdersSummaryDTO,
  type ActivationsSummaryDTO,
  type StatisticsOverviewDTO,
  type WilayaHeatmapDTO,
  type WilayaDrilldownDTO,
  type RevenueSummaryDTO,
  type RevenueSeriesDTO,
  type RevenueBreakdownDTO,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';

type DecimalLike = { toFixed(n: number): string };

export type RawDashboard = {
  activationsToday: number;
  totalRevenue: DecimalLike;
  pendingActivations: number;
  activeActivators: number;
};

export type RawActivatorsSummary = {
  totalActivators: number;
  onlineNow: number;
  totalSuccessful: number;
  totalCreditsOwed: DecimalLike;
};

export type RawDistributorsSummary = {
  totalDistributors: number;
  activeWithStock: number;
  totalCardsInStock: number;
  activationsThisMonth: number;
};

export type RawInventorySummary = {
  sets: { stat: string; count: number }[];
  lots: { stat: string; count: number }[];
  cards: { stat: string; count: number }[];
  cardFlags: { disabled: number; revoked: number };
};

export type RawOrdersSummary = {
  totalOrders: { all: number; month: number; week: number };
  byState: { state: string; count: number }[];
  pendingDelivery: number;
  inDelivery: number;
  totalRevenue: DecimalLike;
};

export type RawActivationsSummary = {
  total: { all: number; today: number; week: number; month: number };
  byState: { state: string; count: number }[];
  avgDurationSeconds: number | null;
  totalRevenue: DecimalLike;
};

export type RawOverview = {
  activationsOverTime: { date: Date; count: number }[];
  activationsByState: { state: string; count: number }[];
  topActivators: { activatorId: string; fullName: string; count: number; earned: DecimalLike }[];
  topDistributors: { distributorId: string; storeName: string; count: number }[];
  avgTimeTrend: { date: Date; avgSeconds: number }[];
  revenueOverTime: { date: Date; revenue: DecimalLike }[];
};

export type RawWilayaHeatmapRow = {
  wilayaId: string;
  wilayaName: string;
  wilayaCode: string;
  distributorsCount: number;
  activationsCount: number;
  cancellationsCount: number;
  avgActivationTimeSeconds: number | null;
};

export type RawWilayaDrilldown = {
  wilayaId: string;
  wilayaName: string;
  topDistributors: { distributorId: string; storeName: string; activationsCount: number }[];
  activationsByPlan: {
    subscriptionPlanId: string;
    plan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>;
    count: number;
  }[];
  activationsOverTime: { date: Date; count: number }[];
};

export type RawRevenueTotals = { cashIn: DecimalLike; cashOut: DecimalLike; net: DecimalLike };

export type RawRevenueSummary = {
  from: Date;
  to: Date;
  current: RawRevenueTotals;
  previous: RawRevenueTotals;
  cashOutSplit: { activationCost: DecimalLike; activationPrice: DecimalLike };
  deliveredOrders: number;
  completedActivations: number;
};

export type RawRevenueSeries = {
  granularity: RevenueGranularity;
  points: { bucketStart: Date; cashIn: DecimalLike; cashOut: DecimalLike; net: DecimalLike }[];
};

export type RawRevenueBreakdown = {
  dimension: RevenueDimension;
  rows: { key: string; label: string; cashIn: DecimalLike; cashOut: DecimalLike; net: DecimalLike }[];
  others: RawRevenueTotals;
  totals: RawRevenueTotals;
};

export class StatisticsMapper {
  static toDashboardDTO(raw: RawDashboard): DashboardStatsDTO {
    return DashboardStatsResponseSchema.parse({
      activationsToday: raw.activationsToday,
      totalRevenue: Number(raw.totalRevenue.toFixed(2)),
      pendingActivations: raw.pendingActivations,
      activeActivators: raw.activeActivators,
    });
  }

  static toActivatorsSummaryDTO(raw: RawActivatorsSummary): ActivatorsSummaryDTO {
    return ActivatorsSummaryResponseSchema.parse({
      totalActivators: raw.totalActivators,
      onlineNow: raw.onlineNow,
      totalSuccessful: raw.totalSuccessful,
      totalCreditsOwed: Number(raw.totalCreditsOwed.toFixed(2)),
    });
  }

  static toDistributorsSummaryDTO(raw: RawDistributorsSummary): DistributorsSummaryDTO {
    return DistributorsSummaryResponseSchema.parse(raw);
  }

  static toInventorySummaryDTO(raw: RawInventorySummary): InventorySummaryDTO {
    return InventorySummaryResponseSchema.parse({
      sets: raw.sets.filter((g) => g.count > 0).map((g) => ({ stat: g.stat as SetStat, count: g.count })),
      lots: raw.lots.filter((g) => g.count > 0).map((g) => ({ stat: g.stat as LotStat, count: g.count })),
      cards: raw.cards.filter((g) => g.count > 0).map((g) => ({ stat: g.stat as CardStat, count: g.count })),
      cardFlags: raw.cardFlags,
    });
  }

  static toOrdersSummaryDTO(raw: RawOrdersSummary): OrdersSummaryDTO {
    return OrdersSummaryResponseSchema.parse({
      totalOrders: raw.totalOrders,
      byState: raw.byState.filter((g) => g.count > 0).map((g) => ({ state: g.state as OrderStat, count: g.count })),
      pendingDelivery: raw.pendingDelivery,
      inDelivery: raw.inDelivery,
      totalRevenue: Number(raw.totalRevenue.toFixed(2)),
    });
  }

  static toActivationsSummaryDTO(raw: RawActivationsSummary): ActivationsSummaryDTO {
    return ActivationsSummaryResponseSchema.parse({
      total: raw.total,
      byState: raw.byState.filter((g) => g.count > 0).map((g) => ({ state: g.state as ActivationStat, count: g.count })),
      avgDurationSeconds: raw.avgDurationSeconds,
      totalRevenue: Number(raw.totalRevenue.toFixed(2)),
    });
  }

  static toOverviewDTO(raw: RawOverview): StatisticsOverviewDTO {
    return StatisticsOverviewResponseSchema.parse({
      activationsOverTime: raw.activationsOverTime.map((r) => ({ date: r.date.toISOString(), count: r.count })),
      activationsByState: raw.activationsByState
        .filter((g) => g.count > 0)
        .map((g) => ({ state: g.state as ActivationStat, count: g.count })),
      topActivators: raw.topActivators.map((a) => ({
        activatorId: a.activatorId,
        fullName: a.fullName,
        count: a.count,
        earned: Number(a.earned.toFixed(2)),
      })),
      topDistributors: raw.topDistributors.map((d) => ({
        distributorId: d.distributorId,
        storeName: d.storeName,
        count: d.count,
      })),
      avgTimeTrend: raw.avgTimeTrend.map((r) => ({ date: r.date.toISOString(), avgSeconds: r.avgSeconds })),
      revenueOverTime: raw.revenueOverTime.map((r) => ({
        date: r.date.toISOString(),
        revenue: Number(r.revenue.toFixed(2)),
      })),
    });
  }

  static toWilayaHeatmapDTO(raw: RawWilayaHeatmapRow[]): WilayaHeatmapDTO {
    return WilayaHeatmapResponseSchema.parse(
      raw.map((r) => ({
        wilayaId: r.wilayaId,
        wilayaName: r.wilayaName,
        wilayaCode: r.wilayaCode,
        distributorsCount: r.distributorsCount,
        activationsCount: r.activationsCount,
        cancellationsCount: r.cancellationsCount,
        avgActivationTimeSeconds: r.avgActivationTimeSeconds,
      })),
    );
  }

  static toWilayaDrilldownDTO(raw: RawWilayaDrilldown): WilayaDrilldownDTO {
    return WilayaDrilldownResponseSchema.parse({
      wilayaId: raw.wilayaId,
      wilayaName: raw.wilayaName,
      topDistributors: raw.topDistributors,
      activationsByPlan: raw.activationsByPlan.map((g) => ({
        subscriptionPlanId: g.subscriptionPlanId,
        subscriptionLabel: composeSubscriptionLabel(g.plan),
        count: g.count,
      })),
      activationsOverTime: raw.activationsOverTime.map((r) => ({
        date: r.date.toISOString(),
        count: r.count,
      })),
    });
  }

  static toRevenueTotalsDTO(raw: RawRevenueTotals) {
    return {
      cashIn: Number(raw.cashIn.toFixed(2)),
      cashOut: Number(raw.cashOut.toFixed(2)),
      net: Number(raw.net.toFixed(2)),
    };
  }

  static toRevenueSummaryDTO(raw: RawRevenueSummary): RevenueSummaryDTO {
    return RevenueSummaryResponseSchema.parse({
      range: { from: raw.from.toISOString(), to: raw.to.toISOString() },
      current: StatisticsMapper.toRevenueTotalsDTO(raw.current),
      previous: StatisticsMapper.toRevenueTotalsDTO(raw.previous),
      cashOutSplit: {
        activationCost: Number(raw.cashOutSplit.activationCost.toFixed(2)),
        activationPrice: Number(raw.cashOutSplit.activationPrice.toFixed(2)),
      },
      deliveredOrders: raw.deliveredOrders,
      completedActivations: raw.completedActivations,
    });
  }

  static toRevenueSeriesDTO(raw: RawRevenueSeries): RevenueSeriesDTO {
    return RevenueSeriesResponseSchema.parse({
      granularity: raw.granularity,
      points: raw.points.map((p) => ({
        bucketStart: p.bucketStart.toISOString(),
        cashIn: Number(p.cashIn.toFixed(2)),
        cashOut: Number(p.cashOut.toFixed(2)),
        net: Number(p.net.toFixed(2)),
      })),
    });
  }

  static toRevenueBreakdownDTO(raw: RawRevenueBreakdown): RevenueBreakdownDTO {
    return RevenueBreakdownResponseSchema.parse({
      dimension: raw.dimension,
      rows: raw.rows.map((r) => ({
        key: r.key,
        label: r.label,
        cashIn: Number(r.cashIn.toFixed(2)),
        cashOut: Number(r.cashOut.toFixed(2)),
        net: Number(r.net.toFixed(2)),
      })),
      others: StatisticsMapper.toRevenueTotalsDTO(raw.others),
      totals: StatisticsMapper.toRevenueTotalsDTO(raw.totals),
    });
  }
}
