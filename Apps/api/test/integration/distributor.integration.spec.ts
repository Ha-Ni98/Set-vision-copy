import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedDistributor } from '../data/distributor.factory';
import { seedAdmin } from '../data/admin.factory';
import { seedCard } from '../data/card.factory';
import { seedWilaya, seedCommune } from '../data/geography.factory';
import { mintToken } from '../fixtures/auth.fixture';
import {
  UserRole,
  DISTRIBUTOR_ROUTES,
  LogActionType,
} from '@my-app/contract';

const BASE = `/api/v1${DISTRIBUTOR_ROUTES.BASE}`;

// IDs to clean up after each test
let seededDistributorIds: string[] = [];
let seededWilayaIds: string[] = [];
let seededCommuneIds: string[] = [];
let seededAdminUserIds: string[] = [];

beforeEach(() => {
  seededDistributorIds = [];
  seededWilayaIds = [];
  seededCommuneIds = [];
  seededAdminUserIds = [];
});

afterEach(async () => {
  if (seededDistributorIds.length > 0) {
    await prisma.log.deleteMany({ where: { actionType: { in: [LogActionType.ADD_DISTRIBUTOR, LogActionType.CHANGE_DISTRIBUTOR_INFORMATION, LogActionType.CHANGE_DISTRIBUTOR_STAT] } } });
    await prisma.distributor.deleteMany({ where: { id: { in: seededDistributorIds } } });
  }
  if (seededCommuneIds.length > 0) {
    await prisma.commune.deleteMany({ where: { id: { in: seededCommuneIds } } });
  }
  if (seededWilayaIds.length > 0) {
    await prisma.wilaya.deleteMany({ where: { id: { in: seededWilayaIds } } });
  }
  if (seededAdminUserIds.length > 0) {
    await prisma.log.deleteMany({ where: { userId: { in: seededAdminUserIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: seededAdminUserIds } } });
    await prisma.admin.deleteMany({ where: { userId: { in: seededAdminUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: seededAdminUserIds } } });
  }
});

