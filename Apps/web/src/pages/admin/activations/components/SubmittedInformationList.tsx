import type { AccountFieldValue } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";

// U+2014 EM DASH — punctuation for "no value", not copy. Not a translation key.
const EMPTY_VALUE = "—";

interface Props {
  fields: AccountFieldValue[];
}

// Values are raw here (D3) — incl. PASSWORD/OTP, selectable in monospace. No reveal toggle,
// no blur, no copy-gate: the prompt forbids a reveal gate on data the client typed themselves.
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
            <dd className="select-all font-mono font-medium text-foreground">
              {field.value || EMPTY_VALUE}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
