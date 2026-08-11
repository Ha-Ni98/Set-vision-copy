import { z } from 'zod';
import { UserRole } from '../user/user.enums';
import { NotificationChannel, NotificationStat, NotificationType } from './notification.enums';

export const GetNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  stat: z.enum(NotificationStat).optional(),
  channel: z.enum(NotificationChannel).optional(),
  type: z.enum(NotificationType).optional(),
  recipientRole: z.enum(UserRole).optional(),
  search: z.string().optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
});
export type GetNotificationsQuery = z.infer<typeof GetNotificationsQuerySchema>;

export const NotificationIdParamsSchema = z.object({ id: z.uuid() });
export type NotificationIdParams = z.infer<typeof NotificationIdParamsSchema>;
