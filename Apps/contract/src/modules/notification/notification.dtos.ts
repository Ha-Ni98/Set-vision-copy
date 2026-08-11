import { z } from 'zod';
import { paginated } from '../../common/types';
import { UserRole } from '../user/user.enums';
import { NotificationChannel, NotificationStat, NotificationType } from './notification.enums';

// recipientAddress (the raw chat id) is deliberately NOT on this DTO — an admin log page has
// no use for it, and it is contact data. recipientName + recipientRole identify the recipient.
export const NotificationResponseSchema = z.object({
  id: z.uuid(),
  channel: z.enum(NotificationChannel),
  type: z.enum(NotificationType),
  stat: z.enum(NotificationStat),
  recipientRole: z.enum(UserRole),
  recipientProfileId: z.uuid(),
  recipientName: z.string(),
  body: z.string(),
  error: z.string().nullable(),
  attempts: z.number().int(),
  sentAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type NotificationDTO = z.infer<typeof NotificationResponseSchema>;

export const PaginatedNotificationsSchema = paginated(NotificationResponseSchema);
export type PaginatedNotifications = z.infer<typeof PaginatedNotificationsSchema>;
