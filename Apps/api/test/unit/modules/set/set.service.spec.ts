import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetService } from '@modules/set/set.service';
import { ErrorCode, SetStat, SubscriptionType, SubscriptionDuration } from '@my-app/contract';
import { SetStat as PrismaSetStat, CardStat } from '@prisma/client';
import { setEntity } from '../../../data/set.factory';
import { subscriptionPlanEntity } from '../../../data/subscription-plan.factory';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

function buildPrisma() {
  const p = {
    subscriptionPlan: {
      findUnique: vi.fn(),
    },
    set: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    card: {
      findUnique: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    log: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(
    async (fn: (tx: typeof p) => Promise<unknown>) => fn(p),
  );
  return p;
}

const ACTOR_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PLAN_ID = 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22';

function makePlan(overrides = {}) {
  return subscriptionPlanEntity({
    id: PLAN_ID,
    isActive: true,
    subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
    subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    ...overrides,
  });
}

function makeSet(overrides = {}) {
  return {
    ...setEntity({ subscriptionPlanId: PLAN_ID, ...overrides }),
    subscriptionPlan: makePlan(),
  };
}

describe('SetService.create', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: SetService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new SetService(prisma as never);
  });

  it('creates exactly numberOfKeys cards in IN_SET', async () => {
    const plan = makePlan();
    prisma.subscriptionPlan.findUnique.mockResolvedValue(plan);
    const createdSet = makeSet({ setStat: PrismaSetStat.NOT_PRINTED });
    prisma.set.create.mockResolvedValue(createdSet);

    await service.create({ numberOfKeys: 5, subscriptionPlanId: PLAN_ID }, ACTOR_ID);

    expect(prisma.card.createMany).toHaveBeenCalledOnce();
    const callArg = prisma.card.createMany.mock.calls[0]?.[0] as { data: unknown[] };
    expect(callArg.data).toHaveLength(5);
    for (const card of callArg.data as Array<{ cardStat: string; isActive: boolean }>) {
      expect(card.cardStat).toBe(CardStat.IN_SET);
      expect(card.isActive).toBe(false);
    }
  });

  it('throws VALIDATION_ERROR when plan does not exist', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ numberOfKeys: 3, subscriptionPlanId: PLAN_ID }, ACTOR_ID),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws VALIDATION_ERROR when plan is inactive', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(makePlan({ isActive: false }));

    await expect(
      service.create({ numberOfKeys: 3, subscriptionPlanId: PLAN_ID }, ACTOR_ID),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('runs set create and card createMany inside the transaction', async () => {
    const plan = makePlan();
    prisma.subscriptionPlan.findUnique.mockResolvedValue(plan);
    prisma.set.create.mockResolvedValue(makeSet());

    await service.create({ numberOfKeys: 2, subscriptionPlanId: PLAN_ID }, ACTOR_ID);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.set.create).toHaveBeenCalledOnce();
    expect(prisma.card.createMany).toHaveBeenCalledOnce();
  });
});

