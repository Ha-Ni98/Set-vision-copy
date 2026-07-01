import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { OrderService } from '@modules/order/order.service';
import { DeliveryType, OrderStat } from '@my-app/contract';
import { ConflictError, NotFoundError, BadRequestError } from '@common/errors';
import { faker } from '@faker-js/faker';

function buildPrisma() {
  const p = {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orderLot: {
      createMany: vi.fn(),
    },
    lot: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    card: {
      updateMany: vi.fn(),
    },
    distributor: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deliveryCompany: {
      findUnique: vi.fn(),
    },
    commune: {
      findUnique: vi.fn(),
    },
    log: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<unknown>) => fn(p));
  return p;
}

function makeCreateCmd(overrides: Record<string, unknown> = {}) {
  return {
    distributorId: faker.string.uuid(),
    lotIds: [faker.string.uuid(), faker.string.uuid()],
    receivedName: 'John Doe',
    receivedPhone: '0612345678',
    wilayaId: faker.string.uuid(),
    communeId: faker.string.uuid(),
    deliveryCompanyId: faker.string.uuid(),
    deliveryType: DeliveryType.HOME,
    orderPrice: 500,
    deliverPrice: 50,
    ...overrides,
  };
}

function makeOrderWithJoins(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    orderNumber: 'ORD-20240601-AABBCC',
    distributorId: faker.string.uuid(),
    receivedName: 'John Doe',
    receivedPhone: '0612345678',
    wilayaId: faker.string.uuid(),
    communeId: faker.string.uuid(),
    deliveryCompanyId: faker.string.uuid(),
    deliveryType: 'HOME',
    orderPrice: new Prisma.Decimal(500),
    deliverPrice: new Prisma.Decimal(50),
    cardsDeliveredCount: 0,
    orderStat: 'PENDING_DELIVERY',
    createdAt: new Date(),
    completedAt: null,
    distributor: { storeName: 'Best Store' },
    wilaya: { frName: 'Alger' },
    commune: { frName: 'Bab El Oued' },
    deliveryCompany: { name: 'FastDel' },
    orderLots: [
      { lotId: faker.string.uuid(), lot: { lotNumber: 'LOT-001', nbOfCards: 10 } },
    ],
    ...overrides,
  };
}

let prisma: ReturnType<typeof buildPrisma>;
let service: OrderService;

beforeEach(() => {
  prisma = buildPrisma();
  service = new OrderService(prisma as never);
});

// ────────────────────────────────────────────────────────────────────────────────
// create
// ────────────────────────────────────────────────────────────────────────────────

