import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    API_PREFIX: z.string().default('/api/v1'),
    DATABASE_URL: z.url(),
    CORS_ORIGIN: z.string().default('*'),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRATION: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    WS_PATH: z.string().default('/socket.io'),

    // ── Notifications (Set 6) ────────────────────────────────────────────────
    // z.stringbool(), NOT z.coerce.boolean(): coerce.boolean("false") === true, so the
    // string "false" from a .env file would silently ENABLE the subsystem.
    NOTIFICATIONS_ENABLED: z.stringbool().default(false),
    TELEGRAM_MODE: z.enum(['polling', 'webhook']).default('polling'),
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
    TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(32).optional(),
    // Origin only (e.g. https://svc.onrender.com), no path — the path is derived from
    // API_PREFIX + TELEGRAM_ROUTES so it can never drift from where the route is mounted.
    TELEGRAM_WEBHOOK_BASE_URL: z.url().optional(),
  })
  // Conditionally required, so NOTIFICATIONS_ENABLED=false boots with no dummy values while
  // an enabled-but-misconfigured boot CRASHES — that is intended (Set 6 plan §10).
  .superRefine((v, ctx) => {
    if (!v.NOTIFICATIONS_ENABLED) return;
    if (!v.TELEGRAM_BOT_TOKEN) {
      ctx.addIssue({
        code: 'custom',
        path: ['TELEGRAM_BOT_TOKEN'],
        message: 'Required when NOTIFICATIONS_ENABLED=true',
      });
    }
    if (!v.TELEGRAM_BOT_USERNAME) {
      ctx.addIssue({
        code: 'custom',
        path: ['TELEGRAM_BOT_USERNAME'],
        message: 'Required when NOTIFICATIONS_ENABLED=true (the deep link embeds it)',
      });
    }
    if (v.TELEGRAM_MODE === 'webhook' && !v.TELEGRAM_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['TELEGRAM_WEBHOOK_SECRET'],
        message: 'Required when TELEGRAM_MODE=webhook',
      });
    }
    if (v.TELEGRAM_MODE === 'webhook' && !v.TELEGRAM_WEBHOOK_BASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['TELEGRAM_WEBHOOK_BASE_URL'],
        message: 'Required when TELEGRAM_MODE=webhook (used to auto-register the webhook with Telegram on boot)',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
