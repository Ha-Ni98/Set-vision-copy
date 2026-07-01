import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '@modules/admin/admin.service';
import { ErrorCode, UserRole, LogActionType } from '@my-app/contract';
import { userEntity } from '../../../data/user.factory';
import { adminEntity } from '../../../data/admin.factory';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

function buildPrisma() {
  const p = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    admin: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
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

// Returns a full Admin+User pair for include: { user: true } returns
function makeAdminWithUser(adminOverrides = {}, userOverrides = {}) {
  const user = userEntity({ role: 'ADMIN', ...userOverrides });
  const admin = adminEntity({ userId: user.id, ...adminOverrides });
  return { ...admin, user };
}

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('AdminService.getAll', () => {
  it('returns paginated result with items and meta', async () => {
    const record = makeAdminWithUser();
    const prisma = buildPrisma();
    prisma.admin.findMany.mockResolvedValue([record]);
    prisma.admin.count.mockResolvedValue(1);

    const service = new AdminService(prisma as any);
    const result = await service.getAll({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
  });

  it('passes search term in where clause', async () => {
    const prisma = buildPrisma();
    prisma.admin.findMany.mockResolvedValue([]);
    prisma.admin.count.mockResolvedValue(0);

    const service = new AdminService(prisma as any);
    await service.getAll({ page: 1, limit: 10, search: 'alice' });

    const findManyCall = prisma.admin.findMany.mock.calls[0]?.[0] as { where: unknown };
    expect(JSON.stringify(findManyCall.where)).toContain('alice');
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('AdminService.create', () => {
  it('throws RESOURCE_CONFLICT (409) when username is already taken', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(userEntity());

    const service = new AdminService(prisma as any);
    const err = await service
      .create({ fullName: 'Alice', username: 'alice', phone: '0600000000' }, ACTOR_ID)
      .catch((e) => e);

    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('creates User + Admin in a transaction and returns AdminWithCredentialsDTO', async () => {
    const newUser = userEntity({ role: 'ADMIN' });
    const newAdmin = adminEntity({ userId: newUser.id });

    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(newUser);
    prisma.admin.create.mockResolvedValue(newAdmin);

    const service = new AdminService(prisma as any);
    const result = await service.create(
      { fullName: 'Alice', username: 'alice', phone: '0600000000' },
      ACTOR_ID,
    );

    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.admin.create).toHaveBeenCalled();
    expect(typeof result.generatedPassword).toBe('string');
    expect(result.generatedPassword.length).toBeGreaterThan(0);
  });

  it('writes a CHANGE_USER_INFORMATION log on create', async () => {
    const newUser = userEntity({ role: 'ADMIN' });
    const newAdmin = adminEntity({ userId: newUser.id });

    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(newUser);
    prisma.admin.create.mockResolvedValue(newAdmin);

    const service = new AdminService(prisma as any);
    await service.create(
      { fullName: 'Alice', username: 'alice', phone: '0600000000' },
      ACTOR_ID,
    );

    const logCall = prisma.log.create.mock.calls[0]?.[0] as { data: { actionType: string; userId: string } };
    expect(logCall.data.actionType).toBe(LogActionType.CHANGE_USER_INFORMATION);
    expect(logCall.data.userId).toBe(ACTOR_ID);
  });
});

// ─── getById ─────────────────────────────────────────────────────────────────

describe('AdminService.getById', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(null);

    const service = new AdminService(prisma as any);
    const err = await service.getById('unknown-id').catch((e) => e);

    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });

  it('returns AdminDTO for a found admin', async () => {
    const record = makeAdminWithUser();
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(record);

    const service = new AdminService(prisma as any);
    const dto = await service.getById(record.id);

    expect(dto.id).toBe(record.id);
    expect(dto.username).toBe(record.user.username);
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('AdminService.update', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(null);

    const service = new AdminService(prisma as any);
    const err = await service.update('bad-id', { fullName: 'New' }, ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(404);
  });

  it('throws RESOURCE_CONFLICT (409) when new username is already taken', async () => {
    const record = makeAdminWithUser();
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(record);
    prisma.user.findUnique.mockResolvedValue(userEntity()); // conflict

    const service = new AdminService(prisma as any);
    const err = await service
      .update(record.id, { username: 'taken_name' }, ACTOR_ID)
      .catch((e) => e);

    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('writes CHANGE_USER_INFORMATION log on update', async () => {
    const record = makeAdminWithUser();
    const updatedUser = { ...record.user, username: 'new_username' };

    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(record);
    prisma.user.findUnique.mockResolvedValue(null); // no conflict
    prisma.user.update.mockResolvedValue(updatedUser);
    prisma.admin.update.mockResolvedValue(record);

    const service = new AdminService(prisma as any);
    await service.update(record.id, { username: 'new_username' }, ACTOR_ID);

    const logCall = prisma.log.create.mock.calls[0]?.[0] as { data: { actionType: string } };
    expect(logCall.data.actionType).toBe(LogActionType.CHANGE_USER_INFORMATION);
  });
});

// ─── toggle ──────────────────────────────────────────────────────────────────

describe('AdminService.toggle', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(null);

    const service = new AdminService(prisma as any);
    const err = await service.toggle('bad-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(404);
  });

  it('flips isEnabled and writes CHANGE_USER_STAT log', async () => {
    const record = makeAdminWithUser({}, { isEnabled: true });
    const updatedUser = { ...record.user, isEnabled: false };
    const updatedAdmin = { ...record, isEnabled: false };

    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(record);
    prisma.user.update.mockResolvedValue(updatedUser);
    prisma.admin.update.mockResolvedValue(updatedAdmin);

    const service = new AdminService(prisma as any);
    const dto = await service.toggle(record.id, ACTOR_ID);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isEnabled: false } }),
    );
    const logCall = prisma.log.create.mock.calls[0]?.[0] as { data: { actionType: string } };
    expect(logCall.data.actionType).toBe(LogActionType.CHANGE_USER_STAT);
    expect(dto.isEnabled).toBe(false);
  });

  it('syncs Admin.isEnabled in the same transaction', async () => {
    const record = makeAdminWithUser({}, { isEnabled: false });
    const updatedUser = { ...record.user, isEnabled: true };
    const updatedAdmin = { ...record, isEnabled: true };

    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(record);
    prisma.user.update.mockResolvedValue(updatedUser);
    prisma.admin.update.mockResolvedValue(updatedAdmin);

    const service = new AdminService(prisma as any);
    await service.toggle(record.id, ACTOR_ID);

    expect(prisma.admin.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isEnabled: true } }),
    );
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe('AdminService.resetPassword', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(null);

    const service = new AdminService(prisma as any);
    const err = await service.resetPassword('bad-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(404);
  });

  it('returns a new generatedPassword and writes CHANGE_USER_PASSWORD log', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue({
      userId: 'user-123',
      user: { username: 'admin_user' },
    });
    prisma.user.update.mockResolvedValue({});

    const service = new AdminService(prisma as any);
    const result = await service.resetPassword('admin-id', ACTOR_ID);

    expect(typeof result.generatedPassword).toBe('string');
    expect(result.generatedPassword.length).toBeGreaterThan(0);

    const logCall = prisma.log.create.mock.calls[0]?.[0] as { data: { actionType: string } };
    expect(logCall.data.actionType).toBe(LogActionType.CHANGE_USER_PASSWORD);
  });
});

