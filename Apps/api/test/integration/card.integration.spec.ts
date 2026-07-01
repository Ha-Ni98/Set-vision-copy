import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin } from '../data/admin.factory';
import { seedActivator } from '../data/activator.factory';
import { seedCard } from '../data/card.factory';
import { seedDistributor } from '../data/distributor.factory';
import { seedPlan } from '../data/subscription-plan.factory';
import { mintToken } from '../fixtures/auth.fixture';
import {
  UserRole,
  CARD_ROUTES,
  ErrorCode,
  CardStat,
  CardResponseSchema,
  CardDetailResponseSchema,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';

const BASE = `/api/v1${CARD_ROUTES.BASE}`;
const SAMPLE_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

let seededUserIds: string[] = [];
let seededSetIds: string[] = [];
let seededDistributorIds: string[] = [];

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
  seededDistributorIds = [];
});

afterEach(async () => {
  if (seededSetIds.length > 0) {
    // Hard-delete all cards in seeded sets (incl. soft-deleted) then the sets
    await prisma.card.deleteMany({ where: { setId: { in: seededSetIds } } });
    await prisma.set.deleteMany({ where: { id: { in: seededSetIds } } });
  }
  if (seededDistributorIds.length > 0) {
    await prisma.distributor.deleteMany({ where: { id: { in: seededDistributorIds } } });
  }
  if (seededUserIds.length > 0) {
    await prisma.log.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.activator.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.admin.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
  }
});

// ─── GET /cards ───────────────────────────────────────────────────────────────

describe('GET /cards', () => {
  it('200 — returns paginated list to admin', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma);
    seededSetIds.push(set.id);

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('meta');
    const ids = (res.body.data.items as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toContain(card.id);
  });

  it('200 — flag=disabled returns only disabled cards', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    });
    const { card: normalCard, set: set1 } = await seedCard(prisma, { plan });
    const { card: disabledCard, set: set2 } = await seedCard(prisma, {
      plan,
      cardStat: CardStat.IN_LOT,
      isDisabled: true,
    });
    seededSetIds.push(set1.id, set2.id);

    const res = await request(app)
      .get(BASE)
      .query({ flag: 'disabled' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const ids = (res.body.data.items as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toContain(disabledCard.id);
    expect(ids).not.toContain(normalCard.id);
  });

  it('403 — rejected for non-admin principal', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });
});

// ─── GET /cards/available-for-lot ────────────────────────────────────────────

