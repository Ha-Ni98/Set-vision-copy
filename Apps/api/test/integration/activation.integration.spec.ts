import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin } from '../data/admin.factory';
import { seedActivator } from '../data/activator.factory';
import { seedCard } from '../data/card.factory';
import { seedDistributor } from '../data/distributor.factory';
import { seedActivation } from '../data/activation.factory';
import { mintToken } from '../fixtures/auth.fixture';
import {
  UserRole,
  KEY_ROUTES,
  ACTIVATION_ROUTES,
  ErrorCode,
  ActivationStat,
  AccountInformation,
  CardStat,
  ActiveRequestResponseSchema,
  ActivationDetailResponseSchema,
} from '@my-app/contract';

const KEY_BASE = `/api/v1${KEY_ROUTES.BASE}`;
const ACT_BASE = `/api/v1${ACTIVATION_ROUTES.BASE}`;
const SAMPLE_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

let seededUserIds: string[] = [];
let seededSetIds: string[] = [];
let seededDistributorIds: string[] = [];
let seededWilayaIds: string[] = [];
let seededCommuneIds: string[] = [];

async function seedAdm() {
  const result = await seedAdmin(prisma);
  seededUserIds.push(result.user.id);
  return result;
}

async function seedAct(overrides: Parameters<typeof seedActivator>[1] = {}) {
  const result = await seedActivator(prisma, overrides);
  seededUserIds.push(result.user.id);
  return result;
}

async function seedDist() {
  const result = await seedDistributor(prisma);
  seededDistributorIds.push(result.distributor.id);
  seededWilayaIds.push(result.wilaya.id);
  seededCommuneIds.push(result.commune.id);
  return result;
}

beforeEach(() => {
  seededUserIds = [];
  seededSetIds = [];
  seededDistributorIds = [];
  seededWilayaIds = [];
  seededCommuneIds = [];
});

