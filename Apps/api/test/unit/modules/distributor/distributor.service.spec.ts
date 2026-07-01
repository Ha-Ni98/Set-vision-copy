import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DistributorService } from '@modules/distributor/distributor.service';
import { ErrorCode, LogActionType, CardStat, OrderStat } from '@my-app/contract';

const DIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WILAYA_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COMMUNE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ACTOR_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const makeDistributor = (overrides: Record<string, unknown> = {}) => ({
  id: DIST_ID,
  fullName: 'John Doe',
  storeName: 'My Store',
  phone: '+213555000000',
  wilayaId: WILAYA_ID,
  communeId: COMMUNE_ID,
  isEnabled: true,
  nbOfActiveCards: 0,
  nbOfActivation: 0,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  deletedAt: null,
  wilaya: { id: WILAYA_ID, wilayaCode: '01', frName: 'Adrar', arName: 'أدرار' },
  commune: { id: COMMUNE_ID, communeCode: '010101', wilayaId: WILAYA_ID, frName: 'Adrar City', arName: 'مدينة أدرار' },
  ...overrides,
});

function buildPrisma() {
  const p = {
    distributor: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    order: {
      groupBy: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    card: {
      count: vi.fn().mockResolvedValue(0),
    },
    commune: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    log: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<unknown>) => fn(p));
  return p;
}

// ─── create ───────────────────────────────────────────────────────────────────

describe('DistributorService.create', () => {
  it('throws 400 VALIDATION_ERROR when commune does not belong to wilaya', async () => {
    const prisma = buildPrisma();
    prisma.commune.findFirst.mockResolvedValue(null);
    const service = new DistributorService(prisma as never);
    await expect(
      service.create({ fullName: 'A', storeName: 'B', phone: '0', wilayaId: WILAYA_ID, communeId: COMMUNE_ID }, ACTOR_ID),
    ).rejects.toMatchObject({ statusCode: 400, code: ErrorCode.VALIDATION_ERROR });
  });

  it('creates distributor with counters 0 and isEnabled true', async () => {
    const prisma = buildPrisma();
    prisma.commune.findFirst.mockResolvedValue({ id: COMMUNE_ID });
    prisma.distributor.create.mockResolvedValue(makeDistributor());
    const service = new DistributorService(prisma as never);
    await service.create({ fullName: 'John', storeName: 'Store', phone: '+213555', wilayaId: WILAYA_ID, communeId: COMMUNE_ID }, ACTOR_ID);
    expect(prisma.distributor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isEnabled: true, nbOfActiveCards: 0, nbOfActivation: 0 }),
      }),
    );
  });

  it('logs ADD_DISTRIBUTOR with actorId inside transaction', async () => {
    const prisma = buildPrisma();
    prisma.commune.findFirst.mockResolvedValue({ id: COMMUNE_ID });
    prisma.distributor.create.mockResolvedValue(makeDistributor());
    const service = new DistributorService(prisma as never);
    await service.create({ fullName: 'John', storeName: 'Store', phone: '+213555', wilayaId: WILAYA_ID, communeId: COMMUNE_ID }, ACTOR_ID);
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: LogActionType.ADD_DISTRIBUTOR, userId: ACTOR_ID }),
      }),
    );
  });

  it('trims fullName, storeName, and phone', async () => {
    const prisma = buildPrisma();
    prisma.commune.findFirst.mockResolvedValue({ id: COMMUNE_ID });
    prisma.distributor.create.mockResolvedValue(makeDistributor());
    const service = new DistributorService(prisma as never);
    await service.create({ fullName: '  John  ', storeName: '  Store  ', phone: '  0555  ', wilayaId: WILAYA_ID, communeId: COMMUNE_ID }, ACTOR_ID);
    expect(prisma.distributor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fullName: 'John', storeName: 'Store', phone: '0555' }),
      }),
    );
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('DistributorService.getById', () => {
  it('throws 404 for unknown or soft-deleted distributor', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(null);
    const service = new DistributorService(prisma as never);
    await expect(service.getById('unknown')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('derives soldKeys from ACTIVATED cards', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor());
    prisma.card.count.mockResolvedValue(5);
    prisma.order.count.mockResolvedValue(0);
    const service = new DistributorService(prisma as never);
    const result = await service.getById(DIST_ID);
    expect(result.soldKeys).toBe(5);
    expect(prisma.card.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ cardStat: CardStat.ACTIVATED }) }),
    );
  });

  it('derives ordersCount from total orders', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor());
    prisma.card.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValueOnce(8).mockResolvedValueOnce(3);
    const service = new DistributorService(prisma as never);
    const result = await service.getById(DIST_ID);
    expect(result.ordersCount).toBe(8);
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('DistributorService.update', () => {
  it('throws 400 VALIDATION_ERROR when commune does not belong to wilaya on update', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor());
    prisma.commune.findFirst.mockResolvedValue(null);
    const service = new DistributorService(prisma as never);
    await expect(
      service.update(DIST_ID, { wilayaId: WILAYA_ID, communeId: 'other-commune' }, ACTOR_ID),
    ).rejects.toMatchObject({ statusCode: 400, code: ErrorCode.VALIDATION_ERROR });
  });

  it('throws 404 for unknown distributor', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(null);
    const service = new DistributorService(prisma as never);
    await expect(service.update('unknown', { fullName: 'X' }, ACTOR_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('logs CHANGE_DISTRIBUTOR_INFORMATION with actorId', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor());
    prisma.commune.findFirst.mockResolvedValue({ id: COMMUNE_ID });
    prisma.distributor.update.mockResolvedValue(makeDistributor({ fullName: 'Updated' }));
    prisma.order.count.mockResolvedValue(0);
    const service = new DistributorService(prisma as never);
    await service.update(DIST_ID, { fullName: 'Updated' }, ACTOR_ID);
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: LogActionType.CHANGE_DISTRIBUTOR_INFORMATION,
          userId: ACTOR_ID,
        }),
      }),
    );
  });

  it('does not re-validate geography when neither wilayaId nor communeId changes', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor());
    prisma.distributor.update.mockResolvedValue(makeDistributor({ fullName: 'X' }));
    prisma.order.count.mockResolvedValue(0);
    const service = new DistributorService(prisma as never);
    await service.update(DIST_ID, { fullName: 'X' }, ACTOR_ID);
    expect(prisma.commune.findFirst).not.toHaveBeenCalled();
  });
});

