import {
  ActivationStat,
  CardStat,
  OrderStat,
  OrderRequestStat,
  RevocationRequestStat,
  SetStat,
  LotStat,
  LogActionType,
  NotificationStat,
} from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";

export type BadgeTone = "success" | "warning" | "destructive" | "neutral";

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground border border-warning/40",
  destructive: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

// Shared pill markup — every status/enabled badge in the app renders through this, so the
// visual language (dot, pill shape, tone colors) can't drift between badge types.
export function StatusPill({
  tone,
  label,
  pulse = false,
}: {
  tone: BadgeTone;
  label: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]} ${pulse ? "animate-pulse-soft" : ""}`}
    >
      ● {label}
    </span>
  );
}

const ACTIVATION_TONE: Record<ActivationStat, BadgeTone> = {
  [ActivationStat.ACTIVATED]: "success",
  [ActivationStat.ACTIVATED_BY_ADMIN]: "success",
  [ActivationStat.PENDING]: "warning",
  [ActivationStat.PROCESSING]: "warning",
  [ActivationStat.ADDITIONAL_INFORMATION]: "warning",
  [ActivationStat.FREEZE]: "warning",
  [ActivationStat.WRONG_INFORMATION]: "destructive",
  [ActivationStat.REMOVED_FROM_ACTIVATOR]: "destructive",
  [ActivationStat.CANCELLED_BY_ACTIVATOR]: "neutral",
  [ActivationStat.CANCELLED_BY_ADMIN]: "neutral",
};

const ACTIVATION_PULSE = new Set<ActivationStat>([ActivationStat.ADDITIONAL_INFORMATION]);

export function StatusBadge({ status }: { status: ActivationStat }) {
  const { t } = useTranslation();
  return (
    <StatusPill
      tone={ACTIVATION_TONE[status]}
      label={t(`enums.activationStat.${status}`)}
      pulse={ACTIVATION_PULSE.has(status)}
    />
  );
}

const CARD_TONE: Record<CardStat, BadgeTone> = {
  [CardStat.IN_SET]: "neutral",
  [CardStat.PRINTED]: "neutral",
  [CardStat.IN_LOT]: "neutral",
  [CardStat.AT_DISTRIBUTOR]: "neutral",
  [CardStat.ACTIVATION_PROGRESS]: "warning",
  [CardStat.ACTIVATED]: "success",
  [CardStat.ACTIVATION_FAILED]: "destructive",
};

export function CardStatusBadge({ status }: { status: CardStat }) {
  const { t } = useTranslation();
  return <StatusPill tone={CARD_TONE[status]} label={t(`enums.cardStat.${status}`)} />;
}

const ORDER_TONE: Record<OrderStat, BadgeTone> = {
  [OrderStat.PENDING_DELIVERY]: "warning",
  [OrderStat.IN_DELIVERY]: "warning",
  [OrderStat.DELIVERED]: "success",
  [OrderStat.RETURNED]: "destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStat }) {
  const { t } = useTranslation();
  return <StatusPill tone={ORDER_TONE[status]} label={t(`enums.orderStat.${status}`)} />;
}

const ORDER_REQUEST_TONE: Record<OrderRequestStat, BadgeTone> = {
  [OrderRequestStat.PENDING]: "warning",
  [OrderRequestStat.APPROVED]: "success",
  [OrderRequestStat.REJECTED]: "destructive",
  [OrderRequestStat.CANCELLED]: "neutral",
  [OrderRequestStat.PENDING_DELIVERY]: "warning",
  [OrderRequestStat.IN_DELIVERY]: "warning",
  [OrderRequestStat.DELIVERED]: "success",
  [OrderRequestStat.RETURNED]: "destructive",
};

export function OrderRequestStatusBadge({ status }: { status: OrderRequestStat }) {
  const { t } = useTranslation();
  return (
    <StatusPill tone={ORDER_REQUEST_TONE[status]} label={t(`enums.orderRequestStat.${status}`)} />
  );
}

const REVOCATION_REQUEST_TONE: Record<RevocationRequestStat, BadgeTone> = {
  [RevocationRequestStat.PENDING]: "warning",
  [RevocationRequestStat.APPROVED]: "success",
  [RevocationRequestStat.REJECTED]: "destructive",
  [RevocationRequestStat.CANCELLED]: "neutral",
};

export function RevocationRequestStatusBadge({ status }: { status: RevocationRequestStat }) {
  const { t } = useTranslation();
  return (
    <StatusPill
      tone={REVOCATION_REQUEST_TONE[status]}
      label={t(`enums.revocationRequestStat.${status}`)}
    />
  );
}

const SET_TONE: Record<SetStat, BadgeTone> = {
  [SetStat.NOT_PRINTED]: "neutral",
  [SetStat.PENDING_PRINTING]: "warning",
  [SetStat.PRINTED]: "success",
};

export function SetStatusBadge({ status }: { status: SetStat }) {
  const { t } = useTranslation();
  return <StatusPill tone={SET_TONE[status]} label={t(`enums.setStat.${status}`)} />;
}

const LOT_TONE: Record<LotStat, BadgeTone> = {
  [LotStat.PENDING]: "warning",
  [LotStat.IN_DELIVERY]: "warning",
  [LotStat.DELIVERED]: "success",
  [LotStat.RETURNED]: "destructive",
};

export function LotStatusBadge({ status }: { status: LotStat }) {
  const { t } = useTranslation();
  return <StatusPill tone={LOT_TONE[status]} label={t(`enums.lotStat.${status}`)} />;
}

const LOG_ACTION_TONE: Record<LogActionType, BadgeTone> = {
  [LogActionType.CHANGE_USER_PASSWORD]: "neutral",
  [LogActionType.CHANGE_USER_STAT]: "warning",
  [LogActionType.CHANGE_USER_INFORMATION]: "neutral",
  [LogActionType.SET_PAYMENT]: "success",
  [LogActionType.DELETE_PAYMENT]: "destructive",
  [LogActionType.ADD_DISTRIBUTOR]: "success",
  [LogActionType.CHANGE_DISTRIBUTOR_INFORMATION]: "neutral",
  [LogActionType.CHANGE_DISTRIBUTOR_STAT]: "warning",
  [LogActionType.CHANGE_ACTIVATION_COMMISSION]: "warning",
  [LogActionType.REMOVE_LOT]: "destructive",
  [LogActionType.REMOVE_SET]: "destructive",
  [LogActionType.REMOVE_CARD]: "destructive",
  [LogActionType.REVOKE_CARD]: "destructive",
  [LogActionType.LINK_USER_ACCOUNT]: "success",
  [LogActionType.UNLINK_USER_ACCOUNT]: "warning",
  [LogActionType.CHANGE_ORDER_REQUEST_STAT]: "neutral",
  [LogActionType.CHANGE_REVOCATION_REQUEST_STAT]: "neutral",
  [LogActionType.GENERATE_TELEGRAM_TOKEN]: "neutral",
  [LogActionType.UNLINK_TELEGRAM]: "warning",
};

export function LogActionBadge({ actionType }: { actionType: LogActionType }) {
  const { t } = useTranslation();
  return (
    <StatusPill tone={LOG_ACTION_TONE[actionType]} label={t(`enums.logActionType.${actionType}`)} />
  );
}

const NOTIFICATION_STAT_TONE: Record<NotificationStat, BadgeTone> = {
  [NotificationStat.PENDING]: "warning",
  [NotificationStat.SENT]: "success",
  [NotificationStat.FAILED]: "destructive",
};

export function NotificationStatusBadge({ status }: { status: NotificationStat }) {
  const { t } = useTranslation();
  return (
    <StatusPill
      tone={NOTIFICATION_STAT_TONE[status]}
      label={t(`enums.notificationStat.${status}`)}
    />
  );
}

// isEnabled is a boolean, not an enum — Activators/Distributors tables and details both need
// this exact pill treatment for it, so it lives here alongside the enum-backed badges.
export function EnabledBadge({ isEnabled }: { isEnabled: boolean }) {
  const { t } = useTranslation();
  return (
    <StatusPill
      tone={isEnabled ? "success" : "neutral"}
      label={isEnabled ? t("common.status.enabled") : t("common.status.disabled")}
    />
  );
}
