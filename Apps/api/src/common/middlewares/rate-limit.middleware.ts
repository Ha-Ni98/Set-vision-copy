import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { ErrorCode } from '@my-app/contract';

export const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) =>
    `${(ipKeyGenerator as (ip: string) => string)(req.ip ?? '')}:${(req.body as { username?: string }).username ?? ''}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many login attempts, please try again later.',
      },
    });
  },
});