describe('GET /cards/available-for-lot', () => {
  it('200 — returns only PRINTED, unassigned, non-disabled cards for given plan', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    });
    const { card: printedCard, set: set1 } = await seedCard(prisma, { plan, cardStat: CardStat.PRINTED });
    const { set: set2 } = await seedCard(prisma, { plan, cardStat: CardStat.IN_LOT });
    const { set: set3 } = await seedCard(prisma, { plan, cardStat: CardStat.PRINTED, isDisabled: true });
    seededSetIds.push(set1.id, set2.id, set3.id);

    const res = await request(app)
      .get(`${BASE}${CARD_ROUTES.GET_AVAILABLE_FOR_LOT}`)
      .query({ subscriptionPlanId: plan.id })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = (res.body.data as Array<{ id: string }>).map((c) => c.id);
    expect(ids).toContain(printedCard.id);
    expect(ids).toHaveLength(1);
  });

  it('200 — resolves before /:id param route (static-before-param)', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const plan = await seedPlan(prisma, {
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    });

    // If the route was NOT registered before /:id, Express would try to find
    // a card with id='available-for-lot' and return 400/404 instead of 200.
    const res = await request(app)
      .get(`${BASE}${CARD_ROUTES.GET_AVAILABLE_FOR_LOT}`)
      .query({ subscriptionPlanId: plan.id })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

// ─── GET /cards/:id ───────────────────────────────────────────────────────────

describe('GET /cards/:id', () => {
  it('200 — returns CardDetailDTO with distributionTimeline', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma);
    seededSetIds.push(set.id);

    const res = await request(app)
      .get(`${BASE}/${card.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(() => CardDetailResponseSchema.parse(res.body.data)).not.toThrow();
    expect(Array.isArray(res.body.data.distributionTimeline)).toBe(true);
    expect(res.body.data.distributionTimeline[0].stat).toBe(CardStat.IN_SET);
  });

  it('404 — unknown id returns RESOURCE_NOT_FOUND', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}/${SAMPLE_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });
});

// ─── DELETE /cards/:id ────────────────────────────────────────────────────────

describe('DELETE /cards/:id', () => {
  it('204 — soft-deletes IN_SET card', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma, { cardStat: CardStat.IN_SET });
    seededSetIds.push(set.id);

    const res = await request(app)
      .delete(`${BASE}/${card.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    // Soft-delete: card still exists in DB with deletedAt set
    const db = await prisma.card.findUnique({ where: { id: card.id } });
    expect(db).not.toBeNull();
    expect(db!.deletedAt).not.toBeNull();
  });

  it('204 — soft-deletes PRINTED card', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma, { cardStat: CardStat.PRINTED });
    seededSetIds.push(set.id);

    const res = await request(app)
      .delete(`${BASE}/${card.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it('409 — RESOURCE_CONFLICT for IN_LOT card', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma, { cardStat: CardStat.IN_LOT });
    seededSetIds.push(set.id);

    const res = await request(app)
      .delete(`${BASE}/${card.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

// ─── POST /cards/:id/disable ─────────────────────────────────────────────────

describe('POST /cards/:id/disable', () => {
  it('200 — disables AT_DISTRIBUTOR card and decrements distributor.nbOfActiveCards', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { distributor } = await seedDistributor(prisma, { nbOfActiveCards: 1 });
    seededDistributorIds.push(distributor.id);
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      distributorId: distributor.id,
      isActive: true,
    });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${BASE}/${card.id}/disable`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(() => CardResponseSchema.parse(res.body.data)).not.toThrow();
    expect(res.body.data.isDisabled).toBe(true);
    expect(res.body.data.isActive).toBe(false);

    const dbDist = await prisma.distributor.findUnique({ where: { id: distributor.id } });
    expect(dbDist!.nbOfActiveCards).toBe(0);
  });

  it('409 — RESOURCE_CONFLICT when card is already disabled', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma, { cardStat: CardStat.IN_LOT, isDisabled: true });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${BASE}/${card.id}/disable`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

// ─── POST /cards/:id/enable ──────────────────────────────────────────────────

describe('POST /cards/:id/enable', () => {
  it('200 — enables disabled card, sets AT_DISTRIBUTOR, increments nbOfActiveCards', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { distributor } = await seedDistributor(prisma, { nbOfActiveCards: 0 });
    seededDistributorIds.push(distributor.id);
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      distributorId: distributor.id,
      isDisabled: true,
      isActive: false,
    });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${BASE}/${card.id}/enable`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isDisabled).toBe(false);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.cardStat).toBe(CardStat.AT_DISTRIBUTOR);

    const dbDist = await prisma.distributor.findUnique({ where: { id: distributor.id } });
    expect(dbDist!.nbOfActiveCards).toBe(1);
  });

  it('409 — RESOURCE_CONFLICT when card is not disabled', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma, { isDisabled: false });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${BASE}/${card.id}/enable`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

// ─── POST /cards/:id/revoke ───────────────────────────────────────────────────

describe('POST /cards/:id/revoke', () => {
  it('200 — revokes ACTIVATION_FAILED card, sets AT_DISTRIBUTOR, increments nbOfActiveCards', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { distributor } = await seedDistributor(prisma, { nbOfActiveCards: 0 });
    seededDistributorIds.push(distributor.id);
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.ACTIVATION_FAILED,
      distributorId: distributor.id,
      isActive: false,
      isDisabled: false,
    });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${BASE}/${card.id}/revoke`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRevoked).toBe(true);
    expect(res.body.data.cardStat).toBe(CardStat.AT_DISTRIBUTOR);

    const dbDist = await prisma.distributor.findUnique({ where: { id: distributor.id } });
    expect(dbDist!.nbOfActiveCards).toBe(1);
  });

  it('409 — RESOURCE_CONFLICT for non-ACTIVATION_FAILED state', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { card, set } = await seedCard(prisma, { cardStat: CardStat.AT_DISTRIBUTOR, isDisabled: false });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${BASE}/${card.id}/revoke`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});
