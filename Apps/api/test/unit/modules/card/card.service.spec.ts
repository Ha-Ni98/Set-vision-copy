import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardService } from '@modules/card/card.service';
import { CardStat, SubscriptionType, SubscriptionDuration } from '@my-app/contract';
import { ConflictError, NotFoundError } from '@common/errors';
import { faker } from '@faker-js/faker';

// ────────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────────

function buildPrisma() {
  const p = {
    card: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    distributor: {
      update: vi.fn(),
    },
    log: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<unknown>) => fn(p));
  return p;
}

const PLAN = {
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
};

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    key: 'ABCD-1234-EFGH-5678',
    subscriptionPlanId: faker.string.uuid(),
    setId: faker.string.uuid(),
    lotId: null as string | null,
    distributorId: null as string | null,
    cardStat: CardStat.IN_SET as string,
    isActive: false,
    isDisabled: false,
    isRevoked: false,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
    deletedAt: null,
    subscriptionPlan: PLAN,
    set: { setNumber: 'SET-20240101-AABB', createdAt: new Date('2024-01-01'), printedAt: null as Date | null },
    lot: null as { lotNumber: string; createdAt: Date; orderLots: Array<{ order: { completedAt: Date | null } }> } | null,
    distributor: null as { storeName: string } | null,
    ...overrides,
  };
}

let prisma: ReturnType<typeof buildPrisma>;
let service: CardService;

beforeEach(() => {
  prisma = buildPrisma();
  service = new CardService(prisma as never);
});

// ────────────────────────────────────────────────────────────────────────────────
// getAll
// ────────────────────────────────────────────────────────────────────────────────