describe('OrderService.create', () => {
  it('creates order and moves PENDING + RETURNED lots to IN_DELIVERY', async () => {
    const cmd = makeCreateCmd();
    const LOT_1 = cmd.lotIds[0]!;
    const LOT_2 = cmd.lotIds[1]!;
    const CREATED_ID = faker.string.uuid();

    prisma.distributor.findUnique.mockResolvedValue({ id: cmd.distributorId, storeName: 'Shop', isEnabled: true });
    prisma.deliveryCompany.findUnique.mockResolvedValue({ id: cmd.deliveryCompanyId, isActive: true });
    prisma.commune.findUnique.mockResolvedValue({ id: cmd.communeId, wilayaId: cmd.wilayaId });
    prisma.lot.findMany.mockResolvedValue([
      { id: LOT_1, lotStat: 'PENDING', nbOfCards: 10, isReturned: false },
      { id: LOT_2, lotStat: 'RETURNED', nbOfCards: 5, isReturned: true },
    ]);
    prisma.order.findUnique.mockResolvedValue(null); // unique number check
    prisma.order.create.mockResolvedValue({ id: CREATED_ID });
    prisma.orderLot.createMany.mockResolvedValue({ count: 2 });
    prisma.lot.updateMany.mockResolvedValue({ count: 2 });
    prisma.order.findUniqueOrThrow.mockResolvedValue(makeOrderWithJoins({ id: CREATED_ID, orderStat: 'PENDING_DELIVERY' }));

    const dto = await service.create(cmd);

    expect(prisma.lot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lotStat: 'IN_DELIVERY' } }),
    );
    expect(prisma.orderLot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([{ orderId: CREATED_ID, lotId: LOT_1 }]) }),
    );
    expect(dto.orderStat).toBe(OrderStat.PENDING_DELIVERY);
  });

  it('throws ConflictError if a lot is IN_DELIVERY', async () => {
    const cmd = makeCreateCmd();
    prisma.distributor.findUnique.mockResolvedValue({ id: cmd.distributorId, isEnabled: true });
    prisma.deliveryCompany.findUnique.mockResolvedValue({ isActive: true });
    prisma.commune.findUnique.mockResolvedValue({ wilayaId: cmd.wilayaId });
    prisma.lot.findMany.mockResolvedValue([
      { id: cmd.lotIds[0], lotStat: 'IN_DELIVERY', nbOfCards: 10, isReturned: false },
      { id: cmd.lotIds[1], lotStat: 'PENDING', nbOfCards: 5, isReturned: false },
    ]);

    await expect(service.create(cmd)).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError if a lot is DELIVERED', async () => {
    const cmd = makeCreateCmd();
    prisma.distributor.findUnique.mockResolvedValue({ id: cmd.distributorId, isEnabled: true });
    prisma.deliveryCompany.findUnique.mockResolvedValue({ isActive: true });
    prisma.commune.findUnique.mockResolvedValue({ wilayaId: cmd.wilayaId });
    prisma.lot.findMany.mockResolvedValue([
      { id: cmd.lotIds[0], lotStat: 'DELIVERED', nbOfCards: 10, isReturned: false },
      { id: cmd.lotIds[1], lotStat: 'PENDING', nbOfCards: 5, isReturned: false },
    ]);

    await expect(service.create(cmd)).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws BadRequestError when commune does not belong to wilaya', async () => {
    const cmd = makeCreateCmd();
    prisma.distributor.findUnique.mockResolvedValue({ id: cmd.distributorId, isEnabled: true });
    prisma.deliveryCompany.findUnique.mockResolvedValue({ isActive: true });
    prisma.commune.findUnique.mockResolvedValue({ wilayaId: faker.string.uuid() }); // different wilaya

    await expect(service.create(cmd)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('throws NotFoundError when distributor not found', async () => {
    const cmd = makeCreateCmd();
    prisma.distributor.findUnique.mockResolvedValue(null);

    await expect(service.create(cmd)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws BadRequestError when distributor is disabled', async () => {
    const cmd = makeCreateCmd();
    prisma.distributor.findUnique.mockResolvedValue({ id: cmd.distributorId, isEnabled: false });

    await expect(service.create(cmd)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('writes no Log on successful create', async () => {
    const cmd = makeCreateCmd();
    const CREATED_ID = faker.string.uuid();
    prisma.distributor.findUnique.mockResolvedValue({ id: cmd.distributorId, isEnabled: true });
    prisma.deliveryCompany.findUnique.mockResolvedValue({ isActive: true });
    prisma.commune.findUnique.mockResolvedValue({ wilayaId: cmd.wilayaId });
    prisma.lot.findMany.mockResolvedValue([
      { id: cmd.lotIds[0], lotStat: 'PENDING', nbOfCards: 10, isReturned: false },
      { id: cmd.lotIds[1], lotStat: 'PENDING', nbOfCards: 5, isReturned: false },
    ]);
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.order.create.mockResolvedValue({ id: CREATED_ID });
    prisma.orderLot.createMany.mockResolvedValue({ count: 2 });
    prisma.lot.updateMany.mockResolvedValue({ count: 2 });
    prisma.order.findUniqueOrThrow.mockResolvedValue(makeOrderWithJoins({ id: CREATED_ID }));

    await service.create(cmd);

    expect(prisma.log.create).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// transition
// ────────────────────────────────────────────────────────────────────────────────

describe('OrderService.transition', () => {
  it('PENDING_DELIVERY → IN_DELIVERY updates only orderStat', async () => {
    const ORDER_ID = faker.string.uuid();
    const order = { id: ORDER_ID, distributorId: faker.string.uuid(), orderStat: 'PENDING_DELIVERY', orderLots: [] };
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.order.update.mockResolvedValue({ id: ORDER_ID });
    prisma.order.findUniqueOrThrow.mockResolvedValue(makeOrderWithJoins({ id: ORDER_ID, orderStat: 'IN_DELIVERY' }));

    await service.transition(ORDER_ID, { to: OrderStat.IN_DELIVERY });

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { orderStat: 'IN_DELIVERY' } }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('IN_DELIVERY → DELIVERED cascades cards to AT_DISTRIBUTOR and bumps nbOfActiveCards', async () => {
    const ORDER_ID = faker.string.uuid();
    const DIST_ID = faker.string.uuid();
    const LOT_ID = faker.string.uuid();

    const order = {
      id: ORDER_ID,
      distributorId: DIST_ID,
      orderStat: 'IN_DELIVERY',
      orderLots: [{ lotId: LOT_ID, lot: { nbOfCards: 15 } }],
    };
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.order.update.mockResolvedValue({});
    prisma.lot.updateMany.mockResolvedValue({ count: 1 });
    prisma.card.updateMany.mockResolvedValue({ count: 15 });
    prisma.distributor.update.mockResolvedValue({});
    prisma.order.findUniqueOrThrow.mockResolvedValue(
      makeOrderWithJoins({ id: ORDER_ID, orderStat: 'DELIVERED', cardsDeliveredCount: 15 }),
    );

    await service.transition(ORDER_ID, { to: OrderStat.DELIVERED });

    expect(prisma.card.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cardStat: 'AT_DISTRIBUTOR', isActive: true, distributorId: DIST_ID }),
      }),
    );
    expect(prisma.distributor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nbOfActiveCards: { increment: 15 } } }),
    );
  });

  it('IN_DELIVERY → DELIVERED uses deliveredCount when provided', async () => {
    const ORDER_ID = faker.string.uuid();
    const order = {
      id: ORDER_ID,
      distributorId: faker.string.uuid(),
      orderStat: 'IN_DELIVERY',
      orderLots: [
        { lotId: faker.string.uuid(), lot: { nbOfCards: 10 } },
        { lotId: faker.string.uuid(), lot: { nbOfCards: 5 } },
      ],
    };
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.order.update.mockResolvedValue({});
    prisma.lot.updateMany.mockResolvedValue({ count: 2 });
    prisma.card.updateMany.mockResolvedValue({ count: 12 });
    prisma.distributor.update.mockResolvedValue({});
    prisma.order.findUniqueOrThrow.mockResolvedValue(
      makeOrderWithJoins({ id: ORDER_ID, orderStat: 'DELIVERED', cardsDeliveredCount: 12 }),
    );

    await service.transition(ORDER_ID, { to: OrderStat.DELIVERED, deliveredCount: 12 });

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cardsDeliveredCount: 12 }) }),
    );
  });

  it('IN_DELIVERY → RETURNED moves lots to RETURNED+isReturned and does NOT update cards', async () => {
    const ORDER_ID = faker.string.uuid();
    const LOT_ID = faker.string.uuid();

    const order = {
      id: ORDER_ID,
      distributorId: faker.string.uuid(),
      orderStat: 'IN_DELIVERY',
      orderLots: [{ lotId: LOT_ID, lot: { nbOfCards: 10 } }],
    };
    prisma.order.findUnique.mockResolvedValue(order);
    prisma.order.update.mockResolvedValue({});
    prisma.lot.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.findUniqueOrThrow.mockResolvedValue(
      makeOrderWithJoins({ id: ORDER_ID, orderStat: 'RETURNED' }),
    );

    await service.transition(ORDER_ID, { to: OrderStat.RETURNED });

    expect(prisma.lot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lotStat: 'RETURNED', isReturned: true } }),
    );
    expect(prisma.card.updateMany).not.toHaveBeenCalled();
  });

  it('throws ConflictError for illegal transition (PENDING_DELIVERY → DELIVERED)', async () => {
    const ORDER_ID = faker.string.uuid();
    prisma.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      orderStat: 'PENDING_DELIVERY',
      orderLots: [],
    });

    await expect(service.transition(ORDER_ID, { to: OrderStat.DELIVERED })).rejects.toBeInstanceOf(ConflictError);
  });

  it('writes no Log on any transition', async () => {
    const ORDER_ID = faker.string.uuid();
    prisma.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      distributorId: faker.string.uuid(),
      orderStat: 'PENDING_DELIVERY',
      orderLots: [],
    });
    prisma.order.update.mockResolvedValue({});
    prisma.order.findUniqueOrThrow.mockResolvedValue(makeOrderWithJoins({ id: ORDER_ID, orderStat: 'IN_DELIVERY' }));

    await service.transition(ORDER_ID, { to: OrderStat.IN_DELIVERY });

    expect(prisma.log.create).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// delete
