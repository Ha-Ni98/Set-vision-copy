import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { ActivatorService } from '@modules/activator/activator.service';
import { ErrorCode, UserRole, LogActionType } from '@my-app/contract';
import { userEntity } from '../../../data/user.factory';
import { activatorEntity } from '../../../data/activator.factory';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

function buildPrisma() {
  const p = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    activator: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    activation: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { activationPrice: null } }),
    },
    log: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(
    async (fn: (tx: typeof p) => Promise<unknown>) => fn(p),
  );
  return p;
}

const ACTOR_ID = 'actor-user-id-000';

function makeActivatorWithUser(activatorOverrides = {}, userOverrides = {}) {
  const user = userEntity({ role: UserRole.ACTIVATOR, ...userOverrides });
  const activator = activatorEntity({ userId: user.id, ...activatorOverrides });
  return {
    ...activator,
    user,
    activations: [] as Array<{ takenAt: Date | null; completedAt: Date | null }>,
    payments: [] as Array<{ totalAmount: Prisma.Decimal }>,
  };
}

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('ActivatorService.getAll', () => {
  it('returns paginated result with items and meta', async () => {
    const record = makeActivatorWithUser();
    const prisma = buildPrisma();
    prisma.activator.findMany.mockResolvedValue([record]);
    prisma.activator.count.mockResolvedValue(1);

    const service = new ActivatorService(prisma as any);
    const result = await service.getAll({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it('derives avgActivationTimeSeconds as null when no completed activations', async () => {
    const record = makeActivatorWithUser({}, {});
    record.activations = [];
    const prisma = buildPrisma();
    prisma.activator.findMany.mockResolvedValue([record]);
    prisma.activator.count.mockResolvedValue(1);

    const service = new ActivatorService(prisma as any);
    const result = await service.getAll({ page: 1, limit: 10 });

    expect(result.items[0]?.avgActivationTimeSeconds).toBeNull();
  });

  it('derives avgActivationTimeSeconds from completed activations', async () => {
    const takenAt = new Date('2025-06-01T10:00:00.000Z');
    const completedAt = new Date('2025-06-01T10:02:00.000Z'); // 120 seconds
    const record = makeActivatorWithUser();
    record.activations = [{ takenAt, completedAt }];
    const prisma = buildPrisma();
    prisma.activator.findMany.mockResolvedValue([record]);
    prisma.activator.count.mockResolvedValue(1);

    const service = new ActivatorService(prisma as any);
    const result = await service.getAll({ page: 1, limit: 10 });

    expect(result.items[0]?.avgActivationTimeSeconds).toBe(120);
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('ActivatorService.create', () => {
  it('throws RESOURCE_CONFLICT (409) when username is already taken', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(userEntity());

    const service = new ActivatorService(prisma as any);
    const err = await service
      .create({ fullName: 'Alice', username: 'alice', phone: '0600000000' }, ACTOR_ID)
      .catch((e) => e);

    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('creates User(ACTIVATOR) + Activator in a transaction with credits from initialCredits', async () => {
    const newUser = userEntity({ role: UserRole.ACTIVATOR });
    const newActivator = activatorEntity({ userId: newUser.id, credits: new Prisma.Decimal(50) });

    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(newUser);
    prisma.activator.create.mockResolvedValue(newActivator);

    const service = new ActivatorService(prisma as any);
    const result = await service.create(
      { fullName: 'Alice', username: 'alice', phone: '0600000000', initialCredits: 50 },
      ACTOR_ID,
    );

    const createCall = prisma.activator.create.mock.calls[0]?.[0] as { data: { credits: number } };
    expect(createCall.data.credits).toBe(50);
    expect(typeof result.generatedPassword).toBe('string');
    expect(result.generatedPassword.length).toBeGreaterThan(0);
  });

  it('defaults credits to 0 when initialCredits is absent', async () => {
    const newUser = userEntity({ role: UserRole.ACTIVATOR });
    const newActivator = activatorEntity({ userId: newUser.id });

    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(newUser);
    prisma.activator.create.mockResolvedValue(newActivator);

    const service = new ActivatorService(prisma as any);
    await service.create({ fullName: 'Bob', username: 'bob', phone: '0600000001' }, ACTOR_ID);

    const createCall = prisma.activator.create.mock.calls[0]?.[0] as { data: { credits: number } };
    expect(createCall.data.credits).toBe(0);
  });

  it('writes CHANGE_USER_INFORMATION log on create', async () => {
    const newUser = userEntity({ role: UserRole.ACTIVATOR });
    const newActivator = activatorEntity({ userId: newUser.id });

    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(newUser);
    prisma.activator.create.mockResolvedValue(newActivator);

    const service = new ActivatorService(prisma as any);
    await service.create({ fullName: 'Alice', username: 'alice', phone: '0600000000' }, ACTOR_ID);

    const logCall = prisma.log.create.mock.calls[0]?.[0] as {
      data: { actionType: string; userId: string };
    };
    expect(logCall.data.actionType).toBe(LogActionType.CHANGE_USER_INFORMATION);
    expect(logCall.data.userId).toBe(ACTOR_ID);
  });
});

// ─── getById ─────────────────────────────────────────────────────────────────

describe('ActivatorService.getById', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(null);

    const service = new ActivatorService(prisma as any);
    const err = await service.getById('unknown-id').catch((e) => e);

    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  it('computes successRate as nbOfSuccessful / nbOfActivation', async () => {
    const record = makeActivatorWithUser({
      nbOfActivation: 10,
      nbOfSuccessfulActivation: 5,
    });
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);

    const service = new ActivatorService(prisma as any);
    const dto = await service.getById(record.id);

    expect(dto.successRate).toBeCloseTo(0.5);
  });

  it('guards successRate against ÷0: returns 0 when nbOfActivation is 0', async () => {
    const record = makeActivatorWithUser({ nbOfActivation: 0, nbOfSuccessfulActivation: 0 });
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);

    const service = new ActivatorService(prisma as any);
    const dto = await service.getById(record.id);

    expect(dto.successRate).toBe(0);
  });

  it('sums non-deleted payments for totalPaid', async () => {
    const record = makeActivatorWithUser();
    record.payments = [
      { totalAmount: new Prisma.Decimal(100) },
      { totalAmount: new Prisma.Decimal(50) },
    ] as any;
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);

    const service = new ActivatorService(prisma as any);
    const dto = await service.getById(record.id);

    expect(dto.totalPaid).toBe(150);
  });

  it('sets creditsOwed equal to credits (mirror)', async () => {
    const record = makeActivatorWithUser({ credits: new Prisma.Decimal(75.5) });
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);

    const service = new ActivatorService(prisma as any);
    const dto = await service.getById(record.id);

    expect(dto.creditsOwed).toBe(75.5);
    expect(dto.credits).toBe(75.5);
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('ActivatorService.update', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(null);

    const service = new ActivatorService(prisma as any);
    const err = await service.update('bad-id', { fullName: 'New' }, ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(404);
  });

  it('throws RESOURCE_CONFLICT (409) when new username is already taken', async () => {
    const record = makeActivatorWithUser();
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);
    prisma.user.findUnique.mockResolvedValue(userEntity()); // conflict

    const service = new ActivatorService(prisma as any);
    const err = await service
      .update(record.id, { username: 'taken_name' }, ACTOR_ID)
      .catch((e) => e);

    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('writes CHANGE_USER_INFORMATION log on update', async () => {
    const record = makeActivatorWithUser();
    const updatedUser = { ...record.user, username: 'new_username' };

    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue(updatedUser);
    prisma.activator.update.mockResolvedValue(record);

    const service = new ActivatorService(prisma as any);
    await service.update(record.id, { username: 'new_username' }, ACTOR_ID);

    const logCall = prisma.log.create.mock.calls[0]?.[0] as { data: { actionType: string } };
    expect(logCall.data.actionType).toBe(LogActionType.CHANGE_USER_INFORMATION);
  });
});

// ─── toggle ──────────────────────────────────────────────────────────────────

describe('ActivatorService.toggle', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(null);

    const service = new ActivatorService(prisma as any);
    const err = await service.toggle('bad-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(404);
  });

  it('flips isEnabled on User and writes CHANGE_USER_STAT log', async () => {
    const record = makeActivatorWithUser({}, { isEnabled: true });
    const updatedUser = { ...record.user, isEnabled: false };

    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);
    prisma.user.update.mockResolvedValue(updatedUser);

    const service = new ActivatorService(prisma as any);
    const dto = await service.toggle(record.id, ACTOR_ID);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isEnabled: false } }),
    );
    const logCall = prisma.log.create.mock.calls[0]?.[0] as { data: { actionType: string } };
    expect(logCall.data.actionType).toBe(LogActionType.CHANGE_USER_STAT);
    expect(dto.isEnabled).toBe(false);
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe('ActivatorService.resetPassword', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(null);

    const service = new ActivatorService(prisma as any);
    const err = await service.resetPassword('bad-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(404);
  });

  it('returns a new generatedPassword and writes CHANGE_USER_PASSWORD log', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue({
      userId: 'user-123',
      user: { username: 'activator_user' },
    });
    prisma.user.update.mockResolvedValue({});

    const service = new ActivatorService(prisma as any);
    const result = await service.resetPassword('activator-id', ACTOR_ID);

    expect(typeof result.generatedPassword).toBe('string');
    expect(result.generatedPassword.length).toBeGreaterThan(0);

    const logCall = prisma.log.create.mock.calls[0]?.[0] as { data: { actionType: string } };
    expect(logCall.data.actionType).toBe(LogActionType.CHANGE_USER_PASSWORD);
  });
});

// ─── delete ──────────────────────────────────────────────────────────────────

describe('ActivatorService.delete', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(null);

    const service = new ActivatorService(prisma as any);
    const err = await service.delete('bad-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(404);
  });

  it('throws RESOURCE_CONFLICT (409) when activator has in-progress activations', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue({ userId: 'other-user-id' });
    prisma.activation.count.mockResolvedValue(2);

    const service = new ActivatorService(prisma as any);
    const err = await service.delete('some-activator-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('soft-deletes User when no in-progress activations', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue({ userId: 'target-user-id' });
    prisma.activation.count.mockResolvedValue(0);
    prisma.user.update.mockResolvedValue({});

    const service = new ActivatorService(prisma as any);
    await service.delete('some-activator-id', ACTOR_ID);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date), isEnabled: false }),
      }),
    );
  });
});

