import { NotificationType, UserRole } from '@my-app/contract';

// French, hard-coded, one file — see Set 6 plan §6.1. There is no i18n infrastructure on the
// backend, and Telegram's audience is homogeneous internal staff. Not translated via
// translations.json (that is web-only, front-end-rules §6.B) — this is backend copy.

const ROLE_LABEL_FR: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.ACTIVATOR]: 'Activateur',
  [UserRole.DISTRIBUTOR]: 'Distributeur',
};

export type TelegramLinkedVars = { name: string; role: UserRole };

// Exhaustive by construction: Record<NotificationType, …> means adding an enum value fails
// tsc until its template exists. This is the "no magic strings" guarantee for notification
// copy. Only TELEGRAM_LINKED is implemented in Set 6a — the other nine templates are Set 6b's
// job (they need notification.recipients.ts and notification.subscribers.ts, which do not
// exist yet). They throw rather than render an empty body: unreachable code should fail loud,
// not ship a blank Telegram message.
const NOT_YET_IMPLEMENTED = (type: NotificationType) => (): string => {
  throw new Error(`Notification template ${type} is not implemented until Set 6b`);
};

export const TEMPLATES = {
  [NotificationType.TELEGRAM_LINKED]: (vars: TelegramLinkedVars): string =>
    [
      '✅ Notifications activées',
      `Bonjour ${vars.name} (${ROLE_LABEL_FR[vars.role]}).`,
      'Vous recevrez désormais les notifications SetVision dans cette conversation.',
    ].join('\n'),

  [NotificationType.ACTIVATION_CREATED]: NOT_YET_IMPLEMENTED(NotificationType.ACTIVATION_CREATED),
  [NotificationType.ACTIVATION_INFORMATION_UPDATED]: NOT_YET_IMPLEMENTED(
    NotificationType.ACTIVATION_INFORMATION_UPDATED,
  ),
  [NotificationType.ACTIVATION_OTP_RECEIVED]: NOT_YET_IMPLEMENTED(
    NotificationType.ACTIVATION_OTP_RECEIVED,
  ),
  [NotificationType.ACTIVATION_STATUS_CHANGED]: NOT_YET_IMPLEMENTED(
    NotificationType.ACTIVATION_STATUS_CHANGED,
  ),
  [NotificationType.ACTIVATION_FROZEN]: NOT_YET_IMPLEMENTED(NotificationType.ACTIVATION_FROZEN),
  [NotificationType.ORDER_REQUEST_CREATED]: NOT_YET_IMPLEMENTED(
    NotificationType.ORDER_REQUEST_CREATED,
  ),
  [NotificationType.REVOCATION_REQUEST_CREATED]: NOT_YET_IMPLEMENTED(
    NotificationType.REVOCATION_REQUEST_CREATED,
  ),
  [NotificationType.ORDER_CREATED]: NOT_YET_IMPLEMENTED(NotificationType.ORDER_CREATED),
  [NotificationType.REVOCATION_APPROVED]: NOT_YET_IMPLEMENTED(NotificationType.REVOCATION_APPROVED),
} satisfies Record<NotificationType, (vars: never) => string>;

export const renderTelegramLinked = (vars: TelegramLinkedVars): string =>
  TEMPLATES[NotificationType.TELEGRAM_LINKED](vars);
