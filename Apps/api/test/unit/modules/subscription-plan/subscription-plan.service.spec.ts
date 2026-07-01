import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { SubscriptionPlanService } from '@modules/subscription-plan/subscription-plan.service';
import { ErrorCode, LogActionType, SubscriptionType, SubscriptionDuration } from '@my-app/contract';

function buildPrisma() {
  const p = {
    subscriptionPlan: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    commissionDuration: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    subscriptionPlanCommission: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    },
    log: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<unknown>) => fn(p));
  return p;
}

const PLAN_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const TIER_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const ACTOR_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const makePlan = (overrides = {}) => ({
  id: PLAN_ID,
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
  isActive: true,
  ...overrides,
});

const makeTier = (overrides = {}) => ({
  id: TIER_ID,
  key: 'tier_0_60',
  label: '0–60 min',
  nbMinuteMin: 0,
  nbMinuteMax: 60,
  createdAt: new Date(),
  ...overrides,
});

const makeCell = (commission = '12.50') => ({
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  subscriptionPlanId: PLAN_ID,
  commissionDurationId: TIER_ID,
  commission: new Decimal(commission),
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('SubscriptionPlanService.getAll', () => {
  it('returns all plans when no filter', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlan.findMany.mockResolvedValue([makePlan()]);
    const service = new SubscriptionPlanService(prisma as never);
    const result = await service.getAll({});
    expect(result).toHaveLength(1);
    expect(result[0]!.label).toBe('Snapchat Plus — 01 Month');
  });

  it('applies active filter when provided', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlan.findMany.mockResolvedValue([]);
    const service = new SubscriptionPlanService(prisma as never);
    await service.getAll({ active: true });
    expect(prisma.subscriptionPlan.findMany).toHaveBeenCalledWith({ where: { isActive: true } });
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('SubscriptionPlanService.create', () => {
  it('throws 409 RESOURCE_CONFLICT on duplicate (type, duration)', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlan.findUnique.mockResolvedValue(makePlan());
    const service = new SubscriptionPlanService(prisma as never);
    await expect(
      service.create({ subscriptionType: SubscriptionType.SNAPCHAT_PLUS, subscriptionDuration: SubscriptionDuration.ONE_MONTH }),
    ).rejects.toMatchObject({ statusCode: 409, code: ErrorCode.RESOURCE_CONFLICT });
  });

  it('creates plan with isActive=true on no conflict', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
    prisma.subscriptionPlan.create.mockResolvedValue(makePlan());
    const service = new SubscriptionPlanService(prisma as never);
    const result = await service.create({ subscriptionType: SubscriptionType.SNAPCHAT_PLUS, subscriptionDuration: SubscriptionDuration.ONE_MONTH });
    expect(prisma.subscriptionPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: true }) }),
    );
    expect(result.isActive).toBe(true);
  });
});

// ─── toggle ───────────────────────────────────────────────────────────────────

describe('SubscriptionPlanService.toggle', () => {
  it('throws 404 for unknown plan', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
    const service = new SubscriptionPlanService(prisma as never);
    await expect(service.toggle('unknown-id')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('flips isActive from true to false', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlan.findUnique.mockResolvedValue(makePlan({ isActive: true }));
    prisma.subscriptionPlan.update.mockResolvedValue(makePlan({ isActive: false }));
    const service = new SubscriptionPlanService(prisma as never);
    const result = await service.toggle(PLAN_ID);
    expect(prisma.subscriptionPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
    expect(result.isActive).toBe(false);
  });
});

// ─── getCommissionDurations ───────────────────────────────────────────────────

describe('SubscriptionPlanService.getCommissionDurations', () => {
  it('orders by nbMinuteMin ascending', async () => {
    const prisma = buildPrisma();
    prisma.commissionDuration.findMany.mockResolvedValue([makeTier()]);
    const service = new SubscriptionPlanService(prisma as never);
    await service.getCommissionDurations();
    expect(prisma.commissionDuration.findMany).toHaveBeenCalledWith({ orderBy: { nbMinuteMin: 'asc' } });
  });
});

// ─── getCommissions ───────────────────────────────────────────────────────────

describe('SubscriptionPlanService.getCommissions', () => {
  it('returns matrix with null cells for missing entries', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlan.findMany.mockResolvedValue([makePlan()]);
    prisma.commissionDuration.findMany.mockResolvedValue([makeTier()]);
    prisma.subscriptionPlanCommission.findMany.mockResolvedValue([]);
    const service = new SubscriptionPlanService(prisma as never);
    const matrix = await service.getCommissions();
    expect(matrix.rows[0]!.cells[0]!.commission).toBeNull();
  });

  it('populates commission when cell exists', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlan.findMany.mockResolvedValue([makePlan()]);
    prisma.commissionDuration.findMany.mockResolvedValue([makeTier()]);
    prisma.subscriptionPlanCommission.findMany.mockResolvedValue([makeCell('5.00')]);
    const service = new SubscriptionPlanService(prisma as never);
    const matrix = await service.getCommissions();
    expect(matrix.rows[0]!.cells[0]!.commission).toBe(5);
  });
});

// ─── updateCommission ─────────────────────────────────────────────────────────

describe('SubscriptionPlanService.updateCommission', () => {
  it('upserts the commission cell', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlanCommission.upsert.mockResolvedValue(makeCell('10.00'));
    const service = new SubscriptionPlanService(prisma as never);
    await service.updateCommission(
      { subscriptionPlanId: PLAN_ID, commissionDurationId: TIER_ID, commission: 10 },
      ACTOR_ID,
    );
    expect(prisma.subscriptionPlanCommission.upsert).toHaveBeenCalled();
  });

  it('logs CHANGE_ACTIVATION_COMMISSION with actorId', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlanCommission.upsert.mockResolvedValue(makeCell('10.00'));
    const service = new SubscriptionPlanService(prisma as never);
    await service.updateCommission(
      { subscriptionPlanId: PLAN_ID, commissionDurationId: TIER_ID, commission: 10 },
      ACTOR_ID,
    );
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: LogActionType.CHANGE_ACTIVATION_COMMISSION,
          userId: ACTOR_ID,
        }),
      }),
    );
  });

  it('returns the cell DTO with 2dp commission', async () => {
    const prisma = buildPrisma();
    prisma.subscriptionPlanCommission.upsert.mockResolvedValue(makeCell('7.75'));
    const service = new SubscriptionPlanService(prisma as never);
    const result = await service.updateCommission(
      { subscriptionPlanId: PLAN_ID, commissionDurationId: TIER_ID, commission: 7.75 },
      ACTOR_ID,
    );
    expect(result.commission).toBe(7.75);
  });
});