// ─── toggle ───────────────────────────────────────────────────────────────────

describe('DistributorService.toggle', () => {
  it('throws 404 for unknown distributor', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(null);
    const service = new DistributorService(prisma as never);
    await expect(service.toggle('unknown', ACTOR_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('flips isEnabled from true to false', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor({ isEnabled: true }));
    prisma.distributor.update.mockResolvedValue(makeDistributor({ isEnabled: false }));
    prisma.order.count.mockResolvedValue(0);
    const service = new DistributorService(prisma as never);
    const result = await service.toggle(DIST_ID, ACTOR_ID);
    expect(prisma.distributor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isEnabled: false }) }),
    );
    expect(result.isEnabled).toBe(false);
  });

  it('logs CHANGE_DISTRIBUTOR_STAT with actorId', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor({ isEnabled: true }));
    prisma.distributor.update.mockResolvedValue(makeDistributor({ isEnabled: false }));
    prisma.order.count.mockResolvedValue(0);
    const service = new DistributorService(prisma as never);
    await service.toggle(DIST_ID, ACTOR_ID);
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: LogActionType.CHANGE_DISTRIBUTOR_STAT,
          userId: ACTOR_ID,
        }),
      }),
    );
  });
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe('DistributorService.delete', () => {
  it('throws 404 for unknown or already-deleted distributor', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(null);
    const service = new DistributorService(prisma as never);
    await expect(service.delete('unknown', ACTOR_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('soft-deletes by setting deletedAt', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor());
    prisma.distributor.update.mockResolvedValue(makeDistributor({ deletedAt: new Date() }));
    const service = new DistributorService(prisma as never);
    await service.delete(DIST_ID, ACTOR_ID);
    expect(prisma.distributor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
  });

  it('does not write a log entry', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor());
    prisma.distributor.update.mockResolvedValue(makeDistributor({ deletedAt: new Date() }));
    const service = new DistributorService(prisma as never);
    await service.delete(DIST_ID, ACTOR_ID);
    expect(prisma.log.create).not.toHaveBeenCalled();
  });

  it('never writes nbOfActiveCards or nbOfActivation', async () => {
    const prisma = buildPrisma();
    prisma.distributor.findFirst.mockResolvedValue(makeDistributor());
    prisma.distributor.update.mockResolvedValue(makeDistributor({ deletedAt: new Date() }));
    const service = new DistributorService(prisma as never);
    await service.delete(DIST_ID, ACTOR_ID);
    const updateCall = prisma.distributor.update.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(updateCall.data['nbOfActiveCards']).toBeUndefined();
    expect(updateCall.data['nbOfActivation']).toBeUndefined();
  });
});