const adminToken = (id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') =>
  mintToken({ id, role: UserRole.ADMIN });
const activatorToken = () =>
  mintToken({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', role: UserRole.ACTIVATOR });

async function createDistributor(overrides: Parameters<typeof seedDistributor>[1] = {}) {
  const seeded = await seedDistributor(prisma, overrides);
  seededDistributorIds.push(seeded.distributor.id);
  seededWilayaIds.push(seeded.wilaya.id);
  seededCommuneIds.push(seeded.commune.id);
  return seeded;
}

// ─── GET /distributors ────────────────────────────────────────────────────────

describe('GET /distributors', () => {
  it('200 — returns paginated list for admin with resolved names', async () => {
    const { distributor, wilaya, commune } = await createDistributor();
    const res = await request(app)
      .get(`${BASE}${DISTRIBUTOR_ROUTES.GET_ALL}?wilayaId=${wilaya.id}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toBeDefined();
    const found = (res.body.data.items as { id: string; wilayaName: string; communeName: string }[])
      .find((d) => d.id === distributor.id);
    expect(found).toBeDefined();
    expect(found!.wilayaName).toBe(wilaya.frName);
    expect(found!.communeName).toBe(commune.frName);
  });

  it('200 — wilayaId filter narrows results', async () => {
    const { distributor, wilaya } = await createDistributor();
    const res = await request(app)
      .get(`${BASE}${DISTRIBUTOR_ROUTES.GET_ALL}?wilayaId=${wilaya.id}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data.items as { id: string }[]).map((d) => d.id);
    expect(ids).toContain(distributor.id);
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${DISTRIBUTOR_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /distributors ───────────────────────────────────────────────────────

describe('POST /distributors', () => {
  it('201 — creates distributor and logs ADD_DISTRIBUTOR', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const wilaya = await seedWilaya(prisma);
    const commune = await seedCommune(prisma, wilaya.id);
    seededWilayaIds.push(wilaya.id);
    seededCommuneIds.push(commune.id);

    const res = await request(app)
      .post(`${BASE}${DISTRIBUTOR_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`)
      .send({ fullName: 'API Dist', storeName: 'API Store', phone: '+213555', wilayaId: wilaya.id, communeId: commune.id });
    expect(res.status).toBe(201);
    seededDistributorIds.push(res.body.data.id);

    const log = await prisma.log.findFirst({
      where: { userId: user.id, actionType: LogActionType.ADD_DISTRIBUTOR },
    });
    expect(log).not.toBeNull();
  });

  it('400 — commune mismatch returns VALIDATION_ERROR', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const s1 = await createDistributor();
    const s2 = await createDistributor();

    const res = await request(app)
      .post(`${BASE}${DISTRIBUTOR_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`)
      .send({ fullName: 'X', storeName: 'Y', phone: '0', wilayaId: s1.wilaya.id, communeId: s2.commune.id });
    expect(res.status).toBe(400);
  });
});

// ─── GET /distributors/:id ────────────────────────────────────────────────────

describe('GET /distributors/:id', () => {
  it('200 — returns detail with soldKeys and ordersCount (no cards = 0)', async () => {
    const { distributor } = await createDistributor();
    const path = DISTRIBUTOR_ROUTES.GET_BY_ID.replace(':id', distributor.id);
    const res = await request(app)
      .get(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.soldKeys).toBe(0);
    expect(res.body.data.ordersCount).toBe(0);
    expect(typeof res.body.data.deliveredOrdersCount).toBe('number');
  });

  it('404 — unknown distributor id', async () => {
    const path = DISTRIBUTOR_ROUTES.GET_BY_ID.replace(':id', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .get(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /distributors/:id ──────────────────────────────────────────────────

describe('PATCH /distributors/:id', () => {
  it('200 — updates and logs CHANGE_DISTRIBUTOR_INFORMATION', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const { distributor } = await createDistributor();
    const path = DISTRIBUTOR_ROUTES.UPDATE.replace(':id', distributor.id);
    const res = await request(app)
      .patch(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`)
      .send({ fullName: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toBe('Updated Name');

    const log = await prisma.log.findFirst({
      where: { userId: user.id, actionType: LogActionType.CHANGE_DISTRIBUTOR_INFORMATION },
    });
    expect(log).not.toBeNull();
  });

  it('400 — commune mismatch returns VALIDATION_ERROR', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const s1 = await createDistributor();
    const s2 = await createDistributor();

    const path = DISTRIBUTOR_ROUTES.UPDATE.replace(':id', s1.distributor.id);
    const res = await request(app)
      .patch(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`)
      .send({ wilayaId: s1.wilaya.id, communeId: s2.commune.id });
    expect(res.status).toBe(400);
  });

  it('404 — unknown distributor id', async () => {
    const path = DISTRIBUTOR_ROUTES.UPDATE.replace(':id', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .patch(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ fullName: 'X' });
    expect(res.status).toBe(404);
  });
});

// ─── POST /distributors/:id/toggle ───────────────────────────────────────────

describe('POST /distributors/:id/toggle', () => {
  it('200 — flips isEnabled and logs CHANGE_DISTRIBUTOR_STAT', async () => {
    const { user } = await seedAdmin(prisma);
    seededAdminUserIds.push(user.id);

    const { distributor } = await createDistributor({ isEnabled: true });
    const path = DISTRIBUTOR_ROUTES.TOGGLE.replace(':id', distributor.id);
    const res = await request(app)
      .post(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isEnabled).toBe(false);

    const log = await prisma.log.findFirst({
      where: { userId: user.id, actionType: LogActionType.CHANGE_DISTRIBUTOR_STAT },
    });
    expect(log).not.toBeNull();
  });

  it('404 — unknown distributor id', async () => {
    const path = DISTRIBUTOR_ROUTES.TOGGLE.replace(':id', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .post(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /distributors/:id ─────────────────────────────────────────────────

describe('DELETE /distributors/:id', () => {
  it('204 — soft-deletes the distributor', async () => {
    const { distributor } = await createDistributor();
    const path = DISTRIBUTOR_ROUTES.DELETE.replace(':id', distributor.id);
    const res = await request(app)
      .delete(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(204);

    const found = await prisma.distributor.findFirst({ where: { id: distributor.id } });
    expect(found!.deletedAt).not.toBeNull();
  });

  it('404 — already soft-deleted distributor returns 404', async () => {
    const { distributor } = await createDistributor();
    // soft-delete via API
    const path = DISTRIBUTOR_ROUTES.DELETE.replace(':id', distributor.id);
    await request(app)
      .delete(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    // second delete should 404
    const res = await request(app)
      .delete(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});
