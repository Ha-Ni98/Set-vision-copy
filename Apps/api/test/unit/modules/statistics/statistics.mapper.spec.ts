import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { StatisticsMapper } from '../../../../src/modules/statistics/statistics.mapper';
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
  OrderStat,
  SetStat,
  LotStat,
  CardStat,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';

const WILAYA_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const ACTIVATOR_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const DISTRIBUTOR_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PLAN_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// ─── toDashboardDTO ───────────────────────────────────────────────────────────

describe('StatisticsMapper.toDashboardDTO', () => {
  const raw = {
    activationsToday: 5,
    totalRevenue: new Decimal('1234.50'),
    pendingActivations: 2,
    activeActivators: 10,
  };

  it('parses DashboardStatsResponseSchema', () => {
    const dto = StatisticsMapper.toDashboardDTO(raw);
    expect(() => DashboardStatsResponseSchema.parse(dto)).not.toThrow();
  });

  it('converts totalRevenue Decimal → number 2dp', () => {
    const dto = StatisticsMapper.toDashboardDTO(raw);
    expect(dto.totalRevenue).toBe(1234.5);
  });

  it('passes counts through as integers', () => {
    const dto = StatisticsMapper.toDashboardDTO(raw);
    expect(dto.activationsToday).toBe(5);
    expect(dto.pendingActivations).toBe(2);
    expect(dto.activeActivators).toBe(10);
  });
});

// ─── toActivatorsSummaryDTO ───────────────────────────────────────────────────

describe('StatisticsMapper.toActivatorsSummaryDTO', () => {
  const raw = {
    totalActivators: 20,
    onlineNow: 8,
    totalSuccessful: 150,
    totalCreditsOwed: new Decimal('4500.75'),
  };

  it('parses ActivatorsSummaryResponseSchema', () => {
    const dto = StatisticsMapper.toActivatorsSummaryDTO(raw);
    expect(() => ActivatorsSummaryResponseSchema.parse(dto)).not.toThrow();
  });

  it('converts totalCreditsOwed Decimal → number 2dp', () => {
    const dto = StatisticsMapper.toActivatorsSummaryDTO(raw);
    expect(dto.totalCreditsOwed).toBe(4500.75);
  });
});

// ─── toDistributorsSummaryDTO ─────────────────────────────────────────────────

describe('StatisticsMapper.toDistributorsSummaryDTO', () => {
  const raw = {
    totalDistributors: 30,
    activeWithStock: 12,
    totalCardsInStock: 500,
    activationsThisMonth: 80,
  };

  it('parses DistributorsSummaryResponseSchema', () => {
    const dto = StatisticsMapper.toDistributorsSummaryDTO(raw);
    expect(() => DistributorsSummaryResponseSchema.parse(dto)).not.toThrow();
  });
});

// ─── toInventorySummaryDTO ────────────────────────────────────────────────────

describe('StatisticsMapper.toInventorySummaryDTO', () => {
  it('parses InventorySummaryResponseSchema', () => {
    const raw = {
      sets: [{ stat: SetStat.NOT_PRINTED, count: 10 }],
      lots: [{ stat: LotStat.PENDING, count: 5 }],
      cards: [{ stat: CardStat.AT_DISTRIBUTOR, count: 200 }],
      cardFlags: { disabled: 3, revoked: 1 },
    };
    const dto = StatisticsMapper.toInventorySummaryDTO(raw);
    expect(() => InventorySummaryResponseSchema.parse(dto)).not.toThrow();
  });

  it('omits zero-count groups from sets, lots, and cards', () => {
    const raw = {
      sets: [
        { stat: SetStat.NOT_PRINTED, count: 0 },
        { stat: SetStat.PRINTED, count: 5 },
      ],
      lots: [
        { stat: LotStat.PENDING, count: 0 },
        { stat: LotStat.DELIVERED, count: 3 },
      ],
      cards: [
        { stat: CardStat.IN_SET, count: 0 },
        { stat: CardStat.AT_DISTRIBUTOR, count: 10 },
      ],
      cardFlags: { disabled: 0, revoked: 0 },
    };
    const dto = StatisticsMapper.toInventorySummaryDTO(raw);
    expect(dto.sets).toHaveLength(1);
    expect(dto.sets[0]!.stat).toBe(SetStat.PRINTED);
    expect(dto.lots).toHaveLength(1);
    expect(dto.cards).toHaveLength(1);
  });

  it('returns empty arrays when all counts are zero', () => {
    const raw = {
      sets: [{ stat: SetStat.NOT_PRINTED, count: 0 }],
      lots: [],
      cards: [{ stat: CardStat.IN_SET, count: 0 }],
      cardFlags: { disabled: 0, revoked: 0 },
    };
    const dto = StatisticsMapper.toInventorySummaryDTO(raw);
    expect(dto.sets).toHaveLength(0);
    expect(dto.cards).toHaveLength(0);
  });
});