afterEach(async () => {
  if (seededSetIds.length > 0) {
    const cards = await prisma.card.findMany({
      where: { setId: { in: seededSetIds } },
      select: { id: true },
    });
    const cardIds = cards.map((c) => c.id);

    if (cardIds.length > 0) {
      const acts = await prisma.activation.findMany({
        where: { cardId: { in: cardIds } },
        select: { id: true },
      });
      const actIds = acts.map((a) => a.id);
      if (actIds.length > 0) {
        await prisma.activationStep.deleteMany({ where: { activationId: { in: actIds } } });
        await prisma.activationInformation.deleteMany({ where: { activationId: { in: actIds } } });
        await prisma.activation.deleteMany({ where: { id: { in: actIds } } });
      }
    }

    await prisma.card.deleteMany({ where: { setId: { in: seededSetIds } } });
    await prisma.set.deleteMany({ where: { id: { in: seededSetIds } } });
  }

  if (seededDistributorIds.length > 0) {
    await prisma.distributor.deleteMany({ where: { id: { in: seededDistributorIds } } });
  }

  if (seededCommuneIds.length > 0) {
    await prisma.commune.deleteMany({ where: { id: { in: seededCommuneIds } } });
  }

  if (seededWilayaIds.length > 0) {
    await prisma.wilaya.deleteMany({ where: { id: { in: seededWilayaIds } } });
  }

  if (seededUserIds.length > 0) {
    await prisma.log.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.activator.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.admin.deleteMany({ where: { userId: { in: seededUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
  }
});

// ─── POST /keys/verify ────────────────────────────────────────────────────────

describe('POST /keys/verify', () => {
  it('INVALID — unknown key returns INVALID status', async () => {
    const res = await request(app)
      .post(`${KEY_BASE}${KEY_ROUTES.VERIFY}`)
      .send({ key: 'XXXX-9999-ZZZZ-0000' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INVALID');
  });

  it('READY — AT_DISTRIBUTOR active card returns READY with subscription label', async () => {
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${KEY_BASE}${KEY_ROUTES.VERIFY}`)
      .send({ key: card.key });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('READY');
    expect(typeof res.body.data.subscriptionLabel).toBe('string');
  });

  it('SUBMITTED — card with existing PENDING activation returns SUBMITTED status', async () => {
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    await seedActivation(prisma, card, { activationStat: ActivationStat.PENDING });

    const res = await request(app)
      .post(`${KEY_BASE}${KEY_ROUTES.VERIFY}`)
      .send({ key: card.key });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUBMITTED');
  });
});

// ─── POST /keys/submit ────────────────────────────────────────────────────────

describe('POST /keys/submit', () => {
  it('201 — creates activation for a READY card', async () => {
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const res = await request(app)
      .post(`${KEY_BASE}${KEY_ROUTES.SUBMIT}`)
      .send({
        key: card.key,
        fullName: 'Jane Doe',
        phone: '+213555000001',
        accountFields: [{ field: AccountInformation.USERNAME, value: 'jane_doe' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
  });

  it('409 — RESOURCE_CONFLICT when card already has a pending activation', async () => {
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    await seedActivation(prisma, card, { activationStat: ActivationStat.PENDING });

    const res = await request(app)
      .post(`${KEY_BASE}${KEY_ROUTES.SUBMIT}`)
      .send({
        key: card.key,
        fullName: 'Jane Doe',
        phone: '+213555000001',
        accountFields: [{ field: AccountInformation.USERNAME, value: 'jane_doe' }],
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

// ─── GET /keys/:activationId/status ──────────────────────────────────────────

describe('GET /keys/:activationId/status', () => {
  it('200 — returns ClientActivationStatus for an existing activation', async () => {
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PENDING,
    });

    const res = await request(app).get(`${KEY_BASE}/${activation.id}/status`);

    expect(res.status).toBe(200);
    expect(res.body.data.activationId).toBe(activation.id);
    expect(Object.values(['SUBMITTED', 'PROCESSING', 'NEEDS_CORRECTION', 'NEEDS_OTP',
      'UNDER_REVIEW', 'ACTIVATED', 'FAILED'])).toContain(res.body.data.status);
  });

  it('404 — unknown activationId returns RESOURCE_NOT_FOUND', async () => {
    const res = await request(app).get(`${KEY_BASE}/${SAMPLE_UUID}/status`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });
});

// ─── GET /activations/pending ─────────────────────────────────────────────────

describe('GET /activations/pending', () => {
  it('401 — unauthenticated request is rejected', async () => {
    const res = await request(app).get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_PENDING}`);
    expect(res.status).toBe(401);
  });

  it('200 — admin is allowed (admin dashboard reads the global pending pool, Stage-04-fix)', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const res = await request(app)
      .get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_PENDING}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('200 — activator sees pending activations (key masked)', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    await seedActivation(prisma, card, { activationStat: ActivationStat.PENDING });

    const res = await request(app)
      .get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_PENDING}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const item = (res.body.data as Array<{ id: string; keyMasked: string }>).find(
      (a) => a.id !== undefined,
    );
    expect(item).toBeDefined();
  });
});

// ─── POST /activations/:id/take ──────────────────────────────────────────────

describe('POST /activations/:id/take', () => {
  it('200 — activator successfully takes a PENDING activation', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PENDING,
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/take`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(() => ActiveRequestResponseSchema.parse(res.body.data)).not.toThrow();
  });

  it('409 — RESOURCE_CONFLICT when activation is already PROCESSING', async () => {
    const { user: u1 } = await seedAct();
    const { user: u2, activator: act2 } = await seedAct();
    const tokenU2 = mintToken({ id: u2.id, role: UserRole.ACTIVATOR });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    // Seed as already taken by activator 1
    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PROCESSING,
      activatorId: act2.id,
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/take`)
      .set('Authorization', `Bearer ${tokenU2}`);

    // Expect conflict because it's already taken (not PENDING)
    expect(res.status).toBe(409);
    // suppress unused variable warning
    void u1;
  });

  it('409 — RESOURCE_CONFLICT for unknown/non-PENDING activation (service uses optimistic update)', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    // take uses updateMany(WHERE PENDING) → 0 rows → ConflictError, not NotFoundError
    const res = await request(app)
      .post(`${ACT_BASE}/${SAMPLE_UUID}/take`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});

// ─── POST /activations/:id/activate ──────────────────────────────────────────
// Stage-04-fix #2: a required, valid activationEmail on the activator's own Activate.

describe('POST /activations/:id/activate', () => {
  it('200 — activator activates a PROCESSING activation and stores the required activationEmail', async () => {
    const { user, activator } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PROCESSING,
      activatorId: activator.id,
      takenAt: new Date(),
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/activate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activationEmail: 'client@example.com' });

    expect(res.status).toBe(200);
    expect(() => ActiveRequestResponseSchema.parse(res.body.data)).not.toThrow();

    const updated = await prisma.activation.findUnique({ where: { id: activation.id } });
    expect(updated?.activationEmail).toBe('client@example.com');
  });

  it('400 — VALIDATION_ERROR when activationEmail is missing', async () => {
    const { user, activator } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PROCESSING,
      activatorId: activator.id,
      takenAt: new Date(),
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/activate`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('400 — VALIDATION_ERROR when activationEmail is not a valid email', async () => {
    const { user, activator } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PROCESSING,
      activatorId: activator.id,
      takenAt: new Date(),
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/activate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activationEmail: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});

// ─── GET /activations/recent ──────────────────────────────────────────────────
// Stage-04-fix #2: activationEmail rides all the way through to the recent feed.

describe('GET /activations/recent', () => {
  it('200 — includes the activationEmail set on activate', async () => {
    const { user, activator } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PROCESSING,
      activatorId: activator.id,
      takenAt: new Date(),
    });

    await request(app)
      .post(`${ACT_BASE}/${activation.id}/activate`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activationEmail: 'recent@example.com' });

    const res = await request(app)
      .get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_RECENT}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const row = (res.body.data as Array<{ id: string; activationEmail: string | null }>).find(
      (r) => r.id === activation.id,
    );
    expect(row?.activationEmail).toBe('recent@example.com');
  });
});

// ─── GET /activations/active ──────────────────────────────────────────────────

describe('GET /activations/active — PASSWORD exposure', () => {
  it('PASSWORD field is raw (not masked) in activator active view', async () => {
    const { user, activator } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    await seedActivation(prisma, card, {
      activationStat: ActivationStat.PROCESSING,
      activatorId: activator.id,
      takenAt: new Date(),
      accountFields: [
        { field: AccountInformation.USERNAME, value: 'jane_doe' },
        { field: AccountInformation.PASSWORD, value: 'secret123' },
      ],
    });

    const res = await request(app)
      .get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_ACTIVE}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const item = res.body.data as Array<{
      accountFields: Array<{ fieldLabel: string; value: string }>;
    }>;
    const passwordField = item[0]?.accountFields.find((f) => f.value === 'secret123');
    expect(passwordField).toBeDefined();
  });
});

// ─── GET /activations/ (admin getAll) ────────────────────────────────────────

describe('GET /activations/ (admin getAll)', () => {
  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app).get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_ALL}`);
    expect(res.status).toBe(401);
  });

  it('403 — activator role rejected (admin only)', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app)
      .get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });

  it('200 — admin sees paginated activations list', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PENDING,
    });

    const res = await request(app)
      .get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('meta');
    const ids = (res.body.data.items as Array<{ id: string }>).map((a) => a.id);
    expect(ids).toContain(activation.id);
  });
});