describe('SetService.transition', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: SetService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new SetService(prisma as never);
  });

  it('transitions NOT_PRINTED → PENDING_PRINTING without transaction', async () => {
    const set = makeSet({ setStat: PrismaSetStat.NOT_PRINTED });
    prisma.set.findUnique.mockResolvedValue(set);
    prisma.set.update.mockResolvedValue({ ...set, setStat: PrismaSetStat.PENDING_PRINTING });

    const dto = await service.transition(set.id, { to: SetStat.PENDING_PRINTING });

    expect(dto.setStat).toBe(SetStat.PENDING_PRINTING);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('transitions PENDING_PRINTING → PRINTED and cascades cards inside transaction', async () => {
    const set = makeSet({ setStat: PrismaSetStat.PENDING_PRINTING });
    prisma.set.findUnique.mockResolvedValue(set);
    const printedSet = { ...set, setStat: PrismaSetStat.PRINTED, printedAt: new Date() };
    prisma.set.update.mockResolvedValue(printedSet);

    const dto = await service.transition(set.id, { to: SetStat.PRINTED });

    expect(dto.setStat).toBe(SetStat.PRINTED);
    expect(dto.printedAt).not.toBeNull();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.card.updateMany).toHaveBeenCalledWith({
      where: { setId: set.id, cardStat: CardStat.IN_SET },
      data: { cardStat: CardStat.PRINTED },
    });
  });

  it('throws RESOURCE_CONFLICT when already PRINTED (→ PENDING_PRINTING)', async () => {
    const set = makeSet({ setStat: PrismaSetStat.PRINTED });
    prisma.set.findUnique.mockResolvedValue(set);

    await expect(
      service.transition(set.id, { to: SetStat.PENDING_PRINTING }),
    ).rejects.toMatchObject({ code: ErrorCode.RESOURCE_CONFLICT });
  });

  it('throws RESOURCE_CONFLICT when skipping a step (NOT_PRINTED → PRINTED)', async () => {
    const set = makeSet({ setStat: PrismaSetStat.NOT_PRINTED });
    prisma.set.findUnique.mockResolvedValue(set);

    await expect(
      service.transition(set.id, { to: SetStat.PRINTED }),
    ).rejects.toMatchObject({ code: ErrorCode.RESOURCE_CONFLICT });
  });

  it('throws RESOURCE_NOT_FOUND for unknown id', async () => {
    prisma.set.findUnique.mockResolvedValue(null);

    await expect(
      service.transition('unknown-id', { to: SetStat.PENDING_PRINTING }),
    ).rejects.toMatchObject({ code: ErrorCode.RESOURCE_NOT_FOUND });
  });
});

describe('SetService.delete', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: SetService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new SetService(prisma as never);
  });

  it('deletes a NOT_PRINTED set and its cards inside transaction', async () => {
    const set = setEntity({ setStat: PrismaSetStat.NOT_PRINTED });
    prisma.set.findUnique.mockResolvedValue(set);

    await service.delete(set.id, ACTOR_ID);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.card.deleteMany).toHaveBeenCalledWith({ where: { setId: set.id } });
    expect(prisma.set.delete).toHaveBeenCalledWith({ where: { id: set.id } });
  });

  it('deletes a PENDING_PRINTING set', async () => {
    const set = setEntity({ setStat: PrismaSetStat.PENDING_PRINTING });
    prisma.set.findUnique.mockResolvedValue(set);

    await service.delete(set.id, ACTOR_ID);

    expect(prisma.set.delete).toHaveBeenCalledOnce();
  });

  it('throws RESOURCE_CONFLICT when deleting a PRINTED set', async () => {
    const set = setEntity({ setStat: PrismaSetStat.PRINTED });
    prisma.set.findUnique.mockResolvedValue(set);

    await expect(service.delete(set.id, ACTOR_ID)).rejects.toMatchObject({
      code: ErrorCode.RESOURCE_CONFLICT,
    });
  });

  it('writes REMOVE_SET log after delete', async () => {
    const set = setEntity({ setStat: PrismaSetStat.NOT_PRINTED });
    prisma.set.findUnique.mockResolvedValue(set);

    await service.delete(set.id, ACTOR_ID);

    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'REMOVE_SET',
          userId: ACTOR_ID,
        }),
      }),
    );
  });

  it('throws RESOURCE_NOT_FOUND for unknown id', async () => {
    prisma.set.findUnique.mockResolvedValue(null);

    await expect(service.delete('unknown-id', ACTOR_ID)).rejects.toMatchObject({
      code: ErrorCode.RESOURCE_NOT_FOUND,
    });
  });
});

describe('SetService.getAll', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: SetService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new SetService(prisma as never);
  });

  it('returns paginated result with meta', async () => {
    const set = makeSet();
    prisma.set.findMany.mockResolvedValue([set]);
    prisma.set.count.mockResolvedValue(1);

    const result = await service.getAll({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });
});
