import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedWilaya, seedCommune } from '../data/geography.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, GEOGRAPHY_ROUTES } from '@my-app/contract';

const BASE = `/api/v1${GEOGRAPHY_ROUTES.BASE}`;

let seededWilayaIds: string[] = [];

async function createWilaya(overrides: Parameters<typeof seedWilaya>[1] = {}) {
  const w = await seedWilaya(prisma, overrides);
  seededWilayaIds.push(w.id);
  return w;
}

beforeEach(() => {
  seededWilayaIds = [];
});

afterEach(async () => {
  if (seededWilayaIds.length === 0) return;
  await prisma.commune.deleteMany({ where: { wilayaId: { in: seededWilayaIds } } });
  await prisma.wilaya.deleteMany({ where: { id: { in: seededWilayaIds } } });
});

// ─── GET /geography/wilayas ───────────────────────────────────────────────────

describe('GET /geography/wilayas', () => {
  it('200 — returns wilayas ordered by wilayaCode for admin', async () => {
    const w1 = await createWilaya({ frName: 'Alger' });
    const w2 = await createWilaya({ frName: 'Batna' });
    const token = mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}${GEOGRAPHY_ROUTES.GET_WILAYAS}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = (res.body.data as { id: string }[]).map((d) => d.id);
    expect(ids).toContain(w1.id);
    expect(ids).toContain(w2.id);
  });

  it('200 — wilayas are ordered by wilayaCode ascending', async () => {
    await createWilaya({ frName: 'Z wilaya' });
    await createWilaya({ frName: 'A wilaya' });
    const token = mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', role: UserRole.ADMIN });

    const res = await request(app)
      .get(`${BASE}${GEOGRAPHY_ROUTES.GET_WILAYAS}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const codes = (res.body.data as { wilayaCode: string }[]).map((d) => d.wilayaCode);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });

  it('403 — rejected for non-admin (activator)', async () => {
    const token = mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaab', role: UserRole.ACTIVATOR });

    const res = await request(app)
      .get(`${BASE}${GEOGRAPHY_ROUTES.GET_WILAYAS}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('401 — rejected when unauthenticated', async () => {
    const res = await request(app).get(`${BASE}${GEOGRAPHY_ROUTES.GET_WILAYAS}`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /geography/wilayas/:wilayaId/communes ────────────────────────────────

describe('GET /geography/wilayas/:wilayaId/communes', () => {
  it('200 — returns communes for an existing wilaya', async () => {
    const w = await createWilaya();
    const c = await seedCommune(prisma, w.id, { frName: 'Bab El Oued' });
    const token = mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', role: UserRole.ADMIN });

    const path = GEOGRAPHY_ROUTES.GET_COMMUNES.replace(':wilayaId', w.id);
    const res = await request(app)
      .get(`${BASE}${path}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = (res.body.data as { id: string }[]).map((d) => d.id);
    expect(ids).toContain(c.id);
  });

  it('200 — returns empty array for wilaya with no communes', async () => {
    const w = await createWilaya();
    const token = mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', role: UserRole.ADMIN });

    const path = GEOGRAPHY_ROUTES.GET_COMMUNES.replace(':wilayaId', w.id);
    const res = await request(app)
      .get(`${BASE}${path}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('404 — returns 404 for unknown wilayaId', async () => {
    const token = mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', role: UserRole.ADMIN });
    const unknownId = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
    const path = GEOGRAPHY_ROUTES.GET_COMMUNES.replace(':wilayaId', unknownId);

    const res = await request(app)
      .get(`${BASE}${path}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('403 — rejected for non-admin (activator)', async () => {
    const w = await createWilaya();
    const token = mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaab', role: UserRole.ACTIVATOR });

    const path = GEOGRAPHY_ROUTES.GET_COMMUNES.replace(':wilayaId', w.id);
    const res = await request(app)
      .get(`${BASE}${path}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
