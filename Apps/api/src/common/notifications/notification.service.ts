import type { PrismaClient } from '@prisma/client';
import {
  NotificationStat as PrismaNotificationStat,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { UserRole, type NotificationChannel, type NotificationDTO } from '@my-app/contract';
import type { INotificationService, NotificationRequest } from './notification.types';
import type { ProviderRegistry } from './providers/registry';
import { NotificationMapper } from './notification.mapper';
import { NotFoundError, ConflictError, BadRequestError } from '../errors';
import { logger } from '../config/logger';

// Re-resolves the CURRENT chat id for a stored recipient — used only by resend(), so
// "unlink, re-link, resend" works, while the stored recipientAddress stays the audit record
// of what was tried the first time. Never used by dispatch(), which always has a fresh
// NotificationRecipient handed to it by the caller.
async function resolveCurrentAddress(
  prisma: PrismaClient,
  role: UserRole,
  profileId: string,
): Promise<string | null> {
  switch (role) {
    case UserRole.ADMIN: {
      const row = await prisma.admin.findUnique({
        where: { id: profileId },
        select: { telegramChatId: true },
      });
      return row?.telegramChatId ?? null;
    }
    case UserRole.ACTIVATOR: {
      const row = await prisma.activator.findUnique({
        where: { id: profileId },
        select: { telegramChatId: true },
      });
      return row?.telegramChatId ?? null;
    }
    case UserRole.DISTRIBUTOR: {
      const row = await prisma.distributor.findUnique({
        where: { id: profileId },
        select: { telegramChatId: true },
      });
      return row?.telegramChatId ?? null;
    }
  }
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly providers: ProviderRegistry,
  ) {}

  // NEVER throws, NEVER rejects (Set 6 plan §9.2-9.3) — a send failure must not be able to
  // fail the request that triggered it. The row is written BEFORE the send, so a crash or a
  // hung provider leaves evidence rather than silence.
  async dispatch(request: NotificationRequest): Promise<void> {
    let notificationId: string;
    try {
      const created = await this.prisma.notification.create({
        data: {
          channel: request.channel,
          type: request.type,
          stat: PrismaNotificationStat.PENDING,
          recipientRole: request.recipient.role as PrismaUserRole,
          recipientProfileId: request.recipient.profileId,
          recipientName: request.recipient.name,
          recipientAddress: request.recipient.address,
          body: request.body,
          attempts: 0,
        },
      });
      notificationId = created.id;
    } catch (err) {
      logger.error({ err, type: request.type, channel: request.channel }, 'Failed to record notification');
      return;
    }

    await this.attemptSend(notificationId, request.channel, request.recipient.address, request.body);
  }

  async dispatchAll(requests: NotificationRequest[]): Promise<void> {
    // Promise.allSettled: dispatch() already swallows its own errors, but this guarantees
    // one blocked recipient can never suppress the others even if that contract is ever broken.
    await Promise.allSettled(requests.map((r) => this.dispatch(r)));
  }

  async resend(notificationId: string): Promise<NotificationDTO> {
    const existing = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!existing) throw new NotFoundError('Notification not found');
    if (existing.stat !== PrismaNotificationStat.FAILED) {
      throw new ConflictError('Only failed notifications can be resent');
    }

    const address = await resolveCurrentAddress(
      this.prisma,
      existing.recipientRole as UserRole,
      existing.recipientProfileId,
    );
    if (!address) throw new BadRequestError('This recipient is no longer linked to Telegram');

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { recipientAddress: address },
    });

    // body is NEVER re-rendered — resend delivers the byte-identical original message.
    await this.attemptSend(notificationId, existing.channel as NotificationChannel, address, existing.body);

    const updated = await this.prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
    return NotificationMapper.toDTO(updated);
  }

  private async attemptSend(
    notificationId: string,
    channel: NotificationChannel,
    address: string,
    body: string,
  ): Promise<void> {
    try {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { attempts: { increment: 1 } },
      });

      await this.providers[channel].send(address, body);

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { stat: PrismaNotificationStat.SENT, sentAt: new Date() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, notificationId, channel }, 'Notification send failed');
      try {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: { stat: PrismaNotificationStat.FAILED, error: message.slice(0, 500) },
        });
      } catch (updateErr) {
        // DB unreachable — the row stays PENDING, which correctly signals "we don't know".
        logger.error({ err: updateErr, notificationId }, 'Failed to record notification failure');
      }
    }
  }
}
