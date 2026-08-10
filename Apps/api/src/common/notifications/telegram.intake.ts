import type { PrismaClient } from '@prisma/client';
import { NotificationChannel, NotificationType } from '@my-app/contract';
import { TelegramUpdateSchema } from './telegram.api';
import { consumeLinkToken } from './telegram.link';
import { renderTelegramLinked } from './notification.templates';
import type { NotificationService } from './notification.service';
import { logger } from '../config/logger';

const START_COMMAND = /^\/start(?:\s+(\S+))?$/;

const NO_TOKEN_REPLY =
  "Bonjour ! Utilisez le lien fourni par votre administrateur pour activer les notifications.";
const INVALID_TOKEN_REPLY = 'Ce lien est invalide ou a déjà été utilisé.';

/**
 * THE single intake handler. Both transports (polling and webhook) call exactly this — see
 * Set 6 plan §3.3. Neither transport contains any token logic of its own.
 *
 * Contract: NEVER throws and NEVER rejects — every failure is logged through Pino and
 * swallowed. The webhook controller therefore always answers 200 (so Telegram does not
 * retry-loop) and the poller can never die on a malformed update.
 *
 * Returns the update_id so the poller can advance its offset even for updates it ignored.
 * Silent on anything that isn't a recognised /start command (Set 6 plan §3.1, Q10) — a bot
 * that answers arbitrary input is a free oracle for probing.
 */
export async function handleTelegramUpdate(
  prisma: PrismaClient,
  notificationService: NotificationService,
  botToken: string,
  raw: unknown,
): Promise<number | null> {
  const parsed = TelegramUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ err: parsed.error }, 'Ignoring malformed Telegram update');
    return null;
  }

  const update = parsed.data;
  const message = update.message;
  if (!message?.text) return update.update_id;

  const match = START_COMMAND.exec(message.text.trim());
  if (!match) return update.update_id; // not a /start — silent, per Q10

  const token = match[1];
  const chatId = String(message.chat.id);

  if (!token) {
    await sendReply(botToken, chatId, NO_TOKEN_REPLY);
    return update.update_id;
  }

  const outcome = await consumeLinkToken(prisma, token, chatId);
  if (!outcome.ok) {
    await sendReply(botToken, chatId, INVALID_TOKEN_REPLY);
    return update.update_id;
  }

  // Sent directly through dispatch — this both confirms to the user AND writes the first
  // Notification row for the newly-linked profile.
  await notificationService.dispatch({
    channel: NotificationChannel.TELEGRAM,
    type: NotificationType.TELEGRAM_LINKED,
    recipient: outcome.recipient,
    body: renderTelegramLinked({ name: outcome.recipient.name, role: outcome.recipient.role }),
  });

  return update.update_id;
}

// Used only for the two short intake replies that have no recipient profile to attribute a
// Notification row to (help text, invalid-token). Deliberately bypasses dispatch/the outbox —
// there is nothing to log against.
async function sendReply(botToken: string, chatId: string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.error({ err, chatId }, 'Failed to send Telegram intake reply');
  }
}
