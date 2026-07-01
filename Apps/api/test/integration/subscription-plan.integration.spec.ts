import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedPlan } from '../data/subscription-plan.factory';
import { seedCommissionDuration, seedCommissionCell } from '../data/subscription-plan-commission.factory';
import { seedAdmin } from '../data/admin.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, SUBSCRIPTION_PLAN_ROUTES, SubscriptionType, SubscriptionDuration, LogActionType } from '@my-app/contract';

const BASE = `/api/v1${SUBSCRIPTION_PLAN_ROUTES.BASE}`;

let seededPlanIds: string[] = [];
let seededTierIds: string[] = [];
let seededAdminUserIds: string[] = [];

beforeEach(() => {
  seededPlanIds = [];
  seededTierIds = [];
  seededAdminUserIds = [];
});

afterEach(async () => {
  if (seededTierIds.length > 0) {
    await prisma.subscriptionPlanCommission.deleteMany({ where: { commissionDurationId: { in: seededTierIds } } });
    await prisma.commissionDuration.deleteMany({ where: { id: { in: seededTierIds } } });
  }
  if (seededPlanIds.length > 0) {
    await prisma.subscriptionPlanCommission.deleteMany({ where: { subscriptionPlanId: { in: seededPlanIds } } });
    await prisma.subscriptionPlan.deleteMany({ where: { id: { in: seededPlanIds } } });
  }
  if (seededAdminUserIds.length > 0) {
    await prisma.log.deleteMany({ where: { userId: { in: seededAdminUserIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: seededAdminUserIds } } });
    await prisma.admin.deleteMany({ where: { userId: { in: seededAdminUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seededAdminUserIds } } });
  }
});

const adminToken = (id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa') =>
  mintToken({ id, role: UserRole.ADMIN });
const activatorToken = () =>
  mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaab', role: UserRole.ACTIVATOR });

async function createPlan(overrides: Parameters<typeof seedPlan>[1] = {}) {
  const p = await seedPlan(prisma, overrides);
  seededPlanIds.push(p.id);
  return p;
}

async function createTier(overrides: Parameters<typeof seedCommissionDuration>[1] = {}) {
  const t = await seedCommissionDuration(prisma, overrides);
  seededTierIds.push(t.id);
  return t;
}

// ─── GET /subscription-plans ──────────────────────────────────────────────────

describe('GET /subscription-plans', () => {
  it('200 — returns list for admin', async () => {
    const p = await createPlan();
    const res = await request(app)
      .get(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = (res.body.data as { id: string }[]).map((d) => d.id);
    expect(ids).toContain(p.id);
  });

  it('200 — active=true returns only active plans', async () => {
    const active = await createPlan({ isActive: true });
    const inactive = await createPlan({
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_WEEK,
      isActive: false,
    });
    const res = await request(app)
      .get(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.GET_ALL}?active=true`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as { id: string }[]).map((d) => d.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /subscription-plans ─────────────────────────────────────────────────

describe('POST /subscription-plans', () => {
  it('201 — creates plan', async () => {
    const res = await request(app)
      .post(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subscriptionType: SubscriptionType.SNAPCHAT_PLUS, subscriptionDuration: SubscriptionDuration.ONE_DAY });
    expect(res.status).toBe(201);
    expect(res.body.data.isActive).toBe(true);
    seededPlanIds.push(res.body.data.id);
  });

  it('409 — duplicate (type, duration) returns RESOURCE_CONFLICT', async () => {
    await createPlan({ subscriptionType: SubscriptionType.SNAPCHAT_PLUS, subscriptionDuration: SubscriptionDuration.THREE_MONTH });
    const res = await request(app)
      .post(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subscriptionType: SubscriptionType.SNAPCHAT_PLUS, subscriptionDuration: SubscriptionDuration.THREE_MONTH });
    expect(res.status).toBe(409);
  });
});

// ─── POST /subscription-plans/:id/toggle ──────────────────────────────────────

describe('POST /subscription-plans/:id/toggle', () => {
  it('200 — flips isActive', async () => {
    const p = await createPlan({ isActive: true });
    const path = SUBSCRIPTION_PLAN_ROUTES.TOGGLE.replace(':id', p.id);
    const res = await request(app)
      .post(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('404 — unknown plan id', async () => {
    const path = SUBSCRIPTION_PLAN_ROUTES.TOGGLE.replace(':id', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .post(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── GET /subscription-plans/commission-durations ─────────────────────────────

describe('GET /subscription-plans/commission-durations', () => {
  it('200 — returns tiers ordered by nbMinuteMin', async () => {
    const t1 = await createTier({ nbMinuteMin: 10, nbMinuteMax: 30 });
    const t2 = await createTier({ nbMinuteMin: 0, nbMinuteMax: 10 });
    const res = await request(app)
      .get(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSION_DURATIONS}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = (res.body.data as { id: string }[]).map((d) => d.id);
    expect(ids.indexOf(t2.id)).toBeLessThan(ids.indexOf(t1.id));
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSION_DURATIONS}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /subscription-plans/commissions ─────────────────────────────────────

describe('GET /subscription-plans/commissions', () => {
  it('200 — returns matrix with null cells for missing entries', async () => {
    const p = await createPlan({ isActive: true });
    const t = await createTier({ nbMinuteMin: 0, nbMinuteMax: 60 });

    const res = await request(app)
      .get(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSIONS}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    const matrix = res.body.data as { tiers: unknown[]; rows: { planId: string; cells: { commission: number | null }[] }[] };
    const row = matrix.rows.find((r) => r.planId === p.id);
    expect(row).toBeDefined();
    const cell = row!.cells.find((c, i) => (matrix.tiers[i] as { id: string }).id === t.id);
    expect(cell?.commission).toBeNull();
  });
});

// ─── PATCH /subscription-plans/commissions ────────────────────────────────────

describe('PATCH /subscription-plans/commissions', () => {
  it('200 — upserts commission and logs CHANGE_ACTIVATION_COMMISSION', async () => {
    const { user, admin } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const p = await createPlan({ isActive: true });
    const t = await createTier({ nbMinuteMin: 0, nbMinuteMax: 60 });

    const res = await request(app)
      .patch(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.UPDATE_COMMISSION}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`)
      .send({ subscriptionPlanId: p.id, commissionDurationId: t.id, commission: 5.5 });

    expect(res.status).toBe(200);
    expect(res.body.data.commission).toBe(5.5);

    // verify log was written
    const log = await prisma.log.findFirst({
      where: { userId: user.id, actionType: LogActionType.CHANGE_ACTIVATION_COMMISSION },
    });
    expect(log).not.toBeNull();
  });
});

// ─── Static routes before /:id ────────────────────────────────────────────────

describe('Static routes resolve before /:id/toggle', () => {
  it('GET /commission-durations is not caught as GET /:id=commission-durations', async () => {
    const res = await request(app)
      .get(`${BASE}${SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSION_DURATIONS}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).not.toBe(404);
    expect(res.status).not.toBe(400); // not treated as invalid UUID param
  });
});