// ─── toOrdersSummaryDTO ───────────────────────────────────────────────────────

describe('StatisticsMapper.toOrdersSummaryDTO', () => {
  const raw = {
    totalOrders: { all: 100, month: 30, week: 8 },
    byState: [
      { state: OrderStat.PENDING_DELIVERY, count: 10 },
      { state: OrderStat.DELIVERED, count: 0 },
    ],
    pendingDelivery: 10,
    inDelivery: 5,
    totalRevenue: new Decimal('9999.99'),
  };

  it('parses OrdersSummaryResponseSchema', () => {
    const dto = StatisticsMapper.toOrdersSummaryDTO(raw);
    expect(() => OrdersSummaryResponseSchema.parse(dto)).not.toThrow();
  });

  it('omits zero-count byState entries', () => {
    const dto = StatisticsMapper.toOrdersSummaryDTO(raw);
    expect(dto.byState).toHaveLength(1);
    expect(dto.byState[0]!.state).toBe(OrderStat.PENDING_DELIVERY);
  });

  it('converts totalRevenue Decimal → number 2dp', () => {
    const dto = StatisticsMapper.toOrdersSummaryDTO(raw);
    expect(dto.totalRevenue).toBe(9999.99);
  });
});

// ─── toActivationsSummaryDTO ──────────────────────────────────────────────────

describe('StatisticsMapper.toActivationsSummaryDTO', () => {
  const raw = {
    total: { all: 200, today: 5, week: 20, month: 60 },
    byState: [
      { state: ActivationStat.ACTIVATED, count: 180 },
      { state: ActivationStat.PENDING, count: 0 },
    ],
    avgDurationSeconds: 300.5,
    totalRevenue: new Decimal('50000.00'),
  };

  it('parses ActivationsSummaryResponseSchema', () => {
    const dto = StatisticsMapper.toActivationsSummaryDTO(raw);
    expect(() => ActivationsSummaryResponseSchema.parse(dto)).not.toThrow();
  });

  it('omits zero-count byState entries', () => {
    const dto = StatisticsMapper.toActivationsSummaryDTO(raw);
    expect(dto.byState).toHaveLength(1);
    expect(dto.byState[0]!.state).toBe(ActivationStat.ACTIVATED);
  });

  it('passes avgDurationSeconds as null when null', () => {
    const dto = StatisticsMapper.toActivationsSummaryDTO({ ...raw, avgDurationSeconds: null });
    expect(dto.avgDurationSeconds).toBeNull();
  });

  it('converts totalRevenue Decimal → number 2dp', () => {
    const dto = StatisticsMapper.toActivationsSummaryDTO(raw);
    expect(dto.totalRevenue).toBe(50000.0);
  });
});

// ─── toOverviewDTO ────────────────────────────────────────────────────────────