describe('CardService.getAll', () => {
  it('passes deletedAt: null in where clause', async () => {
    prisma.card.findMany.mockResolvedValue([]);
    prisma.card.count.mockResolvedValue(0);

    await service.getAll({});

    expect(prisma.card.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
  });

  it('returns paginated result with items and meta', async () => {
    const card = makeCard({ cardStat: CardStat.IN_SET });
    prisma.card.findMany.mockResolvedValue([card]);
    prisma.card.count.mockResolvedValue(1);

    const result = await service.getAll({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// getById
// ────────────────────────────────────────────────────────────────────────────────

describe('CardService.getById', () => {
  it('throws NotFoundError when card does not exist', async () => {
    prisma.card.findUnique.mockResolvedValue(null);
    await expect(service.getById(faker.string.uuid())).rejects.toBeInstanceOf(NotFoundError);
  });

  it('builds timeline with only IN_SET when printedAt and lot are absent', async () => {
    const card = makeCard({
      cardStat: CardStat.IN_SET,
      set: { setNumber: 'SET-X', createdAt: new Date('2024-01-01'), printedAt: null },
      lot: null,
    });
    prisma.card.findUnique.mockResolvedValue(card);

    const dto = await service.getById(card.id as string);

    expect(dto.distributionTimeline).toHaveLength(1);
    expect(dto.distributionTimeline[0]!.stat).toBe(CardStat.IN_SET);
  });

  it('includes PRINTED stage when set.printedAt exists', async () => {
    const card = makeCard({
      set: {
        setNumber: 'SET-X',
        createdAt: new Date('2024-01-01'),
        printedAt: new Date('2024-01-02'),
      },
      lot: null,
    });
    prisma.card.findUnique.mockResolvedValue(card);

    const dto = await service.getById(card.id as string);

    expect(dto.distributionTimeline).toHaveLength(2);
    expect(dto.distributionTimeline[1]!.stat).toBe(CardStat.PRINTED);
  });

  it('builds full timeline when lot and order with completedAt exist', async () => {
    const card = makeCard({
      set: {
        setNumber: 'SET-X',
        createdAt: new Date('2024-01-01'),
        printedAt: new Date('2024-01-02'),
      },
      lot: {
        lotNumber: 'LOT-001',
        createdAt: new Date('2024-01-03'),
        orderLots: [{ order: { completedAt: new Date('2024-01-05') } }],
      },
    });
    prisma.card.findUnique.mockResolvedValue(card);

    const dto = await service.getById(card.id as string);

    const stats = dto.distributionTimeline.map((e) => e.stat);
    expect(stats).toEqual([
      CardStat.IN_SET,
      CardStat.PRINTED,
      CardStat.IN_LOT,
      CardStat.AT_DISTRIBUTOR,
    ]);
  });

  it('omits AT_DISTRIBUTOR when order.completedAt is null', async () => {
    const card = makeCard({
      set: { setNumber: 'SET-X', createdAt: new Date('2024-01-01'), printedAt: null },
      lot: {
        lotNumber: 'LOT-001',
        createdAt: new Date('2024-01-03'),
        orderLots: [{ order: { completedAt: null } }],
      },
    });
    prisma.card.findUnique.mockResolvedValue(card);

    const dto = await service.getById(card.id as string);

    const stats = dto.distributionTimeline.map((e) => e.stat);
    expect(stats).toContain(CardStat.IN_LOT);
    expect(stats).not.toContain(CardStat.AT_DISTRIBUTOR);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// delete
// ────────────────────────────────────────────────────────────────────────────────

describe('CardService.delete', () => {
  it('soft-deletes card in IN_SET state and logs REMOVE_CARD', async () => {
    const card = makeCard({ cardStat: CardStat.IN_SET });
    prisma.card.findUnique.mockResolvedValue(card);
    prisma.card.update.mockResolvedValue({ ...card, deletedAt: new Date() });
    prisma.log.create.mockResolvedValue({});

    await service.delete(card.id as string, 'actor-1');

    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'REMOVE_CARD', userId: 'actor-1' }),
      }),
    );
  });

  it('soft-deletes card in PRINTED state', async () => {
    const card = makeCard({ cardStat: CardStat.PRINTED });
    prisma.card.findUnique.mockResolvedValue(card);
    prisma.card.update.mockResolvedValue({});
    prisma.log.create.mockResolvedValue({});

    await expect(service.delete(card.id as string, 'actor-1')).resolves.toBeUndefined();
    expect(prisma.card.update).toHaveBeenCalled();
  });

  it('throws ConflictError for IN_LOT state', async () => {
    const card = makeCard({ cardStat: CardStat.IN_LOT });
    prisma.card.findUnique.mockResolvedValue(card);

    await expect(service.delete(card.id as string, 'actor-1')).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.card.update).not.toHaveBeenCalled();
  });

  it('throws ConflictError for AT_DISTRIBUTOR state', async () => {
    const card = makeCard({ cardStat: CardStat.AT_DISTRIBUTOR });
    prisma.card.findUnique.mockResolvedValue(card);

    await expect(service.delete(card.id as string, 'actor-1')).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws NotFoundError when card does not exist', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await expect(service.delete(faker.string.uuid(), 'actor-1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// disable
// ────────────────────────────────────────────────────────────────────────────────

describe('CardService.disable', () => {
  it('sets isDisabled+isActive and decrements nbOfActiveCards for AT_DISTRIBUTOR', async () => {
    const distributorId = faker.string.uuid();
    const card = makeCard({ cardStat: CardStat.AT_DISTRIBUTOR, isDisabled: false, distributorId });
    const updatedCard = makeCard({ ...card, isDisabled: true, isActive: false });

    prisma.card.findUnique.mockResolvedValue(card);
    prisma.card.update.mockResolvedValue(updatedCard);
    prisma.distributor.update.mockResolvedValue({});

    await service.disable(card.id as string);

    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDisabled: true, isActive: false } }),
    );
    expect(prisma.distributor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: distributorId },
        data: { nbOfActiveCards: { decrement: 1 } },
      }),
    );
  });

  it('sets isDisabled+isActive without touching nbOfActiveCards for IN_LOT', async () => {
    const card = makeCard({ cardStat: CardStat.IN_LOT, isDisabled: false });
    const updatedCard = makeCard({ ...card, isDisabled: true, isActive: false });

    prisma.card.findUnique.mockResolvedValue(card);
    prisma.card.update.mockResolvedValue(updatedCard);

    await service.disable(card.id as string);

    expect(prisma.card.update).toHaveBeenCalled();
    expect(prisma.distributor.update).not.toHaveBeenCalled();
  });

  it('throws ConflictError when card is already disabled', async () => {
    const card = makeCard({ cardStat: CardStat.AT_DISTRIBUTOR, isDisabled: true });
    prisma.card.findUnique.mockResolvedValue(card);

    await expect(service.disable(card.id as string)).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError for invalid state (PRINTED)', async () => {
    const card = makeCard({ cardStat: CardStat.PRINTED, isDisabled: false });
    prisma.card.findUnique.mockResolvedValue(card);

    await expect(service.disable(card.id as string)).rejects.toBeInstanceOf(ConflictError);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// enable
// ────────────────────────────────────────────────────────────────────────────────

describe('CardService.enable', () => {
  it('flips flags to active, sets AT_DISTRIBUTOR, and increments nbOfActiveCards', async () => {
    const distributorId = faker.string.uuid();
    const card = makeCard({ cardStat: CardStat.AT_DISTRIBUTOR, isDisabled: true, distributorId });
    const updatedCard = makeCard({ ...card, isDisabled: false, isActive: true, cardStat: CardStat.AT_DISTRIBUTOR });

    prisma.card.findUnique.mockResolvedValue(card);
    prisma.card.update.mockResolvedValue(updatedCard);
    prisma.distributor.update.mockResolvedValue({});

    const dto = await service.enable(card.id as string);

    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isDisabled: false, isActive: true, cardStat: 'AT_DISTRIBUTOR' },
      }),
    );
    expect(prisma.distributor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: distributorId },
        data: { nbOfActiveCards: { increment: 1 } },
      }),
    );
    expect(dto.cardStat).toBe(CardStat.AT_DISTRIBUTOR);
    expect(dto.isActive).toBe(true);
    expect(dto.isDisabled).toBe(false);
  });

  it('throws ConflictError when card is not disabled', async () => {
    const card = makeCard({ isDisabled: false });
    prisma.card.findUnique.mockResolvedValue(card);

    await expect(service.enable(card.id as string)).rejects.toBeInstanceOf(ConflictError);
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// revoke
// ────────────────────────────────────────────────────────────────────────────────

describe('CardService.revoke', () => {
  it('sets isRevoked+isActive+AT_DISTRIBUTOR, increments nbOfActiveCards, logs REVOKE_CARD', async () => {
    const distributorId = faker.string.uuid();
    const card = makeCard({
      cardStat: CardStat.ACTIVATION_FAILED,
      isDisabled: false,
      distributorId,
    });
    const updatedCard = makeCard({ ...card, isRevoked: true, isActive: true, cardStat: CardStat.AT_DISTRIBUTOR });

    prisma.card.findUnique.mockResolvedValue(card);
    prisma.card.update.mockResolvedValue(updatedCard);
    prisma.distributor.update.mockResolvedValue({});
    prisma.log.create.mockResolvedValue({});

    const dto = await service.revoke(card.id as string, 'actor-2');

    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isRevoked: true, isActive: true, cardStat: 'AT_DISTRIBUTOR' },
      }),
    );
    expect(prisma.distributor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { nbOfActiveCards: { increment: 1 } },
      }),
    );
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'REVOKE_CARD', userId: 'actor-2' }),
      }),
    );
    expect(dto.isRevoked).toBe(true);
    expect(dto.cardStat).toBe(CardStat.AT_DISTRIBUTOR);
  });

  it('throws ConflictError for non-ACTIVATION_FAILED state', async () => {
    const card = makeCard({ cardStat: CardStat.AT_DISTRIBUTOR, isDisabled: false });
    prisma.card.findUnique.mockResolvedValue(card);

    await expect(service.revoke(card.id as string, 'actor-2')).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError when card is disabled', async () => {
    const card = makeCard({ cardStat: CardStat.ACTIVATION_FAILED, isDisabled: true });
    prisma.card.findUnique.mockResolvedValue(card);

    await expect(service.revoke(card.id as string, 'actor-2')).rejects.toBeInstanceOf(ConflictError);
  });
});
