import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin } from '../data/admin.factory';
import { seedActivator } from '../data/activator.factory';
import { seedPlan } from '../data/subscription-plan.factory';
import { seedSet } from '../data/set.factory';
import { seedLot } from '../data/lot.factory';
import { mintToken } from '../fixtures/auth.fixture';
import {
  UserRole,
  LOT_ROUTES,
  ErrorCode,
  LotStat,
  SetStat,
  LotResponseSchema,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';

const BASE = `/api/v1${LOT_ROUTES.BASE}`;
const SAMPLE_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

let seededUserIds: string[] = [];
let seededLotIds: string[] = [];
let seededSetIds: string[] = [];
let seededPlanIds: string[] = [];

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
  seededLotIds = [];
  seededSetIds = [];
  seededPlanIds = [];
});

afterEach(async () => {
  if (seededLotIds.length > 0) {
    await prisma.card.updateMany({ where: { lotId: { in: seededLotIds } }, data: { lotId: null, cardStat: 'PRINTED' } });
    await prisma.lot.deleteMany({ where: { id: { in: seededLotIds } } });
  }
  if (seededSetIds.length > 0) {
    await prisma.card.deleteMany({ where: { setId: { in: seededSetIds } } });
    await prisma.set.deleteMany({ where: { id: { in: seededSetIds } } });
  }
  if (seededPlanIds.length > 0) {
    await prisma.subscriptionPlan.deleteMany({ where: { id: { in: seededPlanIds } } });
  }
  if (seededUserIds.length > 0) {
    await prisma.log.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.activator.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.admin.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
  }
});

// ─── POST /lots (create) ─────────────────────────────────────────────────────

describe('POST /lots', () => {
  it('201 — creates lot, moves cards to IN_LOT, lot stat is PENDING', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_WEEK,
    });
    seededPlanIds.push(plan.id);
    const { set } = await seedSet(prisma, { plan, setStat: SetStat.PRINTED, printedAt: new Date() });
    seededSetIds.push(set.id);

    const cards = await prisma.card.createManyAndReturn({
      data: [
        { key: 'LOTTEST01', subscriptionPlanId: plan.id, setId: set.id, cardStat: 'PRINTED', isActive: false },
        { key: 'LOTTEST02', subscriptionPlanId: plan.id, setId: set.id, cardStat: 'PRINTED', isActive: false },
      ],
    });
    const cardIds = cards.map((c) => c.id);

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ subscriptionPlanId: plan.id, cardIds });

    if (res.body.data?.id) seededLotIds.push(res.body.data.id as string);

    expect(res.status).toBe(201);
    expect(() => LotResponseSchema.parse(res.body.data)).not.toThrow();
    expect(res.body.data.lotStat).toBe(LotStat.PENDING);
    expect(res.body.data.nbOfCards).toBe(2);

    const dbCards = await prisma.card.findMany({ where: { id: { in: cardIds } } });
    expect(dbCards.every((c) => c.cardStat === 'IN_LOT')).toBe(true);
    expect(dbCards.every((c) => c.lotId === res.body.data.id)).toBe(true);
  });

  it('400 — returns VALIDATION_ERROR for card not in PRINTED state', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.TWO_WEEK,
    });
    seededPlanIds.push(plan.id);
    const { set } = await seedSet(prisma, { plan, setStat: SetStat.NOT_PRINTED });
    seededSetIds.push(set.id);

    const card = await prisma.card.create({
      data: { key: 'INSET001X', subscriptionPlanId: plan.id, setId: set.id, cardStat: 'IN_SET', isActive: false },
    });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ subscriptionPlanId: plan.id, cardIds: [card.id] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);

    await prisma.card.delete({ where: { id: card.id } });
  });

  it('409 — returns RESOURCE_CONFLICT for already-assigned card', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.THREE_MONTH,
    });
    seededPlanIds.push(plan.id);
    const { set } = await seedSet(prisma, { plan, setStat: SetStat.PRINTED, printedAt: new Date() });
    seededSetIds.push(set.id);
    const { lot } = await seedLot(prisma, { plan, lotStat: LotStat.PENDING });
    seededLotIds.push(lot.id);

    const card = await prisma.card.create({
      data: { key: 'INLOT001X', subscriptionPlanId: plan.id, setId: set.id, cardStat: 'IN_LOT', isActive: false, lotId: lot.id },
    });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ subscriptionPlanId: plan.id, cardIds: [card.id] });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);

    await prisma.card.delete({ where: { id: card.id } });
  });

  it('403 — rejected for non-admin principal', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ subscriptionPlanId: SAMPLE_UUID, cardIds: [SAMPLE_UUID] });

    expect(res.status).toBe(403);
  });
});

// ─── GET /lots/available-for-order ───────────────────────────────────────────

describe('GET /lots/available-for-order', () => {
  it('200 — returns only PENDING and RETURNED lots', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { lot: pendingLot } = await seedLot(prisma, { lotStat: LotStat.PENDING });
    const { lot: returnedLot } = await seedLot(prisma, { lotStat: LotStat.RETURNED, isReturned: true });
    const { lot: deliveredLot } = await seedLot(prisma, { lotStat: LotStat.DELIVERED });
    seededLotIds.push(pendingLot.id, returnedLot.id, deliveredLot.id);

    const res = await request(app)
      .get(`${BASE}${LOT_ROUTES.GET_AVAILABLE_FOR_ORDER}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const ids = (res.body.data as Array<{ id: string }>).map((l) => l.id);
    expect(ids).toContain(pendingLot.id);
    expect(ids).toContain(returnedLot.id);
    expect(ids).not.toContain(deliveredLot.id);
  });
});

// ─── DELETE /lots/:id ─────────────────────────────────────────────────────────

describe('DELETE /lots/:id', () => {
  it('204 — deletes PENDING lot, reverts cards to PRINTED, writes REMOVE_LOT log', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_YEAR,
    });
    seededPlanIds.push(plan.id);
    const { set } = await seedSet(prisma, { plan, setStat: SetStat.PRINTED, printedAt: new Date() });
    seededSetIds.push(set.id);
    const { lot } = await seedLot(prisma, { plan, lotStat: LotStat.PENDING });
    seededLotIds.push(lot.id);

    const card = await prisma.card.create({
      data: { key: 'DELCARD01', subscriptionPlanId: plan.id, setId: set.id, cardStat: 'IN_LOT', isActive: false, lotId: lot.id },
    });

    const res = await request(app)
      .delete(`${BASE}/${lot.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const deletedLot = await prisma.lot.findUnique({ where: { id: lot.id } });
    expect(deletedLot).toBeNull();

    const revertedCard = await prisma.card.findUnique({ where: { id: card.id } });
    expect(revertedCard?.cardStat).toBe('PRINTED');
    expect(revertedCard?.lotId).toBeNull();

    const log = await prisma.log.findFirst({ where: { actionType: 'REMOVE_LOT', userId: user.id } });
    expect(log).not.toBeNull();

    await prisma.log.deleteMany({ where: { id: log!.id } });
    await prisma.card.delete({ where: { id: card.id } });
  });

  it('409 — cannot delete non-PENDING lot', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { lot } = await seedLot(prisma, { lotStat: LotStat.IN_DELIVERY });
    seededLotIds.push(lot.id);

    const res = await request(app)
      .delete(`${BASE}/${lot.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('404 — unknown lot id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .delete(`${BASE}/${SAMPLE_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });
});
