import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '@modules/auth/auth.service';
import { ErrorCode, UserRole } from '@my-app/contract';
import { userEntity } from '../../../data/user.factory';
import { hashPassword } from '@common/utils/password.utils';
import { hashRefreshToken, generateOpaqueToken } from '@common/utils/token.utils';

// Helpers to build mock Prisma
const makeUser = (overrides = {}) =>
  userEntity({ role: 'ADMIN', ...overrides });

const buildPrisma = (overrides: Record<string, unknown> = {}) => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    create: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn(),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  admin: { findUnique: vi.fn() },
  activator: { findUnique: vi.fn() },
  ...overrides,
});

describe('AuthService.login', () => {
  it('returns AuthTokensDTO with role on success', async () => {
    const plain = 'Password123!';
    const hash = await hashPassword(plain);
    const user = makeUser({ password: hash, isEnabled: true, deletedAt: null });

    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);

    const service = new AuthService(prisma as any);
    const result = await service.login({ username: user.username, password: plain });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('updates lastLoginAt on success', async () => {
    const plain = 'Password123!';
    const hash = await hashPassword(plain);
    const user = makeUser({ password: hash, isEnabled: true, deletedAt: null });

    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);

    const service = new AuthService(prisma as any);
    await service.login({ username: user.username, password: plain });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastLoginAt: expect.any(Date) }) }),
    );
  });

  it('stores the refresh token as a hash, not plaintext', async () => {
    const plain = 'Password123!';
    const hash = await hashPassword(plain);
    const user = makeUser({ password: hash, isEnabled: true, deletedAt: null });

    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);

    const service = new AuthService(prisma as any);
    const result = await service.login({ username: user.username, password: plain });

    const createCall = prisma.refreshToken.create.mock.calls[0]?.[0] as { data: { tokenHash: string } };
    expect(createCall.data.tokenHash).not.toBe(result.refreshToken);
    expect(createCall.data.tokenHash).toBe(hashRefreshToken(result.refreshToken));
  });

  const INVALID_CODE = ErrorCode.AUTH_INVALID_CREDENTIALS;
  const INVALID_MSG = 'Invalid credentials';

  it('throws AUTH_INVALID_CREDENTIALS (401) for unknown username', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new AuthService(prisma as any);
    const err = await service.login({ username: 'nobody', password: 'x' }).catch(e => e);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(INVALID_CODE);
    expect(err.message).toBe(INVALID_MSG);
  });

  it('throws AUTH_INVALID_CREDENTIALS (401) for disabled user — identical message', async () => {
    const user = makeUser({ isEnabled: false, deletedAt: null });
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user);

    const service = new AuthService(prisma as any);
    const err = await service.login({ username: user.username, password: 'x' }).catch(e => e);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(INVALID_CODE);
    expect(err.message).toBe(INVALID_MSG);
  });

  it('throws AUTH_INVALID_CREDENTIALS (401) for soft-deleted user — identical message', async () => {
    const user = makeUser({ isEnabled: true, deletedAt: new Date() });
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user);

    const service = new AuthService(prisma as any);
    const err = await service.login({ username: user.username, password: 'x' }).catch(e => e);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(INVALID_CODE);
    expect(err.message).toBe(INVALID_MSG);
  });

  it('throws AUTH_INVALID_CREDENTIALS (401) for wrong password — identical message', async () => {
    const hash = await hashPassword('CorrectPassword!');
    const user = makeUser({ password: hash, isEnabled: true, deletedAt: null });
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user);

    const service = new AuthService(prisma as any);
    const err = await service.login({ username: user.username, password: 'WrongPassword!' }).catch(e => e);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(INVALID_CODE);
    expect(err.message).toBe(INVALID_MSG);
  });
});

describe('AuthService.refresh', () => {
  it('rotates the token: deletes old, stores new hash, returns new tokens', async () => {
    const user = makeUser();
    const raw = generateOpaqueToken();
    const hash = hashRefreshToken(raw);
    const stored = {
      tokenHash: hash,
      expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: { id: user.id, role: user.role },
    };

    const prisma = buildPrisma();
    prisma.refreshToken.findUnique.mockResolvedValue(stored);

    const service = new AuthService(prisma as any);
    const result = await service.refresh({ refreshToken: raw });

    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { tokenHash: hash } });
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(raw);
  });

  it('throws AUTH_UNAUTHORIZED for an unknown token', async () => {
    const prisma = buildPrisma();
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    const service = new AuthService(prisma as any);
    const err = await service.refresh({ refreshToken: generateOpaqueToken() }).catch(e => e);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCode.AUTH_UNAUTHORIZED);
  });

  it('throws AUTH_UNAUTHORIZED and cleans up an expired token', async () => {
    const raw = generateOpaqueToken();
    const hash = hashRefreshToken(raw);
    const expired = {
      tokenHash: hash,
      expiredAt: new Date(Date.now() - 1000),
      user: { id: 'uid', role: 'ADMIN' },
    };

    const prisma = buildPrisma();
    prisma.refreshToken.findUnique.mockResolvedValue(expired);

    const service = new AuthService(prisma as any);
    const err = await service.refresh({ refreshToken: raw }).catch(e => e);
    expect(err.statusCode).toBe(401);
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { tokenHash: hash } });
  });
});

describe('AuthService.logout', () => {
  it('deletes the matching refresh token row', async () => {
    const prisma = buildPrisma();
    const service = new AuthService(prisma as any);
    const raw = generateOpaqueToken();

    await service.logout({ refreshToken: raw });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashRefreshToken(raw) },
    });
  });

  it('is idempotent — resolves even when no row exists (count 0)', async () => {
    const prisma = buildPrisma();
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    const service = new AuthService(prisma as any);
    await expect(service.logout({ refreshToken: generateOpaqueToken() })).resolves.toBeUndefined();
  });
});

describe('AuthService.me', () => {
  it('returns SessionUserDTO for an admin principal', async () => {
    const user = makeUser({ role: 'ADMIN' });
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.admin.findUnique.mockResolvedValue({ fullName: 'Alice Admin' });

    const service = new AuthService(prisma as any);
    const result = await service.me({ id: user.id, role: UserRole.ADMIN });
    expect(result.fullName).toBe('Alice Admin');
    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('returns SessionUserDTO for an activator principal', async () => {
    const user = makeUser({ role: 'ACTIVATOR' });
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.activator.findUnique.mockResolvedValue({ fullName: 'Bob Activator' });

    const service = new AuthService(prisma as any);
    const result = await service.me({ id: user.id, role: UserRole.ACTIVATOR });
    expect(result.fullName).toBe('Bob Activator');
    expect(result.role).toBe(UserRole.ACTIVATOR);
  });
});