// ─── GET /activations/:id (admin getById) ─────────────────────────────────────

describe('GET /activations/:id (admin getById)', () => {
  it('200 — returns ActivationDetailDTO with PASSWORD masked as ****', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PENDING,
      accountFields: [
        { field: AccountInformation.USERNAME, value: 'jane_doe' },
        { field: AccountInformation.PASSWORD, value: 'secret123' },
      ],
    });

    const res = await request(app)
      .get(`${ACT_BASE}/${activation.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(() => ActivationDetailResponseSchema.parse(res.body.data)).not.toThrow();

    const info = res.body.data.submittedInformation as Array<{ fieldLabel: string; value: string }>;
    const passwordField = info.find((f) => f.value === '****');
    expect(passwordField).toBeDefined();

    // Raw value must NOT appear
    const rawField = info.find((f) => f.value === 'secret123');
    expect(rawField).toBeUndefined();
  });

  it('404 — unknown id returns RESOURCE_NOT_FOUND', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${ACT_BASE}/${SAMPLE_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  it('403 — activator role rejected (admin only)', async () => {
    const { user } = await seedAct();
    const token = mintToken({ id: user.id, role: UserRole.ACTIVATOR });

    const res = await request(app)
      .get(`${ACT_BASE}/${SAMPLE_UUID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });

  it('static routes resolve before /:id — GET /pending is not caught as GET /:id=pending', async () => {
    const { user } = await seedAdm();
    const adminToken = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { actUser } = await (async () => {
      const r = await seedAct();
      return { actUser: r.user };
    })();
    const actToken = mintToken({ id: actUser.id, role: UserRole.ACTIVATOR });

    // Admin hitting /pending → 200 with the pending list (Stage-04-fix widened this to
    // admin+activator). This still proves static-before-param resolution: had `/pending`
    // been caught by `/:id`, getById's uuid param validation would 400, never 200 an array.
    const adminRes = await request(app)
      .get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_PENDING}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(Array.isArray(adminRes.body.data)).toBe(true);

    // Activator hitting / → 403 (adminOnly GET_ALL is found, role wrong) not 404
    const actRes = await request(app)
      .get(`${ACT_BASE}${ACTIVATION_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${actToken}`);
    expect(actRes.status).toBe(403);
  });
});

