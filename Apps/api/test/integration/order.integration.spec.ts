import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin } from '../data/admin.factory';
import { seedActivator } from '../data/activator.factory';
import { seedPlan } from '../data/subscription-plan.factory';
import { seedSet } from '../data/set.factory';
import { seedLot } from '../data/lot.factory';
import { seedOrder } from '../data/order.factory';
import { mintToken } from '../fixtures/auth.fixture';
import {
  UserRole,
  ORDER_ROUTES,
  ErrorCode,
  OrderStat,
  LotStat,
  SetStat,
  OrderResponseSchema,
  OrderDetailResponseSchema,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';

const BASE = `/api/v1${ORDER_ROUTES.BASE}`;
const SAMPLE_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

let seededUserIds: string[] = [];
let seededOrderIds: string[] = [];
let seededLotIds: string[] = [];
let seededSetIds: string[] = [];

async function seedAdm() {
  const result = await seedAdmin(prisma);
  seededUserIds.push(result.user.id);
  return result;
}

async function seedAct() {
  const result = await seedActivator(prisma);
  seededUserIds.push(result.user.id);
  return result;
}

beforeEach(() => {
  seededUserIds = [];
  seededOrderIds = [];
  seededLotIds = [];
  seededSetIds = [];
});

afterEach(async () => {
  if (seededOrderIds.length > 0) {
    // OrderLot cascades from Order; revert card stats first
    const orderLots = await prisma.orderLot.findMany({
      where: { orderId: { in: seededOrderIds } },
      select: { lotId: true },
    });
    const lotIds = orderLots.map((ol) => ol.lotId);
    if (lotIds.length > 0) {
      await prisma.card.updateMany({
        where: { lotId: { in: lotIds } },
        data: { cardStat: 'PRINTED', lotId: null, distributorId: null, isActive: false },
      });
      await prisma.lot.updateMany({ where: { id: { in: lotIds } }, data: { lotStat: 'PENDING', deliveryDate: null, isReturned: false } });
    }
    await prisma.order.deleteMany({ where: { id: { in: seededOrderIds } } });
  }
  if (seededLotIds.length > 0) {
    await prisma.lot.deleteMany({ where: { id: { in: seededLotIds } } });
  }
  if (seededSetIds.length > 0) {
    await prisma.card.deleteMany({ where: { setId: { in: seededSetIds } } });
    await prisma.set.deleteMany({ where: { id: { in: seededSetIds } } });
  }
  if (seededUserIds.length > 0) {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.activator.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.admin.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
  }
});

// ─── POST /orders (create) ───────────────────────────────────────────────────

describe('POST /orders', () => {
  it('201 — creates order from PENDING + RETURNED lots; lots move to IN_DELIVERY', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    });
    const { lot: pendingLot } = await seedLot(prisma, { plan, lotStat: LotStat.PENDING });
    const { lot: returnedLot } = await seedLot(prisma, { plan, lotStat: LotStat.RETURNED, isReturned: true });
    seededLotIds.push(pendingLot.id, returnedLot.id);

    const { distributor, wilaya, commune, deliveryCompany } = await seedOrder(prisma, { lotIds: [] });
    // We only need the geographic/delivery refs; that seededOrder will be cleaned up
    // via the seededOrderIds mechanism if we push it, but here we just want the stubs.
    // Use the lot factory's data for the actual order:

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        distributorId: distributor.id,
        lotIds: [pendingLot.id, returnedLot.id],
        receivedName: 'John Doe',
        receivedPhone: '0612345678',
        wilayaId: wilaya.id,
        communeId: commune.id,
        deliveryCompanyId: deliveryCompany.id,
        deliveryType: 'HOME',
        orderPrice: 500,
        deliverPrice: 50,
      });

    if (res.body.data?.id) seededOrderIds.push(res.body.data.id as string);

    expect(res.status).toBe(201);
    expect(() => OrderResponseSchema.parse(res.body.data)).not.toThrow();
    expect(res.body.data.orderStat).toBe(OrderStat.PENDING_DELIVERY);

    const dbLots = await prisma.lot.findMany({ where: { id: { in: [pendingLot.id, returnedLot.id] } } });
    expect(dbLots.every((l) => l.lotStat === 'IN_DELIVERY')).toBe(true);
  });

  it('409 — returns RESOURCE_CONFLICT when a lot is already IN_DELIVERY', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { lot: inDeliveryLot } = await seedLot(prisma, { lotStat: LotStat.IN_DELIVERY });
    seededLotIds.push(inDeliveryLot.id);

    const { distributor, wilaya, commune, deliveryCompany } = await seedOrder(prisma, { lotIds: [] });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        distributorId: distributor.id,
        lotIds: [inDeliveryLot.id],
        receivedName: 'Jane Doe',
        receivedPhone: '0612345678',
        wilayaId: wilaya.id,
        communeId: commune.id,
        deliveryCompanyId: deliveryCompany.id,
        deliveryType: 'HOME',
        orderPrice: 500,
        deliverPrice: 50,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('403 — rejected for non-admin principal', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({
        distributorId: SAMPLE_UUID,
        lotIds: [SAMPLE_UUID],
        receivedName: 'X',
        receivedPhone: '0600000000',
        wilayaId: SAMPLE_UUID,
        communeId: SAMPLE_UUID,
        deliveryCompanyId: SAMPLE_UUID,
        deliveryType: 'HOME',
        orderPrice: 100,
        deliverPrice: 10,
      });

    expect(res.status).toBe(403);
  });
});

// ─── GET /orders/:id (getById) ───────────────────────────────────────────────

