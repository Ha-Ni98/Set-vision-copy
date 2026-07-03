import type { ClientBlock as ClientBlockDTO } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  client: ClientBlockDTO;
}

export function ClientBlock({ client }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("admin.activationDetail.client.title")}
      </h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.client.fullName")}</dt>
          <dd className="font-medium text-foreground">{client.fullName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.client.phone")}</dt>
          <dd className="font-medium text-foreground">{client.phone}</dd>
        </div>
      </dl>
    </div>
  );
}
