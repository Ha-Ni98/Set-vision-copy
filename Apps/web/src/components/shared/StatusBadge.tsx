import { ActivationStat } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";

type Tone = "success" | "warning" | "destructive" | "neutral";

const TONE: Record<ActivationStat, Tone> = {
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

const PULSE = new Set<ActivationStat>([ActivationStat.ADDITIONAL_INFORMATION]);

const CLASS: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground border border-warning/40",
  destructive: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ActivationStat }) {
  const { t } = useTranslation();
  const tone = TONE[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${CLASS[tone]} ${PULSE.has(status) ? "animate-pulse-soft" : ""}`}
    >
      ● {t(`enums.activationStat.${status}`)}
    </span>
  );
}
