import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin } from '../data/admin.factory';
import { seedActivator } from '../data/activator.factory';
import { seedWilaya } from '../data/geography.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, STATISTICS_ROUTES, ActivationStat, DashboardStatsResponseSchema, StatisticsOverviewResponseSchema, WilayaHeatmapResponseSchema, WilayaDrilldownResponseSchema } from '@my-app/contract';

const BASE = `/api/v1${STATISTICS_ROUTES.BASE}`;

let seededAdminUserIds: string[] = [];
let seededActivatorUserIds: string[] = [];
let seededWilayaIds: string[] = [];

beforeEach(() => {
  seededAdminUserIds = [];
  seededActivatorUserIds = [];
  seededWilayaIds = [];
});

afterEach(async () => {
  if (seededWilayaIds.length > 0) {
    await prisma.commune.deleteMany({ where: { wilayaId: { in: seededWilayaIds } } });
    await prisma.wilaya.deleteMany({ where: { id: { in: seededWilayaIds } } });
  }
  const allUserIds = [...seededAdminUserIds, ...seededActivatorUserIds];
  if (allUserIds.length > 0) {
    await prisma.log.deleteMany({ where: { userId: { in: allUserIds } } });
  }
  if (seededActivatorUserIds.length > 0) {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: seededActivatorUserIds } } });
    await prisma.activator.deleteMany({ where: { userId: { in: seededActivatorUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seededActivatorUserIds } } });
  }
  if (seededAdminUserIds.length > 0) {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: seededAdminUserIds } } });
    await prisma.admin.deleteMany({ where: { userId: { in: seededAdminUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seededAdminUserIds } } });
  }
});

const adminToken = (id: string) => mintToken({ id, role: UserRole.ADMIN });
const activatorToken = () => mintToken({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', role: UserRole.ACTIVATOR });

// ─── GET /statistics/dashboard ────────────────────────────────────────────────

describe('GET /statistics/dashboard', () => {
  it('200 — returns DashboardStatsResponseSchema shape', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.DASHBOARD}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(() => DashboardStatsResponseSchema.parse(res.body.data)).not.toThrow();
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.DASHBOARD}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /statistics/activators ───────────────────────────────────────────────

describe('GET /statistics/activators', () => {
  it('200 — returns a valid summary shape', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.ACTIVATORS_SUMMARY}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalActivators: expect.any(Number),
      onlineNow: expect.any(Number),
      totalSuccessful: expect.any(Number),
      totalCreditsOwed: expect.any(Number),
    });
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.ACTIVATORS_SUMMARY}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /statistics/distributors ────────────────────────────────────────────

describe('GET /statistics/distributors', () => {
  it('200 — returns a valid summary shape', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.DISTRIBUTORS_SUMMARY}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalDistributors: expect.any(Number),
      activeWithStock: expect.any(Number),
      totalCardsInStock: expect.any(Number),
      activationsThisMonth: expect.any(Number),
    });
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.DISTRIBUTORS_SUMMARY}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /statistics/inventory ────────────────────────────────────────────────

describe('GET /statistics/inventory', () => {
  it('200 — returns a valid summary shape', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.INVENTORY_SUMMARY}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      sets: expect.any(Array),
      lots: expect.any(Array),
      cards: expect.any(Array),
      cardFlags: { disabled: expect.any(Number), revoked: expect.any(Number) },
    });
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.INVENTORY_SUMMARY}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /statistics/orders ───────────────────────────────────────────────────

describe('GET /statistics/orders', () => {
  it('200 — returns a valid summary shape', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.ORDERS_SUMMARY}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalOrders: { all: expect.any(Number), month: expect.any(Number), week: expect.any(Number) },
      byState: expect.any(Array),
      pendingDelivery: expect.any(Number),
      inDelivery: expect.any(Number),
      totalRevenue: expect.any(Number),
    });
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.ORDERS_SUMMARY}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /statistics/activations ─────────────────────────────────────────────

describe('GET /statistics/activations', () => {
  it('200 — returns a valid summary shape', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.ACTIVATIONS_SUMMARY}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: { all: expect.any(Number), today: expect.any(Number), week: expect.any(Number), month: expect.any(Number) },
      byState: expect.any(Array),
      totalRevenue: expect.any(Number),
    });
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.ACTIVATIONS_SUMMARY}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /statistics/overview ─────────────────────────────────────────────────

describe('GET /statistics/overview', () => {
  it('200 — empty period returns zeroed arrays', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.OVERVIEW}?period=today`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(() => StatisticsOverviewResponseSchema.parse(res.body.data)).not.toThrow();
    expect(res.body.data.activationsOverTime).toEqual([]);
    expect(res.body.data.topActivators).toEqual([]);
  });

  it('200 — period=this_week returns valid shape', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.OVERVIEW}?period=this_week`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(() => StatisticsOverviewResponseSchema.parse(res.body.data)).not.toThrow();
  });

  it('400 — invalid period value rejected', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.OVERVIEW}?period=invalid_period`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(400);
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.OVERVIEW}?period=today`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /statistics/wilaya-heatmap ───────────────────────────────────────────

describe('GET /statistics/wilaya-heatmap', () => {
  it('200 — returns all seeded wilayas (count matches)', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const N = 3;
    for (let i = 0; i < N; i++) {
      const w = await seedWilaya(prisma);
      seededWilayaIds.push(w.id);
    }

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.WILAYA_HEATMAP}?period=today`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(() => WilayaHeatmapResponseSchema.parse(res.body.data)).not.toThrow();
    // heatmap returns ALL wilayas; at minimum our seeded ones must be present
    const returnedIds = (res.body.data as { wilayaId: string }[]).map((w) => w.wilayaId);
    for (const id of seededWilayaIds) {
      expect(returnedIds).toContain(id);
    }
  });

  it('400 — invalid period value rejected', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.WILAYA_HEATMAP}?period=bad`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(400);
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${STATISTICS_ROUTES.WILAYA_HEATMAP}?period=today`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /statistics/wilaya/:wilayaId ─────────────────────────────────────────

describe('GET /statistics/wilaya/:wilayaId', () => {
  it('200 — returns WilayaDrilldownResponseSchema shape for a seeded wilaya', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const wilaya = await seedWilaya(prisma);
    seededWilayaIds.push(wilaya.id);

    const path = STATISTICS_ROUTES.WILAYA_DRILLDOWN.replace(':wilayaId', wilaya.id);
    const res = await request(app)
      .get(`${BASE}${path}?period=today`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(() => WilayaDrilldownResponseSchema.parse(res.body.data)).not.toThrow();
    expect(res.body.data.wilayaId).toBe(wilaya.id);
    expect(res.body.data.wilayaName).toBe(wilaya.frName);
  });

  it('404 — unknown wilayaId returns NOT_FOUND', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const path = STATISTICS_ROUTES.WILAYA_DRILLDOWN.replace(':wilayaId', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .get(`${BASE}${path}?period=today`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(404);
  });

  it('400 — invalid wilayaId (not a UUID) rejected at params validation', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const path = STATISTICS_ROUTES.WILAYA_DRILLDOWN.replace(':wilayaId', 'not-a-uuid');
    const res = await request(app)
      .get(`${BASE}${path}?period=today`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(400);
  });

  it('403 — rejected for non-admin', async () => {
    const path = STATISTICS_ROUTES.WILAYA_DRILLDOWN.replace(':wilayaId', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .get(`${BASE}${path}?period=today`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});