describe('StatisticsMapper.toOverviewDTO', () => {
  const date1 = new Date('2026-03-01T00:00:00.000Z');
  const raw = {
    activationsOverTime: [{ date: date1, count: 10 }],
    activationsByState: [
      { state: ActivationStat.ACTIVATED, count: 10 },
      { state: ActivationStat.PENDING, count: 0 },
    ],
    topActivators: [{ activatorId: ACTIVATOR_ID, fullName: 'Alice', count: 5, earned: new Decimal('100.25') }],
    topDistributors: [{ distributorId: DISTRIBUTOR_ID, storeName: 'Store A', count: 3 }],
    avgTimeTrend: [{ date: date1, avgSeconds: 180.0 }],
    revenueOverTime: [{ date: date1, revenue: new Decimal('500.00') }],
  };

  it('parses StatisticsOverviewResponseSchema', () => {
    const dto = StatisticsMapper.toOverviewDTO(raw);
    expect(() => StatisticsOverviewResponseSchema.parse(dto)).not.toThrow();
  });

  it('converts dates to ISO strings', () => {
    const dto = StatisticsMapper.toOverviewDTO(raw);
    expect(dto.activationsOverTime[0]!.date).toBe(date1.toISOString());
    expect(dto.avgTimeTrend[0]!.date).toBe(date1.toISOString());
    expect(dto.revenueOverTime[0]!.date).toBe(date1.toISOString());
  });

  it('omits zero-count activationsByState entries', () => {
    const dto = StatisticsMapper.toOverviewDTO(raw);
    expect(dto.activationsByState).toHaveLength(1);
    expect(dto.activationsByState[0]!.state).toBe(ActivationStat.ACTIVATED);
  });

  it('converts earned Decimal → number 2dp', () => {
    const dto = StatisticsMapper.toOverviewDTO(raw);
    expect(dto.topActivators[0]!.earned).toBe(100.25);
  });

  it('converts revenueOverTime Decimal → number 2dp', () => {
    const dto = StatisticsMapper.toOverviewDTO(raw);
    expect(dto.revenueOverTime[0]!.revenue).toBe(500.0);
  });
});

// ─── toWilayaHeatmapDTO ───────────────────────────────────────────────────────

describe('StatisticsMapper.toWilayaHeatmapDTO', () => {
  const raw = [
    {
      wilayaId: WILAYA_ID,
      wilayaName: 'Alger',
      distributorsCount: 5,
      activationsCount: 100,
      cancellationsCount: 3,
      avgActivationTimeSeconds: 250.0,
    },
  ];

  it('parses WilayaHeatmapResponseSchema', () => {
    const dto = StatisticsMapper.toWilayaHeatmapDTO(raw);
    expect(() => WilayaHeatmapResponseSchema.parse(dto)).not.toThrow();
  });

  it('passes avgActivationTimeSeconds as null when null', () => {
    const dto = StatisticsMapper.toWilayaHeatmapDTO([{ ...raw[0]!, avgActivationTimeSeconds: null }]);
    expect(dto[0]!.avgActivationTimeSeconds).toBeNull();
  });

  it('handles all 58 wilayas (empty zeroed rows)', () => {
    const rows = Array.from({ length: 58 }, (_, i) => ({
      wilayaId: `${WILAYA_ID.slice(0, -2)}${String(i).padStart(2, '0')}`,
      wilayaName: `Wilaya ${i + 1}`,
      distributorsCount: 0,
      activationsCount: 0,
      cancellationsCount: 0,
      avgActivationTimeSeconds: null,
    }));
    const dto = StatisticsMapper.toWilayaHeatmapDTO(rows);
    expect(dto).toHaveLength(58);
  });
});

// ─── toWilayaDrilldownDTO ─────────────────────────────────────────────────────

describe('StatisticsMapper.toWilayaDrilldownDTO', () => {
  const date1 = new Date('2026-03-01T00:00:00.000Z');
  const raw = {
    wilayaId: WILAYA_ID,
    wilayaName: 'Alger',
    topDistributors: [{ distributorId: DISTRIBUTOR_ID, storeName: 'Best Store', activationsCount: 20 }],
    activationsByPlan: [
      {
        subscriptionPlanId: PLAN_ID,
        plan: { subscriptionType: SubscriptionType.SNAPCHAT_PLUS, subscriptionDuration: SubscriptionDuration.ONE_MONTH },
        count: 15,
      },
    ],
    activationsOverTime: [{ date: date1, count: 10 }],
  };

  it('parses WilayaDrilldownResponseSchema', () => {
    const dto = StatisticsMapper.toWilayaDrilldownDTO(raw);
    expect(() => WilayaDrilldownResponseSchema.parse(dto)).not.toThrow();
  });

  it('composes subscriptionLabel from plan type and duration', () => {
    const dto = StatisticsMapper.toWilayaDrilldownDTO(raw);
    expect(dto.activationsByPlan[0]!.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
  });

  it('converts activationsOverTime dates to ISO strings', () => {
    const dto = StatisticsMapper.toWilayaDrilldownDTO(raw);
    expect(dto.activationsOverTime[0]!.date).toBe(date1.toISOString());
  });
});
