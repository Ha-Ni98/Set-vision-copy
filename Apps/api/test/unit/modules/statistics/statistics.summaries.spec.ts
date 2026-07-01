import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import type { PrismaClient } from '@prisma/client';
import { StatisticsService } from '../../../../src/modules/statistics/statistics.service';
import { ActivationStat, OrderStat, SetStat, LotStat, CardStat } from '@my-app/contract';

afterEach(() => {
  vi.useRealTimers();
});

function buildPrisma() {
  return {
    activation: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { activationPrice: null } }),
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
    },
    activator: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { nbOfSuccessfulActivation: null, credits: null } }),
    },
    distributor: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { nbOfActiveCards: null } }),
    },
    set: { groupBy: vi.fn().mockResolvedValue([]) },
    lot: { groupBy: vi.fn().mockResolvedValue([]) },
    card: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    order: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { orderPrice: null } }),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaClient;
}

// ─── dashboard ────────────────────────────────────────────────────────────────

describe('StatisticsService.dashboard', () => {
  it('uses todayStart() boundary for activationsToday', async () => {
    // Fix clock: 2026-03-10 14:30 UTC = 2026-03-10 15:30 Algiers
    // todayStart = 2026-03-09 23:00 UTC
    vi.useFakeTimers({ now: new Date('2026-03-10T14:30:00.000Z').getTime() });
    const prisma = buildPrisma();
    const svc = new StatisticsService(prisma);
    await svc.dashboard();
    const countCalls = (prisma.activation.count as ReturnType<typeof vi.fn>).mock.calls;
    const todayCall = countCalls.find(
      (c: unknown[]) =>
        JSON.stringify(c).includes('"completedAt"') && JSON.stringify(c).includes('"gte"'),
    );
    expect(todayCall).toBeDefined();
  });

  it('totalRevenue uses activation aggregate sum of activationPrice', async () => {
    const prisma = buildPrisma();
    (prisma.activation.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { activationPrice: new Decimal('1234.50') },
    });
    const svc = new StatisticsService(prisma);
    const dto = await svc.dashboard();
    expect(dto.totalRevenue).toBe(1234.5);
  });

  it('totalRevenue is 0 when no completed activations', async () => {
    const prisma = buildPrisma();
    const svc = new StatisticsService(prisma);
    const dto = await svc.dashboard();
    expect(dto.totalRevenue).toBe(0);
  });

  it('activeActivators reflects enabled activator count', async () => {
    const prisma = buildPrisma();
    (prisma.activator.count as ReturnType<typeof vi.fn>).mockResolvedValue(7);
    const svc = new StatisticsService(prisma);
    const dto = await svc.dashboard();
    expect(dto.activeActivators).toBe(7);
    expect(prisma.activator.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ user: expect.objectContaining({ isEnabled: true }) }) }),
    );
  });
});

// ─── activatorsSummary ────────────────────────────────────────────────────────

describe('StatisticsService.activatorsSummary', () => {
  it('onlineNow is the enabled-activator count', async () => {
    const prisma = buildPrisma();
    (prisma.activator.count as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(30)  // totalActivators
      .mockResolvedValueOnce(12); // onlineNow (enabled)
    const svc = new StatisticsService(prisma);
    const dto = await svc.activatorsSummary();
    expect(dto.onlineNow).toBe(12);
  });

  it('totalCreditsOwed converts Decimal → number 2dp', async () => {
    const prisma = buildPrisma();
    (prisma.activator.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { nbOfSuccessfulActivation: 150, credits: new Decimal('9876.54') },
    });
    const svc = new StatisticsService(prisma);
    const dto = await svc.activatorsSummary();
    expect(dto.totalCreditsOwed).toBe(9876.54);
  });

  it('totalCreditsOwed is 0 when aggregate returns null', async () => {
    const prisma = buildPrisma();
    const svc = new StatisticsService(prisma);
    const dto = await svc.activatorsSummary();
    expect(dto.totalCreditsOwed).toBe(0);
  });
});

// ─── distributorsSummary ─────────────────────────────────────────────────────

describe('StatisticsService.distributorsSummary', () => {
  it('totalCardsInStock uses distributor aggregate sum', async () => {
    const prisma = buildPrisma();
    (prisma.distributor.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { nbOfActiveCards: 450 },
    });
    const svc = new StatisticsService(prisma);
    const dto = await svc.distributorsSummary();
    expect(dto.totalCardsInStock).toBe(450);
  });

  it('activationsThisMonth uses monthStart() boundary', async () => {
    vi.useFakeTimers({ now: new Date('2026-03-10T14:30:00.000Z').getTime() });
    const prisma = buildPrisma();
    const svc = new StatisticsService(prisma);
    await svc.distributorsSummary();
    const activationCountCalls = (prisma.activation.count as ReturnType<typeof vi.fn>).mock.calls;
    const monthCall = activationCountCalls.find(
      (c: unknown[]) => JSON.stringify(c).includes('"completedAt"'),
    );
    expect(monthCall).toBeDefined();
  });
});

// ─── inventorySummary ─────────────────────────────────────────────────────────

