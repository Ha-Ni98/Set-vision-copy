import type { PrismaClient, SubscriptionPlan } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { IStatisticsService } from './statistics.interface';
import { StatisticsMapper } from './statistics.mapper';
import { todayStart, weekStart, monthStart, resolvePeriod, bucketDate } from './statistics.time';
import { NotFoundError } from '@common/errors';
import {
  ActivationStat,
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

const CANCELLED_STATS = [
  ActivationStat.CANCELLED_BY_ACTIVATOR,
  ActivationStat.REMOVED_FROM_ACTIVATOR,
  ActivationStat.CANCELLED_BY_ADMIN,
];

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

  async overview(query: StatisticsOverviewQuery): Promise<StatisticsOverviewDTO> {
    const { from, to, bucket } = resolvePeriod(query.period, query.dateFrom, query.dateTo);

    const cardFilter: Record<string, unknown> = {};
    if (query.subscriptionPlanId) cardFilter.subscriptionPlanId = query.subscriptionPlanId;
    if (query.wilayaId) cardFilter.distributor = { wilayaId: query.wilayaId };
    const hasCardFilter = Object.keys(cardFilter).length > 0;

    const completedBaseWhere = {
      activationStat: { in: COMPLETED_STATS },
      completedAt: { gte: from, lte: to },
      ...(hasCardFilter && { card: cardFilter }),
    };

    const [stateGroups, completedActivations] = await Promise.all([
      this.prisma.activation.groupBy({
        by: ['activationStat'],
        where: {
          requestedAt: { gte: from, lte: to },
          ...(hasCardFilter && { card: cardFilter }),
        },
        _count: { _all: true },
      }),
      this.prisma.activation.findMany({
        where: completedBaseWhere,
        select: {
          completedAt: true,
          takenAt: true,
          activationPrice: true,
          activatorId: true,
          activator: { select: { fullName: true } },
          card: {
            select: {
              distributorId: true,
              distributor: { select: { storeName: true } },
            },
          },
        },
      }),
    ]);

    // Build series from completed activations
    const overTimeMap = new Map<string, number>();
    const revenueMap = new Map<string, number>();
    const avgTrendMap = new Map<string, { total: number; count: number }>();
    const activatorMap = new Map<string, { fullName: string; count: number; earned: number }>();
    const distributorMap = new Map<string, { storeName: string; count: number }>();

    for (const act of completedActivations) {
      if (!act.completedAt) continue;
      const key = bucketDate(act.completedAt, bucket).toISOString();

      // activationsOverTime
      overTimeMap.set(key, (overTimeMap.get(key) ?? 0) + 1);

      // revenueOverTime
      const price = act.activationPrice ? Number(act.activationPrice.toFixed(2)) : 0;
      revenueMap.set(key, (revenueMap.get(key) ?? 0) + price);

      // avgTimeTrend
      if (act.takenAt) {
        const secs = (act.completedAt.getTime() - act.takenAt.getTime()) / 1000;
        const trend = avgTrendMap.get(key) ?? { total: 0, count: 0 };
        trend.total += secs;
        trend.count++;
        avgTrendMap.set(key, trend);
      }

      // topActivators
      if (act.activatorId && act.activator) {
        const a = activatorMap.get(act.activatorId) ?? { fullName: act.activator.fullName, count: 0, earned: 0 };
        a.count++;
        a.earned += price;
        activatorMap.set(act.activatorId, a);
      }

      // topDistributors
      if (act.card.distributorId && act.card.distributor) {
        const d = distributorMap.get(act.card.distributorId) ?? { storeName: act.card.distributor.storeName, count: 0 };
        d.count++;
        distributorMap.set(act.card.distributorId, d);
      }
    }

    const sortedKeys = (m: Map<string, unknown>) =>
      Array.from(m.keys()).sort((a, b) => a.localeCompare(b));

    const activationsOverTime = sortedKeys(overTimeMap).map((k) => ({
      date: new Date(k),
      count: overTimeMap.get(k)!,
    }));

    const revenueOverTime = sortedKeys(revenueMap).map((k) => ({
      date: new Date(k),
      revenue: { toFixed: (n: number) => revenueMap.get(k)!.toFixed(n) },
    }));

    const avgTimeTrend = sortedKeys(avgTrendMap).map((k) => {
      const { total, count } = avgTrendMap.get(k)!;
      return { date: new Date(k), avgSeconds: total / count };
    });

    const topActivators = Array.from(activatorMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([activatorId, { fullName, count, earned }]) => ({
        activatorId,
        fullName,
        count,
        earned: { toFixed: (n: number) => earned.toFixed(n) },
      }));

    const topDistributors = Array.from(distributorMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([distributorId, { storeName, count }]) => ({ distributorId, storeName, count }));

    return StatisticsMapper.toOverviewDTO({
      activationsOverTime,
      activationsByState: stateGroups.map((g) => ({ state: g.activationStat, count: g._count._all })),
      topActivators,
      topDistributors,
      avgTimeTrend,
      revenueOverTime,
    });
  }

  async wilayaHeatmap(query: WilayaHeatmapQuery): Promise<WilayaHeatmapDTO> {
    const bounds = query.period ? resolvePeriod(query.period) : null;

    const [wilayas, distributorGroups, completedActs, cancelledActs] = await Promise.all([
      this.prisma.wilaya.findMany({ orderBy: { wilayaCode: 'asc' } }),
      this.prisma.distributor.groupBy({
        by: ['wilayaId'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.activation.findMany({
        where: {
          activationStat: { in: COMPLETED_STATS },
          ...(bounds && { completedAt: { gte: bounds.from, lte: bounds.to } }),
          ...(query.subscriptionPlanId && { card: { subscriptionPlanId: query.subscriptionPlanId } }),
          card: { distributorId: { not: null } },
        },
        select: {
          takenAt: true,
          completedAt: true,
          card: { select: { distributor: { select: { wilayaId: true } } } },
        },
      }),
      this.prisma.activation.findMany({
        where: {
          activationStat: { in: CANCELLED_STATS },
          ...(bounds && { requestedAt: { gte: bounds.from, lte: bounds.to } }),
          ...(query.subscriptionPlanId && { card: { subscriptionPlanId: query.subscriptionPlanId } }),
          card: { distributorId: { not: null } },
        },
        select: {
          card: { select: { distributor: { select: { wilayaId: true } } } },
        },
      }),
    ]);

    type WilayaAgg = { distributorsCount: number; activationsCount: number; cancellationsCount: number; durations: number[] };
    const statsMap = new Map<string, WilayaAgg>();
    for (const w of wilayas) {
      statsMap.set(w.id, { distributorsCount: 0, activationsCount: 0, cancellationsCount: 0, durations: [] });
    }

    for (const g of distributorGroups) {
      const s = statsMap.get(g.wilayaId);
      if (s) s.distributorsCount = g._count._all;
    }

    for (const act of completedActs) {
      const wid = act.card.distributor?.wilayaId;
      if (!wid) continue;
      const s = statsMap.get(wid);
      if (!s) continue;
      s.activationsCount++;
      if (act.takenAt && act.completedAt) {
        s.durations.push((act.completedAt.getTime() - act.takenAt.getTime()) / 1000);
      }
    }

    for (const act of cancelledActs) {
      const wid = act.card.distributor?.wilayaId;
      if (!wid) continue;
      const s = statsMap.get(wid);
      if (s) s.cancellationsCount++;
    }

    const raw = wilayas.map((w) => {
      const s = statsMap.get(w.id)!;
      const avg = s.durations.length > 0 ? s.durations.reduce((a, b) => a + b, 0) / s.durations.length : null;
      return {
        wilayaId: w.id,
        wilayaName: w.frName,
        distributorsCount: s.distributorsCount,
        activationsCount: s.activationsCount,
        cancellationsCount: s.cancellationsCount,
        avgActivationTimeSeconds: avg,
      };
    });

    return StatisticsMapper.toWilayaHeatmapDTO(raw);
  }

  async wilayaDrilldown(wilayaId: string, query: WilayaDrilldownQuery): Promise<WilayaDrilldownDTO> {
    const wilaya = await this.prisma.wilaya.findUnique({ where: { id: wilayaId } });
    if (!wilaya) throw new NotFoundError('Wilaya not found');

    const bounds = query.period ? resolvePeriod(query.period) : null;
    const bucket = bounds?.bucket ?? 'day';

    const activations = await this.prisma.activation.findMany({
      where: {
        activationStat: { in: COMPLETED_STATS },
        ...(bounds && { completedAt: { gte: bounds.from, lte: bounds.to } }),
        card: { distributor: { wilayaId } },
      },
      select: {
        completedAt: true,
        card: {
          select: {
            distributorId: true,
            distributor: { select: { storeName: true } },
            subscriptionPlanId: true,
            subscriptionPlan: { select: { subscriptionType: true, subscriptionDuration: true } },
          },
        },
      },
    });

    const distMap = new Map<string, { storeName: string; count: number }>();
    const planMap = new Map<string, { plan: { subscriptionType: string; subscriptionDuration: string }; count: number }>();
    const overTimeMap = new Map<string, number>();

    for (const act of activations) {
      if (act.card.distributorId && act.card.distributor) {
        const d = distMap.get(act.card.distributorId) ?? { storeName: act.card.distributor.storeName, count: 0 };
        d.count++;
        distMap.set(act.card.distributorId, d);
      }
      if (act.card.subscriptionPlanId && act.card.subscriptionPlan) {
        const p = planMap.get(act.card.subscriptionPlanId) ?? { plan: act.card.subscriptionPlan, count: 0 };
        p.count++;
        planMap.set(act.card.subscriptionPlanId, p);
      }
      if (act.completedAt) {
        const key = bucketDate(act.completedAt, bucket).toISOString();
        overTimeMap.set(key, (overTimeMap.get(key) ?? 0) + 1);
      }
    }

    const topDistributors = Array.from(distMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([distributorId, { storeName, count }]) => ({ distributorId, storeName, activationsCount: count }));

    const activationsByPlan = Array.from(planMap.entries()).map(([subscriptionPlanId, { plan, count }]) => ({
      subscriptionPlanId,
      plan: plan as Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>,
      count,
    }));

    const activationsOverTime = Array.from(overTimeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, count]) => ({ date: new Date(k), count }));

    return StatisticsMapper.toWilayaDrilldownDTO({
      wilayaId: wilaya.id,
      wilayaName: wilaya.frName,
      topDistributors,
      activationsByPlan,
      activationsOverTime,
    });
  }
}