describe('GET /orders/:id', () => {
  it('200 — returns OrderDetailDTO with lots breakdown', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    });
    const { lot } = await seedLot(prisma, { plan, lotStat: LotStat.PENDING });
    seededLotIds.push(lot.id);

    const { order, distributor, wilaya, commune, deliveryCompany } = await seedOrder(prisma, {
      lotIds: [lot.id],
    });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .get(`${BASE}/${order.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(() => OrderDetailResponseSchema.parse(res.body.data)).not.toThrow();
    expect(res.body.data.lots).toHaveLength(1);
    expect(res.body.data.distributorName).toBe(distributor.storeName);
  });

  it('404 — unknown order id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}/${SAMPLE_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });
});

// ─── GET /orders (getAll) ────────────────────────────────────────────────────

describe('GET /orders', () => {
  it('200 — returns paginated orders', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { order } = await seedOrder(prisma, { lotIds: [] });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('meta');
  });

  it('403 — rejected for non-admin principal', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /orders/:id/transition ─────────────────────────────────────────────

describe('POST /orders/:id/transition', () => {
  it('200 — PENDING_DELIVERY → IN_DELIVERY', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { lot } = await seedLot(prisma, { lotStat: LotStat.PENDING });
    seededLotIds.push(lot.id);
    const { order } = await seedOrder(prisma, { lotIds: [lot.id] });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .post(`${BASE}/${order.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: OrderStat.IN_DELIVERY });

    expect(res.status).toBe(200);
    expect(res.body.data.orderStat).toBe(OrderStat.IN_DELIVERY);
  });

  it('200 — IN_DELIVERY → DELIVERED cascades cards to AT_DISTRIBUTOR and bumps nbOfActiveCards', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_WEEK,
    });
    const { set } = await seedSet(prisma, { plan, setStat: SetStat.PRINTED, printedAt: new Date() });
    seededSetIds.push(set.id);
    const { lot } = await seedLot(prisma, { plan, lotStat: LotStat.IN_DELIVERY });
    seededLotIds.push(lot.id);

    const card = await prisma.card.create({
      data: {
        key: 'ORDTEST01',
        subscriptionPlanId: plan.id,
        setId: set.id,
        cardStat: 'IN_LOT',
        isActive: false,
        lotId: lot.id,
      },
    });

    const { order, distributor } = await seedOrder(prisma, {
      orderStat: OrderStat.IN_DELIVERY,
      lotIds: [lot.id],
    });
    seededOrderIds.push(order.id);

    const beforeDist = await prisma.distributor.findUnique({ where: { id: distributor.id } });

    const res = await request(app)
      .post(`${BASE}/${order.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: OrderStat.DELIVERED });

    expect(res.status).toBe(200);
    expect(res.body.data.orderStat).toBe(OrderStat.DELIVERED);

    const updatedCard = await prisma.card.findUnique({ where: { id: card.id } });
    expect(updatedCard?.cardStat).toBe('AT_DISTRIBUTOR');
    expect(updatedCard?.isActive).toBe(true);
    expect(updatedCard?.distributorId).toBe(distributor.id);

    const afterDist = await prisma.distributor.findUnique({ where: { id: distributor.id } });
    expect((afterDist?.nbOfActiveCards ?? 0)).toBeGreaterThan(beforeDist?.nbOfActiveCards ?? 0);
  });

  it('200 — IN_DELIVERY → RETURNED reverts lots to RETURNED and keeps cards IN_LOT', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { lot } = await seedLot(prisma, { lotStat: LotStat.IN_DELIVERY });
    seededLotIds.push(lot.id);
    const { order } = await seedOrder(prisma, { orderStat: OrderStat.IN_DELIVERY, lotIds: [lot.id] });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .post(`${BASE}/${order.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: OrderStat.RETURNED });

    expect(res.status).toBe(200);
    expect(res.body.data.orderStat).toBe(OrderStat.RETURNED);

    const updatedLot = await prisma.lot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.lotStat).toBe('RETURNED');
    expect(updatedLot?.isReturned).toBe(true);
  });

  it('409 — illegal transition (PENDING_DELIVERY → DELIVERED)', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { lot } = await seedLot(prisma, { lotStat: LotStat.IN_DELIVERY });
    seededLotIds.push(lot.id);
    const { order } = await seedOrder(prisma, { lotIds: [lot.id] });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .post(`${BASE}/${order.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: OrderStat.DELIVERED });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

// ─── DELETE /orders/:id ───────────────────────────────────────────────────────

describe('DELETE /orders/:id', () => {
  it('204 — deletes PENDING_DELIVERY order and reverts lots', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { lot } = await seedLot(prisma, { lotStat: LotStat.IN_DELIVERY });
    seededLotIds.push(lot.id);
    const { order } = await seedOrder(prisma, { lotIds: [lot.id] });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .delete(`${BASE}/${order.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const deletedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(deletedOrder).toBeNull();

    const revertedLot = await prisma.lot.findUnique({ where: { id: lot.id } });
    expect(revertedLot?.lotStat).toBe('PENDING');
  });

  it('409 — cannot delete order not in PENDING_DELIVERY', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { lot } = await seedLot(prisma, { lotStat: LotStat.IN_DELIVERY });
    seededLotIds.push(lot.id);
    const { order } = await seedOrder(prisma, { orderStat: OrderStat.IN_DELIVERY, lotIds: [lot.id] });
    seededOrderIds.push(order.id);

    const res = await request(app)
      .delete(`${BASE}/${order.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('404 — unknown order id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .delete(`${BASE}/${SAMPLE_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
