import type { PrismaClient } from '@prisma/client';
import { env } from '../../env';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { buildProviderRegistry } from './providers/registry';
import { NotificationService } from './notification.service';
import type { TelegramPollerDeps } from './telegram.poller';

const registry = buildProviderRegistry(
  env.NOTIFICATIONS_ENABLED ? (env.TELEGRAM_BOT_TOKEN ?? null) : null,
);

// The module-level singleton — same shape as the `prisma` singleton in common/db/prisma.ts.
// modules/telegram and modules/notification both need it (resend, the link confirmation).
export const notificationService = new NotificationService(prisma, registry);

/**
 * Called once from server.ts, before httpServer.listen. A no-op when
 * NOTIFICATIONS_ENABLED=false: no bus listener is registered, so the subsystem is inert.
 *
 * Set 6a scope only: the bus subscriber wiring (notification.subscribers.ts, the event →
 * recipients → template matrix) is Set 6b. This function currently only reports the
 * subsystem's armed/disabled state — linking and the delivery pipe (this file's other
 * exports) are fully functional in 6a regardless.
 */
export const initNotifications = (): void => {
  if (!env.NOTIFICATIONS_ENABLED) {
    logger.info('Notifications disabled — subscribers and poller not started');
    return;
  }
  logger.info(
    { mode: env.TELEGRAM_MODE },
    'Notifications enabled (Set 6a: linking + delivery pipe only — event subscribers land in Set 6b)',
  );
};

// Resolves what server.ts needs to start the poller, or null when it should not start one
// (disabled, or TELEGRAM_MODE=webhook). Centralised here so server.ts does not re-derive the
// env gating logic itself.
export const resolveTelegramPollerDeps = (): TelegramPollerDeps | null => {
  if (!env.NOTIFICATIONS_ENABLED || env.TELEGRAM_MODE !== 'polling') return null;
  if (!env.TELEGRAM_BOT_TOKEN) return null; // unreachable — env.ts superRefine already requires it
  return {
    prisma: prisma as PrismaClient,
    notificationService,
    botToken: env.TELEGRAM_BOT_TOKEN,
  };
};

export { startTelegramPoller, stopTelegramPoller } from './telegram.poller';
