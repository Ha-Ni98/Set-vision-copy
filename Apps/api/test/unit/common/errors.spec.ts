import { describe, it, expect } from 'vitest';
import { ErrorCode } from '@my-app/contract';
import {
  AppError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../../src/common/errors/index.js';

describe('AppError', () => {
  it('is an instance of Error', () => {
    const err = new AppError(500, ErrorCode.INTERNAL_SERVER_ERROR, 'test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('exposes statusCode, code, message, and optional details', () => {
    const err = new AppError(400, ErrorCode.VALIDATION_ERROR, 'bad input', { field: 'email' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(err.message).toBe('bad input');
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('AuthError', () => {
  it('is an AppError with statusCode 401 and AUTH_UNAUTHORIZED', () => {
    const err = new AuthError('Missing token');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCode.AUTH_UNAUTHORIZED);
    expect(err.message).toBe('Missing token');
  });

  it('uses a default message when none provided', () => {
    const err = new AuthError();
    expect(err.message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('is an AppError with statusCode 403 and AUTH_FORBIDDEN', () => {
    const err = new ForbiddenError('Insufficient permissions');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ErrorCode.AUTH_FORBIDDEN);
    expect(err.message).toBe('Insufficient permissions');
  });
});

describe('NotFoundError', () => {
  it('is an AppError with statusCode 404 and RESOURCE_NOT_FOUND', () => {
    const err = new NotFoundError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
  });
});

describe('ConflictError', () => {
  it('is an AppError with statusCode 409 and RESOURCE_CONFLICT', () => {
    const err = new ConflictError('Already exists');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCode.RESOURCE_CONFLICT);
    expect(err.message).toBe('Already exists');
  });
});

describe('BadRequestError', () => {
  it('is an AppError with statusCode 400 and VALIDATION_ERROR', () => {
    const err = new BadRequestError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
  });
});
