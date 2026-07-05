import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedActivator, createActivatorPayload } from '../data/activator.factory';
import { seedAdmin } from '../data/admin.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, ACTIVATOR_ROUTES, ErrorCode } from '@my-app/contract';

const BASE = `/api/v1${ACTIVATOR_ROUTES.BASE}`;

let seededUserIds: string[] = [];

async function seedAct(overrides: Parameters<typeof seedActivator>[1] = {}) {
  const result = await seedActivator(prisma, overrides);
  seededUserIds.push(result.user.id);
  return result;
}

async function seedAdm(overrides: Parameters<typeof seedAdmin>[1] = {}) {
  const result = await seedAdmin(prisma, overrides);
  seededUserIds.push(result.user.id);
  return result;
}

beforeEach(() => {
  seededUserIds = [];
});

afterEach(async () => {
  if (seededUserIds.length === 0) return;
  await prisma.log.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.activator.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.admin.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
});

// ─── GET /activators ──────────────────────────────────────────────────────────

describe('GET /activators', () => {
  it('200 — returns paginated list for admin principal', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.meta.total).toBe('number');
  });

  it('403 — rejected for non-admin (activator) principal', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });
});

// ─── POST /activators (create) ────────────────────────────────────────────────

describe('POST /activators', () => {
  it('201 — creates activator and returns ActivatorWithCredentialsDTO with one-time password', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const payload = createActivatorPayload();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    if (res.body.data?.activator?.userId) seededUserIds.push(res.body.data.activator.userId);

    expect(res.status).toBe(201);
    expect(res.body.data.activator.username).toBe(payload.username);
    expect(typeof res.body.data.generatedPassword).toBe('string');
    expect(res.body.data.generatedPassword.length).toBeGreaterThan(0);
    expect('password' in res.body.data.activator).toBe(false);
  });

  it('409 — duplicate username returns RESOURCE_CONFLICT', async () => {
    const actor = await seedAdm();
    const existing = await seedAct();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send(createActivatorPayload({ username: existing.user.username }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

// ─── GET /activators/:id ──────────────────────────────────────────────────────

describe('GET /activators/:id', () => {
  it('200 — returns ActivatorDetailDTO with derived fields', async () => {
    const actor = await seedAdm();
    const { activator, user } = await seedAct();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}/${activator.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(activator.id);
    expect(res.body.data.username).toBe(user.username);
    expect(typeof res.body.data.successRate).toBe('number');
    expect(typeof res.body.data.totalPaid).toBe('number');
    expect(typeof res.body.data.creditsOwed).toBe('number');
    expect('password' in res.body.data).toBe(false);
  });

  it('404 — unknown activator id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /activators/:id ────────────────────────────────────────────────────

describe('PATCH /activators/:id', () => {
  it('200 — updates fullName and returns updated ActivatorDTO', async () => {
    const actor = await seedAdm();
    const { activator } = await seedAct();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .patch(`${BASE}/${activator.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('Updated Name');
  });

  it('409 — username collision returns RESOURCE_CONFLICT', async () => {
    const actor = await seedAdm();
    const target = await seedAct();
    const other = await seedAct();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .patch(`${BASE}/${target.activator.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: other.user.username });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('404 — unknown activator id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .patch(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'X' });

    expect(res.status).toBe(404);
  });
});

// ─── POST /activators/:id/toggle ─────────────────────────────────────────────

describe('POST /activators/:id/toggle', () => {
  it('200 — flips isEnabled', async () => {
    const actor = await seedAdm();
    const { activator, user } = await seedAct();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const before = user.isEnabled;

    const res = await request(app)
      .post(`${BASE}/${activator.id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isEnabled).toBe(!before);
  });

  it('404 — unknown activator id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── POST /activators/:id/reset-password ─────────────────────────────────────

describe('POST /activators/:id/reset-password', () => {
  it('200 — returns a new one-time generatedPassword', async () => {
    const actor = await seedAdm();
    const { activator } = await seedAct();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(`${BASE}/${activator.id}/reset-password`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.generatedPassword).toBe('string');
    expect(res.body.data.generatedPassword.length).toBeGreaterThan(0);
  });

  it('404 — unknown activator id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/reset-password`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── GET /activators/me/stats ─────────────────────────────────────────────────

describe('GET /activators/me/stats', () => {
  it('200 — returns ActivatorDashboardDTO for activator principal', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app)
      .get(`${BASE}${ACTIVATOR_ROUTES.MY_STATS}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.totalEarnings).toBe('number');
    expect(typeof res.body.data.activeSlotsUsed).toBe('number');
    expect(Array.isArray(res.body.data.weekly)).toBe(true);
    expect(res.body.data.weekly).toHaveLength(7);
  });

  it('403 — rejected for admin principal (not an activator)', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}${ACTIVATOR_ROUTES.MY_STATS}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });
});

// ─── GET /activators/:id/performance ─────────────────────────────────────────

describe('GET /activators/:id/performance', () => {
  it('200 — returns performance series (empty when no activations)', async () => {
    const actor = await seedAdm();
    const { activator } = await seedAct();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}/${activator.id}/performance`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.series)).toBe(true);
  });

  it('404 — unknown activator id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/performance`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /activators/:id ───────────────────────────────────────────────────

describe('DELETE /activators/:id', () => {
  it('204 — soft-deletes; activator no longer appears in detail', async () => {
    const actor = await seedAdm();
    const { activator } = await seedAct();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const delRes = await request(app)
      .delete(`${BASE}/${activator.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(204);

    const getRes = await request(app)
      .get(`${BASE}/${activator.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });

  it('404 — unknown activator id', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .delete(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
