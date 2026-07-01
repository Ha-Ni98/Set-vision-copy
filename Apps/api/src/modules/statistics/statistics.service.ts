import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { IStatisticsService } from './statistics.interface';
import { StatisticsMapper } from './statistics.mapper';
import { todayStart, weekStart, monthStart } from './statistics.time';
import {
  ActivationStat,
  CardStat,
  OrderStat,
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
} from '@my-app/contract';

const COMPLETED_STATS = [ActivationStat.ACTIVATED, ActivationStat.ACTIVATED_BY_ADMIN];

const ZERO_DECIMAL = new Decimal(0);

function avgSeconds(rows: { takenAt: Date | null; completedAt: Date | null }[]): number | null {
  const valid = rows.filter((r) => r.takenAt && r.completedAt);
  if (valid.length === 0) return null;
  const total = valid.reduce(
    (sum, r) => sum + (r.completedAt!.getTime() - r.takenAt!.getTime()),
    0,
  );
  return total / valid.length / 1000;
}

export class StatisticsService implements IStatisticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async dashboard(): Promise<DashboardStatsDTO> {
    const today = todayStart();

    const [activationsToday, revenueAgg, pendingActivations, activeActivators] = await Promise.all([
      this.prisma.activation.count({
        where: { activationStat: { in: COMPLETED_STATS }, completedAt: { gte: today } },
      }),
      this.prisma.activation.aggregate({
        where: { activationStat: { in: COMPLETED_STATS } },
        _sum: { activationPrice: true },
      }),
      this.prisma.activation.count({
        where: { activationStat: ActivationStat.PENDING },
      }),
      this.prisma.activator.count({
        where: { user: { isEnabled: true, deletedAt: null } },
      }),
    ]);

