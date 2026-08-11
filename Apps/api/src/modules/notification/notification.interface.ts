import type { GetNotificationsQuery, PaginatedNotifications, NotificationDTO } from '@my-app/contract';

export interface INotificationListService {
  getAll(query: GetNotificationsQuery): Promise<PaginatedNotifications>;
  resend(id: string): Promise<NotificationDTO>;
}