describe('StatisticsService.inventorySummary', () => {
  it('groups sets, lots, cards by stat and passes through cardFlags', async () => {
    const prisma = buildPrisma();
    (prisma.set.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { setStat: SetStat.NOT_PRINTED, _count: { _all: 10 } },
    ]);
    (prisma.lot.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { lotStat: LotStat.PENDING, _count: { _all: 5 } },
    ]);
    (prisma.card.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { cardStat: CardStat.AT_DISTRIBUTOR, _count: { _all: 200 } },
    ]);
    (prisma.card.count as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(3)  // disabled
      .mockResolvedValueOnce(1); // revoked
    const svc = new StatisticsService(prisma);
    const dto = await svc.inventorySummary();
    expect(dto.sets[0]!.count).toBe(10);
    expect(dto.lots[0]!.count).toBe(5);
    expect(dto.cards[0]!.count).toBe(200);
    expect(dto.cardFlags.disabled).toBe(3);
    expect(dto.cardFlags.revoked).toBe(1);
  });

  it('zero-count groups are omitted (mapper handles it)', async () => {
    const prisma = buildPrisma();
    (prisma.set.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { setStat: SetStat.NOT_PRINTED, _count: { _all: 0 } },
      { setStat: SetStat.PRINTED, _count: { _all: 3 } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.inventorySummary();
    expect(dto.sets).toHaveLength(1);
    expect(dto.sets[0]!.stat).toBe(SetStat.PRINTED);
  });
});

// ─── ordersSummary ────────────────────────────────────────────────────────────

describe('StatisticsService.ordersSummary', () => {
  it('totalRevenue uses order aggregate sum of orderPrice (not activationPrice)', async () => {
    const prisma = buildPrisma();
    (prisma.order.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { orderPrice: new Decimal('9999.99') },
    });
    const svc = new StatisticsService(prisma);
    const dto = await svc.ordersSummary();
    expect(dto.totalRevenue).toBe(9999.99);
    expect(prisma.activation.aggregate).not.toHaveBeenCalled();
  });

  it('byState omits zero-count states', async () => {
    const prisma = buildPrisma();
    (prisma.order.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { orderStat: OrderStat.PENDING_DELIVERY, _count: { _all: 10 } },
      { orderStat: OrderStat.DELIVERED, _count: { _all: 0 } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.ordersSummary();
    expect(dto.byState).toHaveLength(1);
    expect(dto.byState[0]!.state).toBe(OrderStat.PENDING_DELIVERY);
  });

  it('totalOrders has all/month/week counts', async () => {
    const prisma = buildPrisma();
    (prisma.order.count as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(100)  // all
      .mockResolvedValueOnce(30)   // month
      .mockResolvedValueOnce(8)    // week
      .mockResolvedValue(0);        // pendingDelivery, inDelivery
    const svc = new StatisticsService(prisma);
    const dto = await svc.ordersSummary();
    expect(dto.totalOrders).toEqual({ all: 100, month: 30, week: 8 });
  });
});

// ─── activationsSummary ───────────────────────────────────────────────────────

describe('StatisticsService.activationsSummary', () => {
  it('totalRevenue uses activation aggregate activationPrice', async () => {
    const prisma = buildPrisma();
    (prisma.activation.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { activationPrice: new Decimal('50000.00') },
    });
    const svc = new StatisticsService(prisma);
    const dto = await svc.activationsSummary();
    expect(dto.totalRevenue).toBe(50000);
    expect(prisma.order.aggregate).not.toHaveBeenCalled();
  });

  it('avgDurationSeconds is null when no completed activations have duration data', async () => {
    const prisma = buildPrisma();
    // findMany returns empty = no completed activations with takenAt+completedAt
    const svc = new StatisticsService(prisma);
    const dto = await svc.activationsSummary();
    expect(dto.avgDurationSeconds).toBeNull();
  });

  it('avgDurationSeconds computes average from takenAt→completedAt in seconds', async () => {
    const prisma = buildPrisma();
    const takenAt = new Date('2026-03-01T10:00:00.000Z');
    const completedAt = new Date('2026-03-01T10:05:00.000Z'); // 300s
    (prisma.activation.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { takenAt, completedAt },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.activationsSummary();
    expect(dto.avgDurationSeconds).toBe(300);
  });

  it('byState omits zero-count states', async () => {
    const prisma = buildPrisma();
    (prisma.activation.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
      { activationStat: ActivationStat.ACTIVATED, _count: { _all: 100 } },
      { activationStat: ActivationStat.PENDING, _count: { _all: 0 } },
    ]);
    const svc = new StatisticsService(prisma);
    const dto = await svc.activationsSummary();
    expect(dto.byState).toHaveLength(1);
    expect(dto.byState[0]!.state).toBe(ActivationStat.ACTIVATED);
  });

  it('total.today and total.week use Algiers boundaries', async () => {
    vi.useFakeTimers({ now: new Date('2026-03-10T14:30:00.000Z').getTime() });
    const prisma = buildPrisma();
    const svc = new StatisticsService(prisma);
    await svc.activationsSummary();
    // activation.count should have been called multiple times with gte boundaries
    const calls = (prisma.activation.count as ReturnType<typeof vi.fn>).mock.calls;
    const callsWithGte = calls.filter((c: unknown[]) =>
      JSON.stringify(c).includes('"completedAt"'),
    );
    expect(callsWithGte.length).toBeGreaterThanOrEqual(3); // today, week, month
  });
});
