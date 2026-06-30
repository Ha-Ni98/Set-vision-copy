import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedUser, SEED_PASSWORD } from '../data/auth.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, AUTH_ROUTES, ErrorCode } from '@my-app/contract';

const BASE = `/api/v1${AUTH_ROUTES.BASE}`;

// Tracks seeded user IDs to clean up after each test
let seededUserIds: string[] = [];

async function seed(overrides: Parameters<typeof seedUser>[1] = {}) {
  const user = await seedUser(prisma, overrides);
  seededUserIds.push(user.id);
  return user;
}

beforeEach(() => {
  seededUserIds = [];
});

afterEach(async () => {
  if (seededUserIds.length === 0) return;
  await prisma.refreshToken.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.admin.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.activator.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('200 — returns tokens + role; lastLoginAt updated', async () => {
    const user = await seed();

    const res = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGIN}`)
      .send({ username: user.username, password: SEED_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.role).toBe(UserRole.ADMIN);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.lastLoginAt).not.toBeNull();
  });

  it('401 — wrong password (identical error shape)', async () => {
    const user = await seed();

    const res = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGIN}`)
      .send({ username: user.username, password: 'WrongPassword99!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(res.body.error.message).toBe('Invalid credentials');
  });

  it('401 — disabled user (identical error shape)', async () => {
    const user = await seed({ isEnabled: false });

    const res = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGIN}`)
      .send({ username: user.username, password: SEED_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(res.body.error.message).toBe('Invalid credentials');
  });

  it('401 — unknown username (identical error shape)', async () => {
    const res = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGIN}`)
      .send({ username: 'no_such_user_xyz_99', password: 'anything' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(res.body.error.message).toBe('Invalid credentials');
  });
});

// ─── Refresh ──────────────────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('200 — rotates token; old token is rejected', async () => {
    const user = await seed();

    const loginRes = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGIN}`)
      .send({ username: user.username, password: SEED_PASSWORD });
    const oldRefresh = loginRes.body.data.refreshToken as string;

    const refreshRes = await request(app)
      .post(`${BASE}${AUTH_ROUTES.REFRESH}`)
      .send({ refreshToken: oldRefresh });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.refreshToken).not.toBe(oldRefresh);

    // Old token must be rejected
    const replayRes = await request(app)
      .post(`${BASE}${AUTH_ROUTES.REFRESH}`)
      .send({ refreshToken: oldRefresh });

    expect(replayRes.status).toBe(401);
  });

  it('401 — unknown refresh token', async () => {
    const res = await request(app)
      .post(`${BASE}${AUTH_ROUTES.REFRESH}`)
      .send({ refreshToken: 'deadbeef'.repeat(8) });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_UNAUTHORIZED);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('204 — revokes token; second logout still resolves (idempotent)', async () => {
    const user = await seed();

    const loginRes = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGIN}`)
      .send({ username: user.username, password: SEED_PASSWORD });

    const { accessToken, refreshToken } = loginRes.body.data as {
      accessToken: string;
      refreshToken: string;
    };

    const logout1 = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGOUT}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(logout1.status).toBe(204);

    const logout2 = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGOUT}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(logout2.status).toBe(204);
  });

  it('401 — missing Authorization header', async () => {
    const res = await request(app)
      .post(`${BASE}${AUTH_ROUTES.LOGOUT}`)
      .send({ refreshToken: 'tok' });

    expect(res.status).toBe(401);
  });
});

// ─── Me ───────────────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('401 — missing JWT', async () => {
    const res = await request(app).get(`${BASE}${AUTH_ROUTES.ME}`);
    expect(res.status).toBe(401);
  });

  it('401 — invalid JWT', async () => {
    const res = await request(app)
      .get(`${BASE}${AUTH_ROUTES.ME}`)
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('200 — returns SessionUserDTO for admin', async () => {
    const user = await seed({ role: UserRole.ADMIN });
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}${AUTH_ROUTES.ME}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.username).toBe(user.username);
    expect(res.body.data.role).toBe(UserRole.ADMIN);
    expect(typeof res.body.data.fullName).toBe('string');
  });

  it('200 — returns SessionUserDTO for activator', async () => {
    const user = await seed({ role: UserRole.ACTIVATOR });
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app)
      .get(`${BASE}${AUTH_ROUTES.ME}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe(UserRole.ACTIVATOR);
    expect(typeof res.body.data.fullName).toBe('string');
  });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('POST /auth/login — rate limiting', () => {
  it('429 — after 5 failed attempts, next attempt is blocked', async () => {
    // Use a unique username so this test's rate-limit key is isolated
    const user = await seed();

    const makeFailedAttempt = () =>
      request(app)
        .post(`${BASE}${AUTH_ROUTES.LOGIN}`)
        .send({ username: user.username, password: 'WrongPassword!' });

    for (let i = 0; i < 5; i++) {
      const res = await makeFailedAttempt();
      expect(res.status).toBe(401);
    }

    const blocked = await makeFailedAttempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe(ErrorCode.RATE_LIMITED);
  });
});
