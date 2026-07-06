import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin } from '../data/admin.factory';
import { seedActivator } from '../data/activator.factory';
import { seedPlan } from '../data/subscription-plan.factory';
import { seedSet } from '../data/set.factory';
import { seedCard } from '../data/card.factory';
import { mintToken } from '../fixtures/auth.fixture';
import {
  UserRole,
  SET_ROUTES,
  ErrorCode,
  SetStat,
  SetResponseSchema,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';

const BASE = `/api/v1${SET_ROUTES.BASE}`;
const SAMPLE_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

let seededUserIds: string[] = [];
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
  seededSetIds = [];
  seededPlanIds = [];
});

afterEach(async () => {
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

// ─── POST /sets (create) ─────────────────────────────────────────────────────

describe('POST /sets', () => {
  it('201 — creates a set from the provided keys as IN_SET cards', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_WEEK,
    });
    seededPlanIds.push(plan.id);

    const keys = ['A1A1A1A1', 'B2B2B2B2', 'C3C3C3C3'];
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ keys, subscriptionPlanId: plan.id });

    if (res.body.data?.id) seededSetIds.push(res.body.data.id as string);

    expect(res.status).toBe(201);
    expect(() => SetResponseSchema.parse(res.body.data)).not.toThrow();
    expect(res.body.data.setStat).toBe(SetStat.NOT_PRINTED);
    expect(res.body.data.numberOfKeys).toBe(3);

    const cards = await prisma.card.findMany({ where: { setId: res.body.data.id } });
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.key))).toEqual(new Set(keys));
    expect(cards.every((c) => c.cardStat === 'IN_SET')).toBe(true);
    expect(cards.every((c) => c.isActive === false)).toBe(true);
  });

  it('409 — RESOURCE_CONFLICT when a provided key already exists, listing it', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma, {});
    seededSetIds.push(set.id);
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_WEEK,
    });
    seededPlanIds.push(plan.id);

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ keys: ['D4D4D4D4', card.key], subscriptionPlanId: plan.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
    expect(res.body.error.details.takenKeys).toContain(card.key);
  });

  it('400 — VALIDATION_ERROR for a malformed key', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_DAY,
    });
    seededPlanIds.push(plan.id);

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ keys: ['not-a-valid-key'], subscriptionPlanId: plan.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('400 — returns VALIDATION_ERROR for inactive plan', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_DAY,
      isActive: false,
    });
    seededPlanIds.push(plan.id);

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ keys: ['E5E5E5E5', 'F6F6F6F6'], subscriptionPlanId: plan.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('403 — rejected for non-admin (activator) principal', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.TWO_WEEK,
    });
    seededPlanIds.push(plan.id);

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ keys: ['0A0A0A0A'], subscriptionPlanId: plan.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });
});

// ─── GET /sets ────────────────────────────────────────────────────────────────

describe('GET /sets', () => {
  it('200 — returns paginated list', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { set } = await seedSet(prisma);
    seededSetIds.push(set.id);

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.meta.total).toBe('number');
  });

  it('200 — filters by state', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { set } = await seedSet(prisma, { setStat: SetStat.NOT_PRINTED });
    seededSetIds.push(set.id);

    const res = await request(app)
      .get(`${BASE}?state=${SetStat.NOT_PRINTED}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const ids = (res.body.data.items as Array<{ id: string }>).map((s) => s.id);
    expect(ids).toContain(set.id);
  });
});

// ─── POST /sets/:id/transition ────────────────────────────────────────────────

describe('POST /sets/:id/transition', () => {
  it('200 — transitions NOT_PRINTED → PENDING_PRINTING', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { set } = await seedSet(prisma, { setStat: SetStat.NOT_PRINTED });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${BASE}/${set.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: SetStat.PENDING_PRINTING });

    expect(res.status).toBe(200);
    expect(res.body.data.setStat).toBe(SetStat.PENDING_PRINTING);
  });

  it('200 — transitions PENDING_PRINTING → PRINTED and cascades cards', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { set } = await seedSet(prisma, { setStat: SetStat.PENDING_PRINTING, numberOfKeys: 2 });
    seededSetIds.push(set.id);
    await prisma.card.createMany({
      data: [
        { key: 'CARD001AA', subscriptionPlanId: set.subscriptionPlanId, setId: set.id, cardStat: 'IN_SET', isActive: false },
        { key: 'CARD002BB', subscriptionPlanId: set.subscriptionPlanId, setId: set.id, cardStat: 'IN_SET', isActive: false },
      ],
    });

    const res = await request(app)
      .post(`${BASE}/${set.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: SetStat.PRINTED });

    expect(res.status).toBe(200);
    expect(res.body.data.setStat).toBe(SetStat.PRINTED);
    expect(res.body.data.printedAt).not.toBeNull();

    const cards = await prisma.card.findMany({ where: { setId: set.id } });
    expect(cards.every((c) => c.cardStat === 'PRINTED')).toBe(true);
  });

  it('409 — illegal transition returns RESOURCE_CONFLICT', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { set } = await seedSet(prisma, { setStat: SetStat.PRINTED, printedAt: new Date() });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${BASE}/${set.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: SetStat.PENDING_PRINTING });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('404 — unknown set id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(`${BASE}/${SAMPLE_UUID}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: SetStat.PENDING_PRINTING });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });
});

// ─── DELETE /sets/:id ─────────────────────────────────────────────────────────

describe('DELETE /sets/:id', () => {
  it('204 — deletes NOT_PRINTED set and its cards, writes REMOVE_SET log', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { set } = await seedSet(prisma, { setStat: SetStat.NOT_PRINTED });
    seededSetIds.push(set.id);
    await prisma.card.create({
      data: { key: 'DELTEST01', subscriptionPlanId: set.subscriptionPlanId, setId: set.id, cardStat: 'IN_SET', isActive: false },
    });

    const res = await request(app)
      .delete(`${BASE}/${set.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const remaining = await prisma.card.findMany({ where: { setId: set.id } });
    expect(remaining).toHaveLength(0);

    const deletedSet = await prisma.set.findUnique({ where: { id: set.id } });
    expect(deletedSet).toBeNull();

    const log = await prisma.log.findFirst({
      where: { actionType: 'REMOVE_SET', userId: user.id },
    });
    expect(log).not.toBeNull();
    await prisma.log.deleteMany({ where: { id: log!.id } });
  });

  it('409 — cannot delete PRINTED set', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { set } = await seedSet(prisma, { setStat: SetStat.PRINTED, printedAt: new Date() });
    seededSetIds.push(set.id);

    const res = await request(app)
      .delete(`${BASE}/${set.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('404 — unknown set id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .delete(`${BASE}/${SAMPLE_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });
});
