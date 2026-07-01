import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin } from '../data/admin.factory';
import { seedActivator } from '../data/activator.factory';
import { seedPayment } from '../data/payment.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, PAYMENT_ROUTES, LogActionType } from '@my-app/contract';

const BASE = `/api/v1${PAYMENT_ROUTES.BASE}`;

let seededPaymentIds: string[] = [];
let seededActivatorUserIds: string[] = [];
let seededAdminUserIds: string[] = [];

beforeEach(() => {
  seededPaymentIds = [];
  seededActivatorUserIds = [];
  seededAdminUserIds = [];
});

afterEach(async () => {
  if (seededPaymentIds.length > 0) {
    await prisma.payment.deleteMany({ where: { id: { in: seededPaymentIds } } });
  }
  // Delete logs before user cleanup
  const allUserIds = [...seededActivatorUserIds, ...seededAdminUserIds];
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
const activatorToken = () =>
  mintToken({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', role: UserRole.ACTIVATOR });

// ─── GET /payments ────────────────────────────────────────────────────────────

describe('GET /payments', () => {
  it('200 — excludes deleted payments by default', async () => {
    const { user: adminUser, admin } = await seedAdmin(prisma);
    const { activator, user: actUser } = await seedActivator(prisma, { credits: 500 });
    seededAdminUserIds.push(adminUser.id);
    seededActivatorUserIds.push(actUser.id);

    const { payment: active } = await seedPayment(prisma, admin.id, activator.id, { amount: 50 });
    const { payment: deleted } = await seedPayment(prisma, admin.id, activator.id, {
      amount: 30,
      isDeleted: true,
    });
    seededPaymentIds.push(active.id, deleted.id);

    const res = await request(app)
      .get(`${BASE}${PAYMENT_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data.items as { id: string }[]).map((p) => p.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(deleted.id);
  });

  it('200 — includeDeleted=true shows deleted payments too', async () => {
    const { user: adminUser, admin } = await seedAdmin(prisma);
    const { activator, user: actUser } = await seedActivator(prisma, { credits: 500 });
    seededAdminUserIds.push(adminUser.id);
    seededActivatorUserIds.push(actUser.id);

    const { payment: deleted } = await seedPayment(prisma, admin.id, activator.id, {
      amount: 30,
      isDeleted: true,
    });
    seededPaymentIds.push(deleted.id);

    const res = await request(app)
      .get(`${BASE}${PAYMENT_ROUTES.GET_ALL}?includeDeleted=true`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data.items as { id: string }[]).map((p) => p.id);
    expect(ids).toContain(deleted.id);
  });

  it('200 — activatorId filter narrows results', async () => {
    const { user: adminUser, admin } = await seedAdmin(prisma);
    const { activator: a1, user: u1 } = await seedActivator(prisma, { credits: 500 });
    const { activator: a2, user: u2 } = await seedActivator(prisma, { credits: 500 });
    seededAdminUserIds.push(adminUser.id);
    seededActivatorUserIds.push(u1.id, u2.id);

    const { payment: p1 } = await seedPayment(prisma, admin.id, a1.id, { amount: 50 });
    const { payment: p2 } = await seedPayment(prisma, admin.id, a2.id, { amount: 50 });
    seededPaymentIds.push(p1.id, p2.id);

    const res = await request(app)
      .get(`${BASE}${PAYMENT_ROUTES.GET_ALL}?activatorId=${a1.id}`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data.items as { id: string }[]).map((p) => p.id);
    expect(ids).toContain(p1.id);
    expect(ids).not.toContain(p2.id);
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .get(`${BASE}${PAYMENT_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /payments ───────────────────────────────────────────────────────────

describe('POST /payments', () => {
  it('201 — creates payment, decrements credits, logs SET_PAYMENT', async () => {
    const { user: adminUser, admin } = await seedAdmin(prisma);
    const { activator, user: actUser } = await seedActivator(prisma, { credits: 500 });
    seededAdminUserIds.push(adminUser.id);
    seededActivatorUserIds.push(actUser.id);

    const res = await request(app)
      .post(`${BASE}${PAYMENT_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`)
      .send({ activatorId: activator.id, amount: 100 });
    expect(res.status).toBe(201);
    seededPaymentIds.push(res.body.data.id);

    expect(res.body.data.amount).toBe(100);
    expect(res.body.data.previousCredits).toBe(500);

    const updated = await prisma.activator.findUnique({ where: { id: activator.id } });
    expect(Number(updated!.credits)).toBe(400);

    const log = await prisma.log.findFirst({
      where: { userId: adminUser.id, actionType: LogActionType.SET_PAYMENT },
    });
    expect(log).not.toBeNull();
  });

  it('409 — amount exceeds activator credits', async () => {
    const { user: adminUser } = await seedAdmin(prisma);
    const { activator, user: actUser } = await seedActivator(prisma, { credits: 50 });
    seededAdminUserIds.push(adminUser.id);
    seededActivatorUserIds.push(actUser.id);

    const res = await request(app)
      .post(`${BASE}${PAYMENT_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`)
      .send({ activatorId: activator.id, amount: 100 });
    expect(res.status).toBe(409);
  });

  it('404 — unknown activator returns 404', async () => {
    const { user: adminUser } = await seedAdmin(prisma);
    seededAdminUserIds.push(adminUser.id);

    const res = await request(app)
      .post(`${BASE}${PAYMENT_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`)
      .send({ activatorId: 'ffffffff-ffff-4fff-bfff-ffffffffffff', amount: 50 });
    expect(res.status).toBe(404);
  });

  it('403 — rejected for non-admin', async () => {
    const res = await request(app)
      .post(`${BASE}${PAYMENT_ROUTES.CREATE}`)
      .set('Authorization', `Bearer ${activatorToken()}`)
      .send({ activatorId: 'ffffffff-ffff-4fff-bfff-ffffffffffff', amount: 50 });
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /payments/:id ─────────────────────────────────────────────────────

describe('DELETE /payments/:id', () => {
  it('204 — soft-deletes payment, restores credits, logs DELETE_PAYMENT', async () => {
    const { user: adminUser, admin } = await seedAdmin(prisma);
    const { activator, user: actUser } = await seedActivator(prisma, { credits: 400 });
    seededAdminUserIds.push(adminUser.id);
    seededActivatorUserIds.push(actUser.id);

    const { payment } = await seedPayment(prisma, admin.id, activator.id, {
      amount: 100,
      previousCredits: 500,
    });
    seededPaymentIds.push(payment.id);

    const path = PAYMENT_ROUTES.DELETE.replace(':id', payment.id);
    const res = await request(app)
      .delete(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`);
    expect(res.status).toBe(204);

    const updated = await prisma.activator.findUnique({ where: { id: activator.id } });
    expect(Number(updated!.credits)).toBe(500);

    const log = await prisma.log.findFirst({
      where: { userId: adminUser.id, actionType: LogActionType.DELETE_PAYMENT },
    });
    expect(log).not.toBeNull();
  });

  it('409 — already-deleted payment returns RESOURCE_CONFLICT', async () => {
    const { user: adminUser, admin } = await seedAdmin(prisma);
    const { activator, user: actUser } = await seedActivator(prisma, { credits: 400 });
    seededAdminUserIds.push(adminUser.id);
    seededActivatorUserIds.push(actUser.id);

    const { payment } = await seedPayment(prisma, admin.id, activator.id, { isDeleted: true });
    seededPaymentIds.push(payment.id);

    const path = PAYMENT_ROUTES.DELETE.replace(':id', payment.id);
    const res = await request(app)
      .delete(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`);
    expect(res.status).toBe(409);
  });

  it('404 — unknown payment id', async () => {
    const { user: adminUser } = await seedAdmin(prisma);
    seededAdminUserIds.push(adminUser.id);

    const path = PAYMENT_ROUTES.DELETE.replace(':id', 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    const res = await request(app)
      .delete(`${BASE}${path}`)
      .set('Authorization', `Bearer ${adminToken(adminUser.id)}`);
    expect(res.status).toBe(404);
  });
});
