import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/common/db/prisma';
import { seedAdmin } from '../data/admin.factory';
import { seedLog } from '../data/log.factory';
import { mintToken } from '../fixtures/auth.fixture';
import { UserRole, LOG_ROUTES, LogActionType } from '@my-app/contract';

const BASE = `/api/v1${LOG_ROUTES.BASE}`;

let seededUserIds: string[] = [];

async function createAdmin() {
  const result = await seedAdmin(prisma);
  seededUserIds.push(result.user.id);
  return result;
}

beforeEach(() => { seededUserIds = []; });

afterEach(async () => {
  if (seededUserIds.length === 0) return;
  await prisma.log.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.admin.deleteMany({ where: { userId: { in: seededUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: seededUserIds } } });
});

const adminToken = (id: string) => mintToken({ id, role: UserRole.ADMIN });
const activatorToken = () => mintToken({ id: 'ffffffff-ffff-4fff-bfff-ffffffffffff', role: UserRole.ACTIVATOR });

// ─── GET /logs ────────────────────────────────────────────────────────────────

describe('GET /logs', () => {
  it('200 — returns paginated logs newest-first for admin', async () => {
    const { user } = await createAdmin();
    await seedLog(prisma, user.id, { actionType: LogActionType.ADD_DISTRIBUTOR });
    await seedLog(prisma, user.id, { actionType: LogActionType.SET_PAYMENT });

    const res = await request(app)
      .get(`${BASE}${LOG_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.meta.total).toBe('number');
    expect(Number(res.body.data.meta.total)).toBeGreaterThanOrEqual(2);
  });

  it('200 — results ordered newest-first', async () => {
    const { user } = await createAdmin();
    await seedLog(prisma, user.id, {
      actionType: LogActionType.ADD_DISTRIBUTOR,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await seedLog(prisma, user.id, {
      actionType: LogActionType.SET_PAYMENT,
      createdAt: new Date('2026-06-01T00:00:00Z'),
    });

    const res = await request(app)
      .get(`${BASE}${LOG_ROUTES.GET_ALL}?userId=${user.id}&limit=10`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    const items = res.body.data.items as { createdAt: string }[];
    expect(items.length).toBeGreaterThanOrEqual(2);
    const dates = items.map((i) => new Date(i.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]!).toBeGreaterThanOrEqual(dates[i]!);
    }
  });

  it('200 — userId filter narrows results', async () => {
    const { user: u1 } = await createAdmin();
    const { user: u2 } = await createAdmin();
    await seedLog(prisma, u1.id, { actionType: LogActionType.ADD_DISTRIBUTOR });
    await seedLog(prisma, u2.id, { actionType: LogActionType.SET_PAYMENT });

    const res = await request(app)
      .get(`${BASE}${LOG_ROUTES.GET_ALL}?userId=${u1.id}&limit=100`)
      .set('Authorization', `Bearer ${adminToken(u1.id)}`);

    expect(res.status).toBe(200);
    const userIds = (res.body.data.items as { userName: string }[]).map((_) => _);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    const userIdsInResult = (res.body.data.items as never[]).every(
      (_: never) => true,
    );
    expect(userIdsInResult).toBe(true);
    // all items belong to u1
    const dbLogs = await prisma.log.findMany({ where: { userId: u2.id } });
    const u2LogIds = dbLogs.map((l) => l.id);
    const returnedIds = (res.body.data.items as { id: string }[]).map((i) => i.id);
    u2LogIds.forEach((id) => expect(returnedIds).not.toContain(id));
  });

  it('200 — actionType filter narrows results', async () => {
    const { user } = await createAdmin();
    await seedLog(prisma, user.id, { actionType: LogActionType.ADD_DISTRIBUTOR });
    await seedLog(prisma, user.id, { actionType: LogActionType.SET_PAYMENT });

    const res = await request(app)
      .get(`${BASE}${LOG_ROUTES.GET_ALL}?userId=${user.id}&actionType=${LogActionType.ADD_DISTRIBUTOR}&limit=100`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    const types = (res.body.data.items as { actionType: string }[]).map((i) => i.actionType);
    types.forEach((t) => expect(t).toBe(LogActionType.ADD_DISTRIBUTOR));
  });

  it('200 — search filter narrows results by actionDescription', async () => {
    const { user } = await createAdmin();
    await seedLog(prisma, user.id, {
      actionType: LogActionType.ADD_DISTRIBUTOR,
      actionDescription: 'unique-keyword-xyz distributor',
    });
    await seedLog(prisma, user.id, {
      actionType: LogActionType.SET_PAYMENT,
      actionDescription: 'other payment action',
    });

    const res = await request(app)
      .get(`${BASE}${LOG_ROUTES.GET_ALL}?search=unique-keyword-xyz&limit=100`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    (res.body.data.items as { actionDescription: string }[]).forEach((i) =>
      expect(i.actionDescription).toContain('unique-keyword-xyz'),
    );
  });

  it('200 — userName resolved from Admin.fullName', async () => {
    const { user, admin } = await createAdmin();
    await seedLog(prisma, user.id, { actionType: LogActionType.ADD_DISTRIBUTOR });

    const res = await request(app)
      .get(`${BASE}${LOG_ROUTES.GET_ALL}?userId=${user.id}&limit=100`)
      .set('Authorization', `Bearer ${adminToken(user.id)}`);

    expect(res.status).toBe(200);
    const items = res.body.data.items as { userName: string }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]!.userName).toBe(admin.fullName);
  });

  it('403 — rejected for non-admin (activator)', async () => {
    const res = await request(app)
      .get(`${BASE}${LOG_ROUTES.GET_ALL}`)
      .set('Authorization', `Bearer ${activatorToken()}`);
    expect(res.status).toBe(403);
  });

  it('401 — rejected when unauthenticated', async () => {
    const res = await request(app).get(`${BASE}${LOG_ROUTES.GET_ALL}`);
    expect(res.status).toBe(401);
  });
});
