import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { globalErrorHandler } from '@common/middlewares/error.middleware';
import { AppError, AuthError } from '@common/errors';
import { ErrorCode } from '@my-app/contract';

vi.mock('@common/config/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { logger } = await import('@common/config/logger');

const makeRes = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, _json: json } as unknown as Response & { _json: ReturnType<typeof vi.fn> };
};

const mockReq = {} as Request;
const mockNext = vi.fn() as unknown as NextFunction;

describe('globalErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(1) AppError — responds with the error statusCode and envelope', () => {
    const res = makeRes();
    const err = new AuthError('Not authenticated');
    globalErrorHandler(err, mockReq, res, mockNext);
    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(401);
    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code: ErrorCode.AUTH_UNAUTHORIZED }) }),
    );
  });

  it('(2) ZodError — responds 400 VALIDATION_ERROR with issues', () => {
    const res = makeRes();
    const err = new ZodError([]);
    globalErrorHandler(err as unknown as Error, mockReq, res, mockNext);
    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: ErrorCode.VALIDATION_ERROR }),
      }),
    );
  });

  it('(3) generic Error — calls logger.error and responds 500', () => {
    const res = makeRes();
    const err = new Error('boom');
    globalErrorHandler(err, mockReq, res, mockNext);
    expect(logger.error).toHaveBeenCalled();
    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(500);
    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: ErrorCode.INTERNAL_SERVER_ERROR }),
      }),
    );
  });
});
