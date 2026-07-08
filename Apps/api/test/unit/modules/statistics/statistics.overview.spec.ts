import { describe, it, expect, vi, afterEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { StatisticsService } from '../../../../src/modules/statistics/statistics.service';
import { ErrorCode, ActivationStat, SubscriptionType, SubscriptionDuration } from '@my-app/contract';

afterEach(() => {
  vi.useRealTimers();
});

const WILAYA_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const DIST_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const ACT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PLAN_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function makeWilaya(id = WILAYA_ID) {
  return { id, wilayaCode: '01', frName: 'Alger', arName: 'الجزائر' };
}

function buildPrisma() {
  return {
    wilaya: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    distributor: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    activation: {
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaClient;
}

// ─── overview ─────────────────────────────────────────────────────────────────

describe('StatisticsService.overview', () => {
  it('empty period — all series are empty arrays (no error)', async () => {
    const prisma = buildPrisma();
    const svc = new StatisticsService(prisma);
    const dto = await svc.overview({ period: 'today' });
    expect(dto.activationsOverTime).toHaveLength(0);
    expect(dto.topActivators).toHaveLength(0);
    expect(dto.topDistributors).toHaveLength(0);
    expect(dto.revenueOverTime).toHaveLength(0);
    expect(dto.avgTimeTrend).toHaveLength(0);
  });

  it('activationsByState uses groupBy on requestedAt period', async () => {
    const prisma = buildPrisma();
    (prisma.activation.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { activationStat: ActivationStat.ACTIVATED, _count: { _all: 10 } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.overview({ period: 'this_week' });
    expect(dto.activationsByState).toHaveLength(1);
    expect(dto.activationsByState[0]!.state).toBe(ActivationStat.ACTIVATED);
    expect(dto.activationsByState[0]!.count).toBe(10);
  });

  it('activationsOverTime groups completed activations by day bucket', async () => {
    vi.useFakeTimers({ now: new Date('2026-03-10T14:30:00.000Z').getTime() });
    const prisma = buildPrisma();
    // Two activations on the same Algiers day, one on another day
    const day1 = new Date('2026-03-05T10:00:00.000Z'); // 11:00 Algiers
    const day2 = new Date('2026-03-06T10:00:00.000Z'); // 11:00 Algiers
    (prisma.activation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { completedAt: day1, takenAt: null, activationPrice: null, activatorId: null, activator: null, card: { distributorId: null, distributor: null } },
      { completedAt: day1, takenAt: null, activationPrice: null, activatorId: null, activator: null, card: { distributorId: null, distributor: null } },
      { completedAt: day2, takenAt: null, activationPrice: null, activatorId: null, activator: null, card: { distributorId: null, distributor: null } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.overview({ period: 'this_week' });
    expect(dto.activationsOverTime).toHaveLength(2);
    expect(dto.activationsOverTime[0]!.count).toBe(2);
    expect(dto.activationsOverTime[1]!.count).toBe(1);
  });

  it('topActivators sorted by count desc, max 10', async () => {
    const prisma = buildPrisma();
    const makeActId = (i: number) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, '0')}`;
    // 11 activators, each with 1 activation
    const acts = Array.from({ length: 11 }, (_, i) => ({
      completedAt: new Date('2026-03-01T10:00:00.000Z'),
      takenAt: null,
      activationPrice: null,
      activatorId: makeActId(i),
      activator: { fullName: `Activator ${i}` },
      card: { distributorId: null, distributor: null },
    }));
    // First activator gets 2 counts
    acts.push({
      completedAt: new Date('2026-03-01T10:00:00.000Z'),
      takenAt: null,
      activationPrice: null,
      activatorId: makeActId(0),
      activator: { fullName: 'Activator 0' },
      card: { distributorId: null, distributor: null },
    });
    (prisma.activation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(acts);
    const svc = new StatisticsService(prisma);
    const dto = await svc.overview({ period: 'last_30d' });
    expect(dto.topActivators).toHaveLength(10);
    expect(dto.topActivators[0]!.count).toBe(2); // top has most
  });

  it('topDistributors sorted by count desc', async () => {
    const prisma = buildPrisma();
    (prisma.activation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { completedAt: new Date(), takenAt: null, activationPrice: null, activatorId: null, activator: null, card: { distributorId: DIST_ID, distributor: { storeName: 'Store A' } } },
      { completedAt: new Date(), takenAt: null, activationPrice: null, activatorId: null, activator: null, card: { distributorId: DIST_ID, distributor: { storeName: 'Store A' } } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.overview({ period: 'last_30d' });
    expect(dto.topDistributors).toHaveLength(1);
    expect(dto.topDistributors[0]!.storeName).toBe('Store A');
    expect(dto.topDistributors[0]!.count).toBe(2);
  });

  it('filters by wilayaId — passes card.distributor filter to Prisma', async () => {
    const prisma = buildPrisma();
    const svc = new StatisticsService(prisma);
    await svc.overview({ period: 'last_30d', wilayaId: WILAYA_ID });
    const call = (prisma.activation.findMany as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.stringify(call)).toContain(WILAYA_ID);
  });

  it('filters by subscriptionPlanId — passes card.subscriptionPlanId filter to Prisma', async () => {
    const prisma = buildPrisma();
    const svc = new StatisticsService(prisma);
    await svc.overview({ period: 'last_30d', subscriptionPlanId: PLAN_ID });
    const call = (prisma.activation.findMany as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.stringify(call)).toContain(PLAN_ID);
  });
});

// ─── wilayaHeatmap ────────────────────────────────────────────────────────────

describe('StatisticsService.wilayaHeatmap', () => {
  it('returns all wilayas — including those with no activations (zeroed)', async () => {
    const prisma = buildPrisma();
    const wilayas = Array.from({ length: 69 }, (_, i) => ({
      id: `cccccccc-cccc-4ccc-8ccc-${String(i).padStart(12, '0')}`,
      wilayaCode: String(i + 1).padStart(2, '0'),
      frName: `Wilaya ${i + 1}`,
      arName: `ولاية ${i + 1}`,
    }));
    (prisma.wilaya.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(wilayas);
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaHeatmap({});
    expect(dto).toHaveLength(69);
    expect(dto[0]!.activationsCount).toBe(0);
    expect(dto[0]!.cancellationsCount).toBe(0);
    expect(dto[0]!.avgActivationTimeSeconds).toBeNull();
  });

  it('fills activationsCount per wilaya from completed activations', async () => {
    const prisma = buildPrisma();
    (prisma.wilaya.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([makeWilaya()]);
    (prisma.activation.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { takenAt: null, completedAt: null, card: { distributor: { wilayaId: WILAYA_ID } } },
        { takenAt: null, completedAt: null, card: { distributor: { wilayaId: WILAYA_ID } } },
      ])
      .mockResolvedValueOnce([]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaHeatmap({});
    expect(dto[0]!.activationsCount).toBe(2);
  });

  it('fills cancellationsCount per wilaya from cancelled activations', async () => {
    const prisma = buildPrisma();
    (prisma.wilaya.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([makeWilaya()]);
    (prisma.activation.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([]) // completed
      .mockResolvedValueOnce([
        { card: { distributor: { wilayaId: WILAYA_ID } } },
      ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaHeatmap({});
    expect(dto[0]!.cancellationsCount).toBe(1);
  });

  it('computes avgActivationTimeSeconds from takenAt→completedAt', async () => {
    const prisma = buildPrisma();
    (prisma.wilaya.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([makeWilaya()]);
    const takenAt = new Date('2026-03-01T10:00:00.000Z');
    const completedAt = new Date('2026-03-01T10:05:00.000Z'); // 300s
    (prisma.activation.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ takenAt, completedAt, card: { distributor: { wilayaId: WILAYA_ID } } }])
      .mockResolvedValueOnce([]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaHeatmap({});
    expect(dto[0]!.avgActivationTimeSeconds).toBe(300);
  });

  it('distributorsCount filled from distributor groupBy', async () => {
    const prisma = buildPrisma();
    (prisma.wilaya.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([makeWilaya()]);
    (prisma.distributor.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { wilayaId: WILAYA_ID, _count: { _all: 5 } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaHeatmap({});
    expect(dto[0]!.distributorsCount).toBe(5);
  });
});

// ─── wilayaDrilldown ──────────────────────────────────────────────────────────

describe('StatisticsService.wilayaDrilldown', () => {
  it('throws NotFoundError for unknown wilayaId', async () => {
    const prisma = buildPrisma();
    (prisma.wilaya.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const svc = new StatisticsService(prisma);
    await expect(svc.wilayaDrilldown('bad-id', {})).rejects.toMatchObject({
      code: ErrorCode.RESOURCE_NOT_FOUND,
    });
  });

  it('groups activationsByPlan correctly with subscriptionLabel', async () => {
    const prisma = buildPrisma();
    (prisma.wilaya.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeWilaya());
    (prisma.activation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        completedAt: new Date('2026-03-01T10:00:00.000Z'),
        card: {
          distributorId: DIST_ID,
          distributor: { storeName: 'Store A' },
          subscriptionPlanId: PLAN_ID,
          subscriptionPlan: {
            subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
            subscriptionDuration: SubscriptionDuration.ONE_MONTH,
          },
        },
      },
      {
        completedAt: new Date('2026-03-02T10:00:00.000Z'),
        card: {
          distributorId: DIST_ID,
          distributor: { storeName: 'Store A' },
          subscriptionPlanId: PLAN_ID,
          subscriptionPlan: {
            subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
            subscriptionDuration: SubscriptionDuration.ONE_MONTH,
          },
        },
      },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaDrilldown(WILAYA_ID, {});
    expect(dto.activationsByPlan).toHaveLength(1);
    expect(dto.activationsByPlan[0]!.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
    expect(dto.activationsByPlan[0]!.count).toBe(2);
  });

  it('topDistributors sorted by count desc', async () => {
    const DIST_B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const prisma = buildPrisma();
    (prisma.wilaya.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeWilaya());
    (prisma.activation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { completedAt: new Date(), card: { distributorId: DIST_ID, distributor: { storeName: 'A' }, subscriptionPlanId: null, subscriptionPlan: null } },
      { completedAt: new Date(), card: { distributorId: DIST_ID, distributor: { storeName: 'A' }, subscriptionPlanId: null, subscriptionPlan: null } },
      { completedAt: new Date(), card: { distributorId: DIST_B, distributor: { storeName: 'B' }, subscriptionPlanId: null, subscriptionPlan: null } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaDrilldown(WILAYA_ID, {});
    expect(dto.topDistributors[0]!.activationsCount).toBe(2);
    expect(dto.topDistributors[0]!.storeName).toBe('A');
  });

  it('activationsOverTime groups by day bucket', async () => {
    const prisma = buildPrisma();
    (prisma.wilaya.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeWilaya());
    const day1 = new Date('2026-03-01T10:00:00.000Z');
    const day2 = new Date('2026-03-02T10:00:00.000Z');
    (prisma.activation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { completedAt: day1, card: { distributorId: null, distributor: null, subscriptionPlanId: null, subscriptionPlan: null } },
      { completedAt: day1, card: { distributorId: null, distributor: null, subscriptionPlanId: null, subscriptionPlan: null } },
      { completedAt: day2, card: { distributorId: null, distributor: null, subscriptionPlanId: null, subscriptionPlan: null } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaDrilldown(WILAYA_ID, {});
    expect(dto.activationsOverTime).toHaveLength(2);
    expect(dto.activationsOverTime[0]!.count).toBe(2);
    expect(dto.activationsOverTime[1]!.count).toBe(1);
  });

  it('passes wilayaId and wilayaName from resolved Wilaya', async () => {
    const prisma = buildPrisma();
    (prisma.wilaya.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(makeWilaya());
    const svc = new StatisticsService(prisma);
    const dto = await svc.wilayaDrilldown(WILAYA_ID, {});
    expect(dto.wilayaId).toBe(WILAYA_ID);
    expect(dto.wilayaName).toBe('Alger');
  });
});
