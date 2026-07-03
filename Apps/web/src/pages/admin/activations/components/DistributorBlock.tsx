import type { DistributorBlock as DistributorBlockDTO } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  distributor: DistributorBlockDTO;
}

// Plain text, no <Link> — the DTO has no distributor id (plan §E-2), only its display
// fields. Do not fabricate a route target.
export function DistributorBlock({ distributor }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("admin.activationDetail.distributor.title")}
      </h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("admin.distributors.table.storeName")}</dt>
          <dd className="font-medium text-foreground">{distributor.storeName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("admin.distributors.table.wilaya")}</dt>
          <dd className="font-medium text-foreground">
            {distributor.wilayaName} · {distributor.communeName}
          </dd>
        </div>
      </dl>
    </div>
  );
}
