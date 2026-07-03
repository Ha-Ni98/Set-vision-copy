import type { AccountFieldValue } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  fields: AccountFieldValue[];
}

export function SubmittedInformationList({ fields }: Props) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("admin.activationDetail.submittedInfo.title")}
      </h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {fields.map((field) => (
          <div key={field.fieldLabel}>
            <dt className="text-muted-foreground">{field.fieldLabel}</dt>
            <dd className="font-medium text-foreground">{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