// ─── myStats ─────────────────────────────────────────────────────────────────

describe('ActivatorService.myStats', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws AUTH_FORBIDDEN (403) when principal has no activator row', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(null);

    const service = new ActivatorService(prisma as any);
    const err = await service.myStats('non-activator-user-id').catch((e) => e);

    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });

  it('returns dashboard DTO with correct activeSlotsUsed', async () => {
    const record = makeActivatorWithUser();
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);
    prisma.activation.count
      .mockResolvedValueOnce(3)  // activeSlotsUsed
      .mockResolvedValueOnce(1); // activationsToday

    const service = new ActivatorService(prisma as any);
    const result = await service.myStats(record.userId);

    expect(result.activeSlotsUsed).toBe(3);
  });

  // Stage-04-fix #3.1: FREEZE hands the activation to the admin, so it must stop occupying
  // one of the activator's 3 slots — activeSlotsUsed excludes it (unlike the delete-guard's
  // IN_PROGRESS_STATS, which still includes FREEZE — covered in ActivatorService.delete).
  it('queries activeSlotsUsed with the 3 in-progress states, excluding FREEZE', async () => {
    const record = makeActivatorWithUser();
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);
    prisma.activation.count.mockResolvedValue(0);

    const service = new ActivatorService(prisma as any);
    await service.myStats(record.userId);

    const countCall = prisma.activation.count.mock.calls[0]?.[0] as {
      where: { activationStat: { in: string[] } };
    };
    const states = countCall.where.activationStat.in;
    expect(states).toContain('PROCESSING');
    expect(states).toContain('WRONG_INFORMATION');
    expect(states).toContain('ADDITIONAL_INFORMATION');
    expect(states).not.toContain('FREEZE');
    expect(states).toHaveLength(3);
  });

  it('returns earningsTrendPercent 0 when previous period had no earnings', async () => {
    const record = makeActivatorWithUser();
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);
    prisma.activation.count.mockResolvedValue(0);
    prisma.activation.aggregate
      .mockResolvedValueOnce({ _sum: { activationPrice: new Prisma.Decimal(100) } })
      .mockResolvedValueOnce({ _sum: { activationPrice: null } }); // prev = 0

    const service = new ActivatorService(prisma as any);
    const result = await service.myStats(record.userId);

    expect(result.earningsTrendPercent).toBe(0);
  });

  it('weekly array always has 7 entries', async () => {
    const record = makeActivatorWithUser();
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);
    prisma.activation.count.mockResolvedValue(0);

    const service = new ActivatorService(prisma as any);
    const result = await service.myStats(record.userId);

    expect(result.weekly).toHaveLength(7);
  });

  // Stage-04-fix #2A: 23:30 UTC is already past midnight in Algiers (00:30 next day) — a
  // naive local-midnight bucket key serialized via toISOString() drops this activation from
  // "today" entirely. Same fixed instant statistics.time.spec.ts pins todayStart() to.
  it("buckets a completedAt that's already 'tomorrow' in UTC into today's Algiers bucket, not dropped", async () => {
    vi.useFakeTimers({ now: new Date('2026-03-10T23:30:00.000Z').getTime() });
    const record = makeActivatorWithUser();
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(record);
    prisma.activation.count.mockResolvedValue(0);
    prisma.activation.findMany
      .mockResolvedValueOnce([{ completedAt: new Date('2026-03-10T23:45:00.000Z') }]) // weeklyActivations
      .mockResolvedValueOnce([]); // completedActivations (avg-time calc)

    const service = new ActivatorService(prisma as any);
    const result = await service.myStats(record.userId);

    expect(result.weekly).toHaveLength(7);
    const today = result.weekly[6]!;
    expect(today.date).toBe('2026-03-10T23:00:00.000Z');
    expect(today.count).toBe(1);
    const totalBucketed = result.weekly.reduce((sum, d) => sum + d.count, 0);
    expect(totalBucketed).toBe(1);
  });
});

