import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ZodError } from 'zod';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import type { Request, Response, NextFunction } from 'express';

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({
    body: {},
    query: {},
    params: {},
    validated: {},
    headers: {},
    ...overrides,
  }) as unknown as Request;

const mockRes = {} as Response;
const next: NextFunction = vi.fn();

describe('validateRequest', () => {
  it('(a) valid body — populates req.validated.body with parsed value', () => {
    const schema = z.object({ name: z.string() });
    const req = makeReq({ body: { name: 'Alice' } });

    validateRequest({ body: schema })(req, mockRes, next);

    expect(req.validated.body).toEqual({ name: 'Alice' });
    expect(next).toHaveBeenCalledWith();
  });

  it('(b) z.coerce.number() in query — stores typed number from string input', () => {
    const schema = z.object({ page: z.coerce.number() });
    const req = makeReq({ query: { page: '3' } as unknown as Request['query'] });

    validateRequest({ query: schema })(req, mockRes, next);

    expect((req.validated.query as { page: number }).page).toBe(3);
    expect(next).toHaveBeenCalledWith();
  });

  it('(c) invalid input — forwards ZodError to next', () => {
    const schema = z.object({ age: z.number() });
    const req = makeReq({ body: { age: 'not-a-number' } });

    validateRequest({ body: schema })(req, mockRes, next);

    const call = (next as ReturnType<typeof vi.fn>).mock.calls.at(-1) as [unknown];
    expect(call[0]).toBeInstanceOf(ZodError);
  });
});
