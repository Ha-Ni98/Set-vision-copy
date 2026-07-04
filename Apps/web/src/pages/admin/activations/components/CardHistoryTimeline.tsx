import type { CardHistoryEntry } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";

interface Props {
  entries: CardHistoryEntry[];
}

// Same derived-timeline shape as Part-2's CardDetailModal — rows appear only when their
// timestamp exists (the DTO already filtered them).
export function CardHistoryTimeline({ entries }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("admin.activationDetail.cardHistory.title")}
      </h3>
      <ol className="flex flex-col gap-2 border-l border-border pl-4">
        {entries.map((entry, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-foreground">{t(`enums.cardStat.${entry.stat}`)}</span>{" "}
            <span className="text-muted-foreground">{formatDateTime(entry.at, language)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
