import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LotService } from '@modules/lot/lot.service';
import { ErrorCode, LotStat, SubscriptionType, SubscriptionDuration } from '@my-app/contract';
import { LotStat as PrismaLotStat, CardStat } from '@prisma/client';
import { lotEntity } from '../../../data/lot.factory';
import { subscriptionPlanEntity } from '../../../data/subscription-plan.factory';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

function buildPrisma() {
  const p = {
    subscriptionPlan: {
      findUnique: vi.fn(),
    },
    lot: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      delete: vi.fn(),
    },
    card: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
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
const CARD_ID_1 = 'c2aabb11-0000-4000-8000-000000000001';
const CARD_ID_2 = 'c2aabb11-0000-4000-8000-000000000002';

function makePlan(overrides = {}) {
  return subscriptionPlanEntity({
    id: PLAN_ID,
    isActive: true,
    subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
    subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    ...overrides,
  });
}

function makeLot(overrides = {}) {
  return {
    ...lotEntity({ subscriptionPlanId: PLAN_ID, ...overrides }),
    subscriptionPlan: makePlan(),
  };
}

function makePrintedCard(id: string, planId = PLAN_ID) {
  return { id, cardStat: CardStat.PRINTED, subscriptionPlanId: planId, lotId: null };
}

// ─── create ──────────────────────────────────────────────────────────────────

describe('LotService.create', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: LotService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new LotService(prisma as never);
  });

  it('creates a PENDING lot and moves cards to IN_LOT inside transaction', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(makePlan());
    prisma.card.findMany.mockResolvedValue([
      makePrintedCard(CARD_ID_1),
      makePrintedCard(CARD_ID_2),
    ]);
    const createdLot = makeLot({ lotStat: PrismaLotStat.PENDING, nbOfCards: 2 });
    prisma.lot.create.mockResolvedValue(createdLot);

    const dto = await service.create(
      { subscriptionPlanId: PLAN_ID, cardIds: [CARD_ID_1, CARD_ID_2] },
      ACTOR_ID,
    );

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.lot.create).toHaveBeenCalledOnce();
    expect(prisma.card.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [CARD_ID_1, CARD_ID_2] } },
        data: { cardStat: CardStat.IN_LOT, lotId: createdLot.id },
      }),
    );
    expect(dto.lotStat).toBe(LotStat.PENDING);
    expect(dto.nbOfCards).toBe(2);
  });

  it('throws VALIDATION_ERROR when plan is inactive', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(makePlan({ isActive: false }));

    await expect(
      service.create({ subscriptionPlanId: PLAN_ID, cardIds: [CARD_ID_1] }, ACTOR_ID),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws VALIDATION_ERROR when a card is not in PRINTED state', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(makePlan());
    prisma.card.findMany.mockResolvedValue([
      { id: CARD_ID_1, cardStat: CardStat.IN_SET, subscriptionPlanId: PLAN_ID, lotId: null },
    ]);

    await expect(
      service.create({ subscriptionPlanId: PLAN_ID, cardIds: [CARD_ID_1] }, ACTOR_ID),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws VALIDATION_ERROR when a card belongs to a different plan', async () => {
    const otherPlanId = 'd3ccdd22-0000-4000-8000-000000000099';
    prisma.subscriptionPlan.findUnique.mockResolvedValue(makePlan());
    prisma.card.findMany.mockResolvedValue([
      { id: CARD_ID_1, cardStat: CardStat.PRINTED, subscriptionPlanId: otherPlanId, lotId: null },
    ]);

    await expect(
      service.create({ subscriptionPlanId: PLAN_ID, cardIds: [CARD_ID_1] }, ACTOR_ID),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws RESOURCE_CONFLICT when a card is already assigned to a lot', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(makePlan());
    prisma.card.findMany.mockResolvedValue([
      { id: CARD_ID_1, cardStat: CardStat.IN_LOT, subscriptionPlanId: PLAN_ID, lotId: 'some-lot-id' },
    ]);

    await expect(
      service.create({ subscriptionPlanId: PLAN_ID, cardIds: [CARD_ID_1] }, ACTOR_ID),
    ).rejects.toMatchObject({ code: ErrorCode.RESOURCE_CONFLICT });
  });
});

// ─── getAvailableForOrder ─────────────────────────────────────────────────────

describe('LotService.getAvailableForOrder', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: LotService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new LotService(prisma as never);
  });

  it('only returns lots with lotStat PENDING or RETURNED', async () => {
    const pendingLot = makeLot({ lotStat: PrismaLotStat.PENDING });
    const returnedLot = makeLot({ lotStat: PrismaLotStat.RETURNED });
    prisma.lot.findMany.mockResolvedValue([pendingLot, returnedLot]);
    prisma.card.count.mockResolvedValue(0);

    const dtos = await service.getAvailableForOrder({});

    expect(dtos).toHaveLength(2);
    expect(prisma.lot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lotStat: { in: [PrismaLotStat.PENDING, PrismaLotStat.RETURNED] },
        }),
      }),
    );
  });

  it('applies optional subscriptionPlanId filter', async () => {
    prisma.lot.findMany.mockResolvedValue([]);

    await service.getAvailableForOrder({ subscriptionPlanId: PLAN_ID });

    expect(prisma.lot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ subscriptionPlanId: PLAN_ID }),
      }),
    );
  });
});

// ─── delete ──────────────────────────────────────────────────────────────────

describe('LotService.delete', () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: LotService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new LotService(prisma as never);
  });

  it('reverts cards to PRINTED and deletes lot inside transaction', async () => {
    const lot = lotEntity({ lotStat: PrismaLotStat.PENDING });
    prisma.lot.findUnique.mockResolvedValue(lot);

    await service.delete(lot.id, ACTOR_ID);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.card.updateMany).toHaveBeenCalledWith({
      where: { lotId: lot.id, cardStat: CardStat.IN_LOT },
      data: { cardStat: CardStat.PRINTED, lotId: null },
    });
    expect(prisma.lot.delete).toHaveBeenCalledWith({ where: { id: lot.id } });
  });

  it('writes REMOVE_LOT log after delete', async () => {
    const lot = lotEntity({ lotStat: PrismaLotStat.PENDING });
    prisma.lot.findUnique.mockResolvedValue(lot);

    await service.delete(lot.id, ACTOR_ID);

    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'REMOVE_LOT',
          userId: ACTOR_ID,
        }),
      }),
    );
  });

  it('throws RESOURCE_CONFLICT when lot is not PENDING', async () => {
    for (const stat of [PrismaLotStat.IN_DELIVERY, PrismaLotStat.DELIVERED, PrismaLotStat.RETURNED]) {
      const lot = lotEntity({ lotStat: stat });
      prisma.lot.findUnique.mockResolvedValue(lot);

      await expect(service.delete(lot.id, ACTOR_ID)).rejects.toMatchObject({
        code: ErrorCode.RESOURCE_CONFLICT,
      });
    }
  });

  it('throws RESOURCE_NOT_FOUND for unknown id', async () => {
    prisma.lot.findUnique.mockResolvedValue(null);

    await expect(service.delete('unknown-id', ACTOR_ID)).rejects.toMatchObject({
      code: ErrorCode.RESOURCE_NOT_FOUND,
    });
  });
});
