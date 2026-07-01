import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { AuthError, ForbiddenError } from '@common/errors';
import { generateToken } from '@common/utils/token.utils';
import { UserRole } from '@my-app/contract';
import { faker } from '@faker-js/faker';

vi.mock('@common/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import('@common/db/prisma');

const makeReq = (authHeader?: string): Request =>
  ({
    headers: authHeader ? { authorization: authHeader } : {},
    validated: {},
  }) as unknown as Request;

const mockRes = {} as Response;

const callMiddleware = async (
  req: Request,
  options: Parameters<typeof requireAuth>[0] = {},
): Promise<unknown> => {
  const next = vi.fn() as NextFunction;
  await requireAuth(options)(req, mockRes, next);
  return (next as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
};

const adminPayload = { id: faker.string.uuid(), role: UserRole.ADMIN };
const activatorPayload = { id: faker.string.uuid(), role: UserRole.ACTIVATOR };

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(1) missing authorization header — next receives AuthError', async () => {
    const err = await callMiddleware(makeReq());
    expect(err).toBeInstanceOf(AuthError);
  });

  it('(2) malformed / invalid token — next receives AuthError("Invalid token")', async () => {
    const err = await callMiddleware(makeReq('Bearer not.a.valid.jwt'));
    expect(err).toBeInstanceOf(AuthError);
    expect((err as AuthError).message).toBe('Invalid token');
  });

  it('(3) valid token without checkDB — req.user set and next called without error', async () => {
    const token = generateToken(adminPayload);
    const req = makeReq(`Bearer ${token}`);
    const err = await callMiddleware(req);
    expect(err).toBeUndefined();
    expect(req.user?.id).toBe(adminPayload.id);
    expect(req.user?.role).toBe(UserRole.ADMIN);
  });

  it('(4) checkDB: true with isEnabled: false — next receives AuthError("Account disabled")', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { role: UserRole.ADMIN, isEnabled: false } as never,
    );
    const token = generateToken(adminPayload);
    const req = makeReq(`Bearer ${token}`);
    const err = await callMiddleware(req, { checkDB: true });
    expect(err).toBeInstanceOf(AuthError);
    expect((err as AuthError).message).toBe('Account disabled');
  });

  it('(5) roles: [ADMIN] against role: ACTIVATOR — next receives ForbiddenError', async () => {
    const token = generateToken(activatorPayload);
    const req = makeReq(`Bearer ${token}`);
    const err = await callMiddleware(req, { roles: [UserRole.ADMIN] });
    expect(err).toBeInstanceOf(ForbiddenError);
  });
});
