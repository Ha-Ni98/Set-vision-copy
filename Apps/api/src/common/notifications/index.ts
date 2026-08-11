import type { PrismaClient } from '@prisma/client';
import { env } from '../../env';
import { prisma } from '../db/prisma';
import { logger } from '../config/logger';
import { buildProviderRegistry } from './providers/registry';
import { NotificationService } from './notification.service';
import { initNotificationSubscribers } from './notification.subscribers';
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
 * Registers the notification subscribers — a second, independent bus consumer alongside the
 * realtime gateway (Set 6 plan §0.4) — when enabled.
 */
export const initNotifications = (): void => {
  if (!env.NOTIFICATIONS_ENABLED) {
    logger.info('Notifications disabled — subscribers and poller not started');
    return;
  }
  initNotificationSubscribers(notificationService, prisma);
  logger.info({ mode: env.TELEGRAM_MODE }, 'Notifications enabled');
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
