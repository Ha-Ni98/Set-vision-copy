import { ActivationStat, type TimelineEntry } from "@my-app/contract";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";

interface Props {
  entries: TimelineEntry[];
}

// One row per TimelineEntry; WRONG_INFORMATION lists wrongFields, ADDITIONAL_INFORMATION
// lists additionalFields+values, FREEZE shows freezeReason (plan §D2.2).
export function ActivationTimeline({ entries }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("admin.activationDetail.timeline.title")}
      </h3>
      <ol className="flex flex-col gap-4 border-l border-border pl-4">
        {entries.map((entry, i) => (
          <li key={i} className="text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={entry.stat} />
              <span className="text-muted-foreground">
                {formatDateTime(entry.createdAt, language)}
              </span>
            </div>
            {entry.stat === ActivationStat.WRONG_INFORMATION && entry.wrongFields.length > 0 && (
              <div className="mt-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t("admin.activationDetail.timeline.wrongFields")}
                </p>
                <ul className="ml-2 list-disc text-foreground">
                  {entry.wrongFields.map((f) => (
                    <li key={f.fieldLabel}>
                      {f.fieldLabel}: {f.value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {entry.stat === ActivationStat.ADDITIONAL_INFORMATION &&
              entry.additionalFields.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("admin.activationDetail.timeline.additionalFields")}
                  </p>
                  <ul className="ml-2 list-disc text-foreground">
                    {entry.additionalFields.map((f) => (
                      <li key={f.fieldLabel}>
                        {f.fieldLabel}: {f.value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {entry.stat === ActivationStat.FREEZE && entry.freezeReason && (
              <p className="mt-1 text-foreground">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("admin.activationDetail.timeline.freezeReason")}:
                </span>{" "}
                {entry.freezeReason}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
