import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../env';
import { AuthError } from '@common/errors';

const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

// The webhook is the only unauthenticated WRITE endpoint in the API (Set 6 plan §4). It
// cannot use requireAuth — the caller is Telegram's infrastructure, which has no User row and
// no way to obtain a JWT. This is the substitute authentication: Telegram echoes back
// whatever secret_token was passed to setWebhook, on every update, in this header.
export const requireWebhookSecret = (req: Request, _res: Response, next: NextFunction): void => {
  const provided = req.header(SECRET_HEADER) ?? '';
  const expected = env.TELEGRAM_WEBHOOK_SECRET ?? '';

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so compare lengths first — identical response
  // (401 AUTH_UNAUTHORIZED) whether the secret is wrong, empty, or the wrong length.
  const ok = expected.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!ok) {
    next(new AuthError('Invalid webhook secret'));
    return;
  }
  next();
};

// Defence in depth: caps a brute-force loop against the secret. Telegram's real traffic sits
// far below this limit.
export const webhookRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