    return StatisticsMapper.toDashboardDTO({
      activationsToday,
      totalRevenue: revenueAgg._sum.activationPrice ?? ZERO_DECIMAL,
      pendingActivations,
      activeActivators,
    });
  }

  async activatorsSummary(): Promise<ActivatorsSummaryDTO> {
    const [totalActivators, onlineNow, agg] = await Promise.all([
      this.prisma.activator.count({ where: { user: { deletedAt: null } } }),
      this.prisma.activator.count({ where: { user: { isEnabled: true, deletedAt: null } } }),
      this.prisma.activator.aggregate({
        where: { user: { deletedAt: null } },
        _sum: { nbOfSuccessfulActivation: true, credits: true },
      }),
    ]);

    return StatisticsMapper.toActivatorsSummaryDTO({
      totalActivators,
      onlineNow,
      totalSuccessful: agg._sum.nbOfSuccessfulActivation ?? 0,
      totalCreditsOwed: agg._sum.credits ?? ZERO_DECIMAL,
    });
  }

  async distributorsSummary(): Promise<DistributorsSummaryDTO> {
    const thisMonth = monthStart();

    const [totalDistributors, activeWithStock, stockAgg, activationsThisMonth] = await Promise.all([
      this.prisma.distributor.count({ where: { deletedAt: null } }),
      this.prisma.distributor.count({ where: { deletedAt: null, nbOfActiveCards: { gt: 0 } } }),
      this.prisma.distributor.aggregate({
        where: { deletedAt: null },
        _sum: { nbOfActiveCards: true },
      }),
      this.prisma.activation.count({
        where: {
          activationStat: { in: COMPLETED_STATS },
          completedAt: { gte: thisMonth },
          card: { distributorId: { not: null } },
        },
      }),
    ]);

    return StatisticsMapper.toDistributorsSummaryDTO({
      totalDistributors,
      activeWithStock,
      totalCardsInStock: stockAgg._sum.nbOfActiveCards ?? 0,
      activationsThisMonth,
    });
  }

  async inventorySummary(): Promise<InventorySummaryDTO> {
    const [setGroups, lotGroups, cardGroups, disabledCards, revokedCards] = await Promise.all([
      this.prisma.set.groupBy({ by: ['setStat'], _count: { _all: true } }),
      this.prisma.lot.groupBy({ by: ['lotStat'], _count: { _all: true } }),
      this.prisma.card.groupBy({ by: ['cardStat'], _count: { _all: true } }),
      this.prisma.card.count({ where: { isDisabled: true } }),
      this.prisma.card.count({ where: { isRevoked: true } }),
    ]);

    return StatisticsMapper.toInventorySummaryDTO({
      sets: setGroups.map((g) => ({ stat: g.setStat, count: g._count._all })),
      lots: lotGroups.map((g) => ({ stat: g.lotStat, count: g._count._all })),
      cards: cardGroups.map((g) => ({ stat: g.cardStat, count: g._count._all })),
      cardFlags: { disabled: disabledCards, revoked: revokedCards },
    });
  }

  async ordersSummary(): Promise<OrdersSummaryDTO> {
    const thisMonth = monthStart();
    const thisWeek = weekStart();

    const [allOrders, monthOrders, weekOrders, byState, pendingDelivery, inDelivery, revenueAgg] =
      await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { createdAt: { gte: thisMonth } } }),
        this.prisma.order.count({ where: { createdAt: { gte: thisWeek } } }),
        this.prisma.order.groupBy({ by: ['orderStat'], _count: { _all: true } }),
        this.prisma.order.count({ where: { orderStat: OrderStat.PENDING_DELIVERY } }),
        this.prisma.order.count({ where: { orderStat: OrderStat.IN_DELIVERY } }),
        this.prisma.order.aggregate({ _sum: { orderPrice: true } }),
      ]);

    return StatisticsMapper.toOrdersSummaryDTO({
      totalOrders: { all: allOrders, month: monthOrders, week: weekOrders },
      byState: byState.map((g) => ({ state: g.orderStat, count: g._count._all })),
      pendingDelivery,
      inDelivery,
      totalRevenue: revenueAgg._sum.orderPrice ?? ZERO_DECIMAL,
    });
  }

  async activationsSummary(): Promise<ActivationsSummaryDTO> {
    const today = todayStart();
    const thisWeek = weekStart();
    const thisMonth = monthStart();
    const completedWhere = { activationStat: { in: COMPLETED_STATS } };

    const [allActivations, todayCount, weekCount, monthCount, byState, revenueAgg, durationRows] =
      await Promise.all([
        this.prisma.activation.count(),
        this.prisma.activation.count({
          where: { ...completedWhere, completedAt: { gte: today } },
        }),
        this.prisma.activation.count({
          where: { ...completedWhere, completedAt: { gte: thisWeek } },
        }),
        this.prisma.activation.count({
          where: { ...completedWhere, completedAt: { gte: thisMonth } },
        }),
        this.prisma.activation.groupBy({ by: ['activationStat'], _count: { _all: true } }),
        this.prisma.activation.aggregate({
          where: completedWhere,
          _sum: { activationPrice: true },
        }),
        this.prisma.activation.findMany({
          where: {
            activationStat: { in: COMPLETED_STATS },
            takenAt: { not: null },
            completedAt: { not: null },
          },
          select: { takenAt: true, completedAt: true },
        }),
      ]);

    return StatisticsMapper.toActivationsSummaryDTO({
      total: { all: allActivations, today: todayCount, week: weekCount, month: monthCount },
      byState: byState.map((g) => ({ state: g.activationStat, count: g._count._all })),
      avgDurationSeconds: avgSeconds(durationRows),
      totalRevenue: revenueAgg._sum.activationPrice ?? ZERO_DECIMAL,
    });
  }

  // Sprint 15 — overview / heatmap / drilldown
  overview(_query: StatisticsOverviewQuery): Promise<StatisticsOverviewDTO> {
    throw new Error('not implemented');
  }

  wilayaHeatmap(_query: WilayaHeatmapQuery): Promise<WilayaHeatmapDTO> {
    throw new Error('not implemented');
  }

  wilayaDrilldown(_wilayaId: string, _query: WilayaDrilldownQuery): Promise<WilayaDrilldownDTO> {
    throw new Error('not implemented');
  }
}