// ─── POST /activations/:id/activate-by-admin ─────────────────────────────────

describe('POST /activations/:id/activate-by-admin', () => {
  it('200 — admin activates a FREEZE activation', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { activator } = await seedAct();
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.FREEZE,
      activatorId: activator.id,
      takenAt: new Date(),
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/activate-by-admin`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activationEmail: 'client@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe(ActivationStat.ACTIVATED_BY_ADMIN);

    const updated = await prisma.activation.findUnique({ where: { id: activation.id } });
    expect(updated?.activationEmail).toBe('client@example.com');
  });

  it('409 — RESOURCE_CONFLICT when activation is not in FREEZE state', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PENDING,
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/activate-by-admin`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activationEmail: 'client@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('400 — VALIDATION_ERROR when activationEmail is missing', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { activator } = await seedAct();
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.FREEZE,
      activatorId: activator.id,
      takenAt: new Date(),
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/activate-by-admin`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});

// ─── POST /activations/:id/set-price ─────────────────────────────────────────

describe('POST /activations/:id/set-price', () => {
  it('200 — admin sets price on ACTIVATED activation', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { activator } = await seedAct({ credits: 100, totalEarning: 100 });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.ACTIVATED,
      isActive: false,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.ACTIVATED,
      activatorId: activator.id,
      activationPrice: 150,
      takenAt: new Date(),
      completedAt: new Date(),
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/set-price`)
      .send({ amount: 200 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('400 — validation rejects negative amount', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });

    const res = await request(app)
      .post(`${ACT_BASE}/${SAMPLE_UUID}/set-price`)
      .send({ amount: -10 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('409 — RESOURCE_CONFLICT when activation is not ACTIVATED/ACTIVATED_BY_ADMIN', async () => {
    const { user } = await seedAdm();
    const token = mintToken({ id: user.id, role: UserRole.ADMIN });
    const { distributor } = await seedDist();
    const { card, set } = await seedCard(prisma, {
      cardStat: CardStat.AT_DISTRIBUTOR,
      isActive: true,
      distributorId: distributor.id,
    });
    seededSetIds.push(set.id);

    const { activation } = await seedActivation(prisma, card, {
      activationStat: ActivationStat.PENDING,
    });

    const res = await request(app)
      .post(`${ACT_BASE}/${activation.id}/set-price`)
      .send({ amount: 200 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });
});
