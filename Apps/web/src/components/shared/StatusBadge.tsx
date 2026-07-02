import { ActivationStat, CardStat, OrderStat } from "@my-app/contract";
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