// ─── delete ──────────────────────────────────────────────────────────────────

describe('AdminService.delete', () => {
  it('throws RESOURCE_NOT_FOUND (404) for unknown id', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue(null);

    const service = new AdminService(prisma as any);
    const err = await service.delete('bad-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(404);
  });

  it('throws AUTH_FORBIDDEN (403) when trying to delete self', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue({ userId: ACTOR_ID });

    const service = new AdminService(prisma as any);
    const err = await service.delete('some-admin-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ErrorCode.AUTH_FORBIDDEN);
  });

  it('throws RESOURCE_CONFLICT (409) when deleting the last enabled admin', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue({ userId: 'other-user-id' });
    prisma.user.count.mockResolvedValue(1);

    const service = new AdminService(prisma as any);
    const err = await service.delete('some-admin-id', ACTOR_ID).catch((e) => e);

    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.RESOURCE_CONFLICT);
  });

  it('soft-deletes the user and disables admin when guards pass', async () => {
    const prisma = buildPrisma();
    prisma.admin.findFirst.mockResolvedValue({ userId: 'other-user-id' });
    prisma.user.count.mockResolvedValue(2);
    prisma.user.update.mockResolvedValue({});
    prisma.admin.update.mockResolvedValue({});

    const service = new AdminService(prisma as any);
    await service.delete('some-admin-id', ACTOR_ID);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date), isEnabled: false }),
      }),
    );
    expect(prisma.admin.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isEnabled: false } }),
    );
  });
});