// ─── performance ─────────────────────────────────────────────────────────────

describe('ActivatorService.performance', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown activator', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue(null);

    const service = new ActivatorService(prisma as any);
    const err = await service.performance('bad-id', { days: 30 }).catch((e) => e);

    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  it('returns empty series when no ACTIVATED activations in range', async () => {
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue({ id: 'act-id' });
    prisma.activation.findMany.mockResolvedValue([]);

    const service = new ActivatorService(prisma as any);
    const result = await service.performance('act-id', { days: 30 });

    expect(result.series).toHaveLength(0);
  });

  it('groups activations by day and sums earned', async () => {
    const day = '2025-06-01';
    const prisma = buildPrisma();
    prisma.activator.findFirst.mockResolvedValue({ id: 'act-id' });
    prisma.activation.findMany.mockResolvedValue([
      { completedAt: new Date(`${day}T10:00:00.000Z`), activationPrice: new Prisma.Decimal(100) },
      { completedAt: new Date(`${day}T14:00:00.000Z`), activationPrice: new Prisma.Decimal(50) },
    ]);

    const service = new ActivatorService(prisma as any);
    const result = await service.performance('act-id', { days: 30 });

    expect(result.series).toHaveLength(1);
    expect(result.series[0]?.count).toBe(2);
    expect(result.series[0]?.earned).toBe(150);
  });
});
