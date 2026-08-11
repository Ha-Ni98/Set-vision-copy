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

// set-12-plan §6.4.1: the public key router (VERIFY/UPDATE/ADDITIONAL) has no auth at all, and
// the write endpoints' only "credential" is an unguessable but non-expiring activationId
// (R19). This is the one mitigation that fits without the declined key-check contract change —
// per-IP only (unlike loginRateLimiter there is no stable per-target identifier: VERIFY carries
// a card key in the body, UPDATE/ADDITIONAL carry an activationId in the path, and neither is a
// username-shaped field to key alongside the IP).
export const publicKeyRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => (ipKeyGenerator as (ip: string) => string)(req.ip ?? ''),
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many requests, please try again later.',
      },
    });
  },
});
