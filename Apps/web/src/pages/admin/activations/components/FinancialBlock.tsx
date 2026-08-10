import type { ActivationDetailDTO } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import { Tag, Coins } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD } from "@/lib/utils";

interface Props {
  financial: ActivationDetailDTO["financial"];
  canSetPrice: boolean;
  onRequestSetPrice: () => void;
  canSetCost: boolean;
  onRequestSetCost: () => void;
}

// Set 9 (D10, U2): cost surfaces here alongside price — same header-button pattern, own
// edit action, no shared modal (price and cost are independent numbers, plan §6).
export function FinancialBlock({
  financial,
  canSetPrice,
  onRequestSetPrice,
  canSetCost,
  onRequestSetCost,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const hasPrice = financial.activationPrice != null;
  const hasCost = financial.activationCost != null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          {t("admin.activationDetail.financial.title")}
        </h3>
        <div className="flex items-center gap-2">
          {canSetPrice && (
            <Button size="sm" variant="outline" onClick={onRequestSetPrice}>
              <Tag className="mr-2 h-3.5 w-3.5" />
              {t(
                hasPrice
                  ? "admin.activations.actions.editPrice"
                  : "admin.activations.actions.setPrice",
              )}
            </Button>
          )}
          {canSetCost && (
            <Button size="sm" variant="outline" onClick={onRequestSetCost}>
              <Coins className="mr-2 h-3.5 w-3.5" />
              {t(
                hasCost
                  ? "admin.activations.actions.editCost"
                  : "admin.activations.actions.setCost",
              )}
            </Button>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.financial.price")}</dt>
          <dd className="font-medium text-foreground">
            {financial.activationPrice != null
              ? formatDZD(financial.activationPrice, language)
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.financial.cost")}</dt>
          <dd className="font-medium text-foreground">
            {financial.activationCost != null ? formatDZD(financial.activationCost, language) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("admin.activationDetail.financial.commissionTier")}
          </dt>
          <dd className="font-medium text-foreground">{financial.commissionTierLabel ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
