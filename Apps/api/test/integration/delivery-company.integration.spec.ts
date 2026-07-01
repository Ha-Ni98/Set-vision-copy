import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedDeliveryCompany } from '../data/delivery-company.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, DELIVERY_COMPANY_ROUTES } from '@my-app/contract';

const BASE = `/api/v1${DELIVERY_COMPANY_ROUTES.BASE}`;

let seededIds: string[] = [];

async function seed(overrides: Parameters<typeof seedDeliveryCompany>[1] = {}) {
  const company = await seedDeliveryCompany(prisma, overrides);
  seededIds.push(company.id);
  return company;
}

const adminToken = () => mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', role: UserRole.ADMIN });
const activatorToken = () => mintToken({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaab', role: UserRole.ACTIVATOR });

beforeEach(() => { seededIds = []; });

afterEach(async () => {
  if (seededIds.length === 0) return;
  await prisma.deliveryCompany.deleteMany({ where: { id: { in: seededIds } } });
});

// ─── GET /delivery-companies ──────────────────────────────────────────────────

describe('GET /delivery-companies', () => {
  it('200 — returns all companies for admin', async () => {
    const c = await seed();
    const res = await request(app)
      .get(`${BASE}${DELIVERY_COMPANY_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = (res.body.data as { id: string }[]).map((d) => d.id);
    expect(ids).toContain(c.id);
  });

  it('200 — active=true returns only enabled companies', async () => {
    const active = await seed({ isActive: true });
    const inactive = await seed({ isActive: false });

    const res = await request(app)
      .get(`${BASE}${DELIVERY_COMPANY_ROUTES.GET_ALL}?active=true`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    const ids = (res.body.data as { id: string }[]).map((d) => d.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(inactive.id);
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${DELIVERY_COMPANY_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /delivery-companies ─────────────────────────────────────────────────

describe('POST /delivery-companies', () => {
  it('201 — creates company with isActive=true', async () => {
    const res = await request(app)
      .post(`${BASE}${DELIVERY_COMPANY_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'New Courier', registeredName: 'New Courier SARL' });

    expect(res.status).toBe(201);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.name).toBe('New Courier');
    seededIds.push(res.body.data.id);
  });

  it('400 — missing required fields', async () => {
    const res = await request(app)
      .post(`${BASE}${DELIVERY_COMPANY_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /delivery-companies/:id ───────────────────────────────────────────

describe('PATCH /delivery-companies/:id', () => {
  it('200 — updates name', async () => {
    const c = await seed({ name: 'Old Name' });

    const path = DELIVERY_COMPANY_ROUTES.UPDATE.replace(':id', c.id);
    const res = await request(app)
      .patch(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
  });

  it('404 — unknown id', async () => {
    const path = DELIVERY_COMPANY_ROUTES.UPDATE.replace(':id', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .patch(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ─── POST /delivery-companies/:id/toggle ─────────────────────────────────────

describe('POST /delivery-companies/:id/toggle', () => {
  it('200 — flips isActive and restores it', async () => {
    const c = await seed({ isActive: true });
    const path = DELIVERY_COMPANY_ROUTES.TOGGLE.replace(':id', c.id);

    const first = await request(app)
      .post(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(first.status).toBe(200);
    expect(first.body.data.isActive).toBe(false);

    const second = await request(app)
      .post(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(second.status).toBe(200);
    expect(second.body.data.isActive).toBe(true);
  });

  it('404 — unknown id', async () => {
    const path = DELIVERY_COMPANY_ROUTES.TOGGLE.replace(':id', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .post(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});
