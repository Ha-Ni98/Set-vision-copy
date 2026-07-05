import type { ActivationDetailDTO } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD } from "@/lib/utils";

interface Props {
  financial: ActivationDetailDTO["financial"];
  canSetPrice: boolean;
  onRequestSetPrice: () => void;
}

export function FinancialBlock({ financial, canSetPrice, onRequestSetPrice }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const hasPrice = financial.activationPrice != null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          {t("admin.activationDetail.financial.title")}
        </h3>
        {canSetPrice && (
          <Button size="sm" variant="outline" onClick={onRequestSetPrice}>
            <Tag className="mr-2 h-3.5 w-3.5" />
            {t(hasPrice ? "admin.activations.actions.editPrice" : "admin.activations.actions.setPrice")}
          </Button>
        )}
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
          <dt className="text-muted-foreground">
            {t("admin.activationDetail.financial.commissionTier")}
          </dt>
          <dd className="font-medium text-foreground">{financial.commissionTierLabel ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
