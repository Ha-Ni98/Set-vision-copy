import type { CardChain } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  card: CardChain;
}

export function CardChainBlock({ card }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("admin.activationDetail.card.title")}
      </h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.card.key")}</dt>
          <dd className="font-mono font-medium text-foreground">{card.key}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.card.plan")}</dt>
          <dd className="font-medium text-foreground">{card.subscriptionLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.card.set")}</dt>
          <dd className="font-medium text-foreground">{card.setNumber}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.card.lot")}</dt>
          <dd className="font-medium text-foreground">{card.lotNumber ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
