import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentService } from '@modules/payment/payment.service';
import { ErrorCode, LogActionType } from '@my-app/contract';

const PAYMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ACTIVATOR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ADMIN_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ACTOR_USER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ADMIN_USER_ID = ACTOR_USER_ID;

const makeAdmin = (overrides: Record<string, unknown> = {}) => ({
  id: ADMIN_ID,
  userId: ADMIN_USER_ID,
  fullName: 'Alice Admin',
  phone: '+213555111111',
  isEnabled: true,
  ...overrides,
});

const makeActivator = (credits = 500) => ({
  id: ACTIVATOR_ID,
  userId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  fullName: 'Bob Activator',
  phone: '+213555222222',
  totalEarning: new Decimal(0),
  credits: new Decimal(credits),
  nbOfActivation: 0,
  nbOfSuccessfulActivation: 0,
});

const makePayment = (overrides: Record<string, unknown> = {}) => ({
  id: PAYMENT_ID,
  adminId: ADMIN_ID,
  activatorId: ACTIVATOR_ID,
  totalAmount: new Decimal('100.00'),
  previousCredits: new Decimal('500.00'),
  paymentDate: new Date('2024-03-10T09:00:00.000Z'),
  isDeleted: false,
  deletedDate: null,
  admin: makeAdmin(),
  ...overrides,
});

function buildPrisma() {
  const p = {
    payment: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    admin: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    activator: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    log: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<unknown>) => fn(p));
  return p;
}

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('PaymentService.getAll', () => {
  it('excludes deleted payments by default', async () => {
    const prisma = buildPrisma();
    prisma.payment.findMany.mockResolvedValue([]);
    const service = new PaymentService(prisma as never);
    await service.getAll({ page: 1, limit: 10 });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: expect.arrayContaining([{ isDeleted: false }]) }),
      }),
    );
  });

  it('includes deleted payments when includeDeleted=true', async () => {
    const prisma = buildPrisma();
    prisma.payment.findMany.mockResolvedValue([]);
    const service = new PaymentService(prisma as never);
    await service.getAll({ page: 1, limit: 10, includeDeleted: true });
    const call = prisma.payment.findMany.mock.calls[0]![0] as { where: { AND?: unknown[] } };
    const conditions = call.where.AND ?? [];
    const hasIsDeletedFilter = (conditions as { isDeleted?: boolean }[]).some(
      (c) => c.isDeleted !== undefined,
    );
    expect(hasIsDeletedFilter).toBe(false);
  });

  it('filters by activatorId when provided', async () => {
    const prisma = buildPrisma();
    prisma.payment.findMany.mockResolvedValue([]);
    const service = new PaymentService(prisma as never);
    await service.getAll({ page: 1, limit: 10, activatorId: ACTIVATOR_ID });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ activatorId: ACTIVATOR_ID }]),
        }),
      }),
    );
  });

  it('orders by paymentDate desc', async () => {
    const prisma = buildPrisma();
    prisma.payment.findMany.mockResolvedValue([]);
    const service = new PaymentService(prisma as never);
    await service.getAll({ page: 1, limit: 10 });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { paymentDate: 'desc' } }),
    );
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('PaymentService.create', () => {
  it('throws 404 when activator not found', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(makeAdmin());
    prisma.activator.findUnique.mockResolvedValue(null);
    const service = new PaymentService(prisma as never);
    await expect(
      service.create({ activatorId: ACTIVATOR_ID, amount: 100 }, ACTOR_USER_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 409 RESOURCE_CONFLICT when amount exceeds activator credits', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(makeAdmin());
    prisma.activator.findUnique.mockResolvedValue(makeActivator(50));
    const service = new PaymentService(prisma as never);
    await expect(
      service.create({ activatorId: ACTIVATOR_ID, amount: 100 }, ACTOR_USER_ID),
    ).rejects.toMatchObject({ statusCode: 409, code: ErrorCode.RESOURCE_CONFLICT });
  });

  it('throws 400 when amount is zero or negative', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(makeAdmin());
    prisma.activator.findUnique.mockResolvedValue(makeActivator(500));
    const service = new PaymentService(prisma as never);
    await expect(
      service.create({ activatorId: ACTIVATOR_ID, amount: 0 }, ACTOR_USER_ID),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('snapshots previousCredits and decrements activator credits', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(makeAdmin());
    prisma.activator.findUnique.mockResolvedValue(makeActivator(500));
    prisma.payment.create.mockResolvedValue(makePayment());
    const service = new PaymentService(prisma as never);
    await service.create({ activatorId: ACTIVATOR_ID, amount: 100 }, ACTOR_USER_ID);

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousCredits: expect.any(Object), // Decimal(500)
          totalAmount: expect.any(Object),      // Decimal(100)
        }),
      }),
    );
    expect(prisma.activator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ credits: { decrement: expect.any(Object) } }),
      }),
    );
  });

  it('logs SET_PAYMENT with actorUserId', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(makeAdmin());
    prisma.activator.findUnique.mockResolvedValue(makeActivator(500));
    prisma.payment.create.mockResolvedValue(makePayment());
    const service = new PaymentService(prisma as never);
    await service.create({ activatorId: ACTIVATOR_ID, amount: 100 }, ACTOR_USER_ID);
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: LogActionType.SET_PAYMENT,
          userId: ACTOR_USER_ID,
        }),
      }),
    );
  });
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe('PaymentService.delete', () => {
  it('throws 404 for unknown payment', async () => {
    const prisma = buildPrisma();
    prisma.payment.findUnique.mockResolvedValue(null);
    const service = new PaymentService(prisma as never);
    await expect(service.delete('unknown', ACTOR_USER_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 409 on double-delete (already isDeleted)', async () => {
    const prisma = buildPrisma();
    prisma.payment.findUnique.mockResolvedValue(makePayment({ isDeleted: true }));
    const service = new PaymentService(prisma as never);
    await expect(service.delete(PAYMENT_ID, ACTOR_USER_ID)).rejects.toMatchObject({
      statusCode: 409,
      code: ErrorCode.RESOURCE_CONFLICT,
    });
  });

  it('sets isDeleted=true and deletedDate inside transaction', async () => {
    const prisma = buildPrisma();
    prisma.payment.findUnique.mockResolvedValue(makePayment());
    const service = new PaymentService(prisma as never);
    await service.delete(PAYMENT_ID, ACTOR_USER_ID);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDeleted: true, deletedDate: expect.any(Date) }),
      }),
    );
  });

  it('reverses credits by incrementing activator.credits', async () => {
    const prisma = buildPrisma();
    prisma.payment.findUnique.mockResolvedValue(makePayment());
    const service = new PaymentService(prisma as never);
    await service.delete(PAYMENT_ID, ACTOR_USER_ID);
    expect(prisma.activator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ credits: { increment: expect.any(Object) } }),
      }),
    );
  });

  it('logs DELETE_PAYMENT with actorUserId', async () => {
    const prisma = buildPrisma();
    prisma.payment.findUnique.mockResolvedValue(makePayment());
    const service = new PaymentService(prisma as never);
    await service.delete(PAYMENT_ID, ACTOR_USER_ID);
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: LogActionType.DELETE_PAYMENT,
          userId: ACTOR_USER_ID,
        }),
      }),
    );
  });
});
