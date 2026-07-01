import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin, createAdminPayload } from '../data/admin.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, ADMIN_ROUTES, ErrorCode } from '@my-app/contract';

const BASE = `/api/v1${ADMIN_ROUTES.BASE}`;

let seededUserIds: string[] = [];

async function seed(overrides: Parameters<typeof seedAdmin>[1] = {}) {
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
  await prisma.admin.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
});

// ─── GET /admins ──────────────────────────────────────────────────────────────

describe('GET /admins', () => {
  it('200 — returns paginated list for admin principal', async () => {
    const { user } = await seed();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.meta.total).toBe('number');
  });

  it('403 — rejected for non-admin (activator) principal', async () => {
    const activatorId = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
    const token = mintToken({ id: activatorId, role: UserRole.ACTIVATOR });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });
});

// ─── POST /admins (create) ────────────────────────────────────────────────────

describe('POST /admins', () => {
  it('201 — creates admin and returns AdminWithCredentialsDTO with one-time password', async () => {
    const actor = await seed();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });
    const payload = createAdminPayload();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    // Track for cleanup
    if (res.body.data?.admin?.userId) seededUserIds.push(res.body.data.admin.userId);

    expect(res.status).toBe(201);
    expect(res.body.data.admin.username).toBe(payload.username);
    expect(typeof res.body.data.generatedPassword).toBe('string');
    expect(res.body.data.generatedPassword.length).toBeGreaterThan(0);
    expect('password' in res.body.data.admin).toBe(false);
  });

  it('409 — duplicate username returns RESOURCE_CONFLICT', async () => {
    const actor = await seed();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send(createAdminPayload({ username: actor.user.username }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

// ─── GET /admins/:id ──────────────────────────────────────────────────────────

describe('GET /admins/:id', () => {
  it('200 — returns AdminDTO', async () => {
    const { admin, user } = await seed();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}/${admin.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(admin.id);
    expect(res.body.data.username).toBe(user.username);
    expect('password' in res.body.data).toBe(false);
  });

  it('404 — unknown admin id', async () => {
    const { user } = await seed();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /admins/:id ────────────────────────────────────────────────────────

describe('PATCH /admins/:id', () => {
  it('200 — updates fullName and returns updated AdminDTO', async () => {
    const { admin, user } = await seed();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .patch(`${BASE}/${admin.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('Updated Name');
  });

  it('409 — username collision returns RESOURCE_CONFLICT', async () => {
    const actor = await seed();
    const other = await seed();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .patch(`${BASE}/${actor.admin.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: other.user.username });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('404 — unknown admin id', async () => {
    const { user } = await seed();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .patch(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'X' });

    expect(res.status).toBe(404);
  });
});

// ─── POST /admins/:id/toggle ──────────────────────────────────────────────────

describe('POST /admins/:id/toggle', () => {
  it('200 — flips isEnabled', async () => {
    const actor = await seed();
    const target = await seed();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const before = target.user.isEnabled;

    const res = await request(app)
      .post(`${BASE}/${target.admin.id}/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isEnabled).toBe(!before);
  });

  it('404 — unknown admin id', async () => {
    const { user } = await seed();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/toggle`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── POST /admins/:id/reset-password ─────────────────────────────────────────

describe('POST /admins/:id/reset-password', () => {
  it('200 — returns a new one-time generatedPassword', async () => {
    const actor = await seed();
    const target = await seed();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(`${BASE}/${target.admin.id}/reset-password`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.generatedPassword).toBe('string');
    expect(res.body.data.generatedPassword.length).toBeGreaterThan(0);
  });

  it('404 — unknown admin id', async () => {
    const { user } = await seed();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/reset-password`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /admins/:id ───────────────────────────────────────────────────────

describe('DELETE /admins/:id', () => {
  it('403 — self-delete returns AUTH_FORBIDDEN', async () => {
    const { admin, user } = await seed();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .delete(`${BASE}/${admin.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });

  it('409 — last enabled admin returns RESOURCE_CONFLICT', async () => {
    // Temporarily disable any pre-existing enabled admins so the guard fires
    // reliably regardless of DB state (handles orphaned records from prior runs).
    const preExisting = await prisma.user.findMany({
      where: { role: 'ADMIN', isEnabled: true, deletedAt: null },
      select: { id: true },
    });
    const preExistingIds = preExisting.map((u) => u.id);
    if (preExistingIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: preExistingIds } },
        data: { isEnabled: false },
      });
    }

    try {
      const { admin } = await seed();
      const fakeActorToken = mintToken({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', role: UserRole.ADMIN });

      const res = await request(app)
        .delete(`${BASE}/${admin.id}`)
        .set('Authorization', `Bearer ${fakeActorToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
    } finally {
      if (preExistingIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: preExistingIds } },
          data: { isEnabled: true },
        });
      }
    }
  });

  it('204 — soft-deletes; admin no longer appears in list', async () => {
    const actor = await seed();
    const target = await seed();
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const delRes = await request(app)
      .delete(`${BASE}/${target.admin.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(204);

    const getRes = await request(app)
      .get(`${BASE}/${target.admin.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });

  it('404 — unknown admin id', async () => {
    const actor = await seed();
    const extra = await seed(); // ensure at least 2 admins so guard passes
    const token = mintToken({ id: actor.user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .delete(`${BASE}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    // suppress unused warning
    expect(extra).toBeTruthy();
  });
});
