import type { Notification } from '@prisma/client';
import {
  NotificationResponseSchema,
  type NotificationDTO,
  type NotificationChannel,
  type NotificationType,
  type NotificationStat,
  type UserRole,
} from '@my-app/contract';

export class NotificationMapper {
  static toDTO(entity: Notification): NotificationDTO {
    const dto: NotificationDTO = {
      id: entity.id,
      channel: entity.channel as NotificationChannel,
      type: entity.type as NotificationType,
      stat: entity.stat as NotificationStat,
      recipientRole: entity.recipientRole as UserRole,
      recipientProfileId: entity.recipientProfileId,
      recipientName: entity.recipientName,
      body: entity.body,
      error: entity.error,
      attempts: entity.attempts,
      sentAt: entity.sentAt ? entity.sentAt.toISOString() : null,
      createdAt: entity.createdAt.toISOString(),
    };
    return NotificationResponseSchema.parse(dto);
  }
}
