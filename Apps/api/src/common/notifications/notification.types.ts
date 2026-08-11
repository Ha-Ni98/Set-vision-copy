import type { UserRole, NotificationChannel, NotificationType, NotificationDTO } from '@my-app/contract';

/** A resolved, notifiable party. `address` is non-null by construction: recipient
 *  resolution filters out unlinked profiles, so an unlinked user produces NO row at all. */
export type NotificationRecipient = {
  role: UserRole;
  profileId: string; // Admin.id | Activator.id | Distributor.id
  name: string; // Admin/Activator.fullName, Distributor.storeName
  address: string; // Telegram chat id (would be an email / MSISDN on another channel)
};

/** One outbound message, fully rendered. The service adds nothing to `body`. */
export type NotificationRequest = {
  channel: NotificationChannel;
  type: NotificationType;
  recipient: NotificationRecipient;
  body: string;
};

/** A provider transports an already-rendered body to one address.
 *  It knows NOTHING about Prisma, Notification rows, templates, or events.
 *  Contract: resolve on success, THROW on failure. The service converts a throw into a
 *  FAILED row — providers never touch the database and never swallow an error. */
export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(address: string, body: string): Promise<void>;
}

/** The service. `dispatch`/`dispatchAll` NEVER throw and NEVER reject — that is their whole
 *  job (Set 6 plan §9.3). `resend` is the one method that may throw — it answers an admin's
 *  own request, where an error is the correct response. */
export interface INotificationService {
  dispatch(request: NotificationRequest): Promise<void>;
  dispatchAll(requests: NotificationRequest[]): Promise<void>;
  resend(notificationId: string): Promise<NotificationDTO>;
}
