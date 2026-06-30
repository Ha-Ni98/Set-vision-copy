import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { logger } from '../config/logger';
import { ErrorCode } from '@my-app/contract';

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: ErrorCode.VALIDATION_ERROR, message: 'Validation failed', details: err.issues },
    });
    return;
  }
  logger.error({ err }, 'Uncaught exception');
  res.status(500).json({
    success: false,
    error: { code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' },
  });
};
