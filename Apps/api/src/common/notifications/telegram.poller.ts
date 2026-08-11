import type { PrismaClient } from '@prisma/client';
import { getUpdates, deleteWebhook, TelegramApiError } from './telegram.api';
import { handleTelegramUpdate } from './telegram.intake';
import type { NotificationService } from './notification.service';
import { logger } from '../config/logger';

const MAX_BACKOFF_MS = 60_000;
const POLL_TIMEOUT_SEC = 30;

let controller: AbortController | null = null;
let running = false;

export type TelegramPollerDeps = {
  prisma: PrismaClient;
  notificationService: NotificationService;
  botToken: string;
};

// Started inside httpServer.listen's callback (Set 6 plan §7.1) — this is the FIRST
// long-running background process in this app. Idempotent: a second call while already
// running is a no-op.
export const startTelegramPoller = (deps: TelegramPollerDeps): void => {
  if (running) return;
  running = true;
  controller = new AbortController();
  void loop(deps, controller.signal);
};

// MUST be the first statement in server.ts's shutdown() — aborts the in-flight long poll
// immediately rather than waiting up to 30s for it to return naturally.
export const stopTelegramPoller = (): void => {
  running = false;
  controller?.abort();
  controller = null;
};

async function loop(deps: TelegramPollerDeps, signal: AbortSignal): Promise<void> {
  // A webhook registered on the SAME bot token makes every getUpdates call 409. Clearing it
  // on start is a deliberate side effect on shared bot state — this is exactly why the plan
  // requires a SEPARATE bot token for polling vs. the deployed webhook (Set 6 plan §7.5).
  try {
    await deleteWebhook(deps.botToken);
  } catch (err) {
    logger.warn({ err }, 'Failed to clear any existing Telegram webhook before polling');
  }

  let offset = 0;
  let backoffMs = 0;
  let warnedConflict = false;

  logger.info('Telegram poller started');

  while (running && !signal.aborted) {
    try {
      const updates = await getUpdates({
        botToken: deps.botToken,
        offset,
        timeoutSec: POLL_TIMEOUT_SEC,
        signal,
      });
      backoffMs = 0;
      warnedConflict = false;

      for (const update of updates) {
        const id = await handleTelegramUpdate(deps.prisma, deps.notificationService, deps.botToken, update);
        if (id !== null && id >= offset) offset = id + 1;
      }
    } catch (err) {
      if (signal.aborted) break; // clean shutdown, not an error

      if (err instanceof TelegramApiError && err.status === 401) {
        logger.fatal({ err }, 'Telegram bot token rejected (401) — stopping poller');
        running = false;
        break;
      }

      if (err instanceof TelegramApiError && err.status === 409) {
        if (!warnedConflict) {
          logger.error(
            { err },
            'Telegram getUpdates 409 — another getUpdates consumer or a registered webhook is active for this bot token',
          );
          warnedConflict = true;
        }
        backoffMs = MAX_BACKOFF_MS;
      } else {
        backoffMs = nextBackoff(backoffMs, err);
        logger.error({ err, backoffMs }, 'Telegram getUpdates failed');
      }

      await sleep(backoffMs, signal);
    }
  }

  logger.info('Telegram poller stopped');
}

function nextBackoff(current: number, err: unknown): number {
  const base = current === 0 ? 1_000 : Math.min(current * 2, MAX_BACKOFF_MS);
  const retryAfterMs = err instanceof TelegramApiError && err.retryAfterSec ? err.retryAfterSec * 1000 : 0;
  const jitter = Math.floor(Math.random() * 250);
  return Math.max(base, retryAfterMs) + jitter;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
