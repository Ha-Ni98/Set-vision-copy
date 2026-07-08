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
  ActivationStat,
  CardStat,
  LotStat,
  OrderStat,
  SetStat,
  type DashboardStatsDTO,
  type ActivatorsSummaryDTO,
  type DistributorsSummaryDTO,
  type InventorySummaryDTO,
  type OrdersSummaryDTO,
  type ActivationsSummaryDTO,
  type StatisticsOverviewDTO,
  type WilayaHeatmapDTO,
  type WilayaDrilldownDTO,
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
}