// ────────────────────────────────────────────────────────────────────────────────

describe('OrderService.delete', () => {
  it('reverts normal lots to PENDING and isReturned lots to RETURNED, then deletes order', async () => {
    const ORDER_ID = faker.string.uuid();
    const NORMAL_LOT = faker.string.uuid();
    const RETURNED_LOT = faker.string.uuid();

    prisma.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      orderStat: 'PENDING_DELIVERY',
      orderLots: [
        { lotId: NORMAL_LOT, lot: { isReturned: false } },
        { lotId: RETURNED_LOT, lot: { isReturned: true } },
      ],
    });
    prisma.lot.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.delete.mockResolvedValue({});

    await service.delete(ORDER_ID);

    const updateManyCalls = prisma.lot.updateMany.mock.calls as Array<[{ where: { id: { in: string[] } }; data: { lotStat: string } }]>;
    const pendingCall = updateManyCalls.find((c) => c[0].data.lotStat === 'PENDING');
    const returnedCall = updateManyCalls.find((c) => c[0].data.lotStat === 'RETURNED');

    expect(pendingCall?.[0].where.id.in).toContain(NORMAL_LOT);
    expect(returnedCall?.[0].where.id.in).toContain(RETURNED_LOT);
    expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: ORDER_ID } });
  });

  it('throws ConflictError when deleting a non-PENDING_DELIVERY order', async () => {
    const ORDER_ID = faker.string.uuid();
    prisma.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      orderStat: 'IN_DELIVERY',
      orderLots: [],
    });

    await expect(service.delete(ORDER_ID)).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws NotFoundError for unknown order', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(service.delete(faker.string.uuid())).rejects.toBeInstanceOf(NotFoundError);
  });

  it('writes no Log on delete', async () => {
    const ORDER_ID = faker.string.uuid();
    prisma.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      orderStat: 'PENDING_DELIVERY',
      orderLots: [{ lotId: faker.string.uuid(), lot: { isReturned: false } }],
    });
    prisma.lot.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.delete.mockResolvedValue({});

    await service.delete(ORDER_ID);

    expect(prisma.log.create).not.toHaveBeenCalled();
  });
});
