import { StatusPill } from "@/components/shared/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  isDisabled: boolean;
  isRevoked: boolean;
}

// Renders nothing when neither flag is set (plan §B9).
export function CardFlagChips({ isDisabled, isRevoked }: Props) {
  const { t } = useTranslation();
  if (!isDisabled && !isRevoked) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {isDisabled && <StatusPill tone="neutral" label={t("enums.cardFlag.disabled")} />}
      {isRevoked && <StatusPill tone="destructive" label={t("enums.cardFlag.revoked")} />}
    </div>
  );
}
