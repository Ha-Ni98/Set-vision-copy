import type { ActivationTiming } from "@my-app/contract";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";
import { formatDuration } from "@/lib/duration";

interface Props {
  timing: ActivationTiming;
  activationEmail: string | null;
}

export function TimingBlock({ timing, activationEmail }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 font-semibold text-foreground">
        {t("admin.activationDetail.timing.title")}
      </h3>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">
            {t("admin.activationDetail.timing.requestedAt")}
          </dt>
          <dd className="font-medium text-foreground">
            {formatDateTime(timing.requestedAt, language)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.timing.takenAt")}</dt>
          <dd className="font-medium text-foreground">
            {timing.takenAt
              ? formatDateTime(timing.takenAt, language)
              : t("admin.activationDetail.timing.inProgress")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("admin.activationDetail.timing.completedAt")}
          </dt>
          <dd className="font-medium text-foreground">
            {timing.completedAt
              ? formatDateTime(timing.completedAt, language)
              : t("admin.activationDetail.timing.inProgress")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("admin.activationDetail.timing.duration")}</dt>
          <dd className="font-mono font-medium text-foreground">
            {formatDuration(timing.durationSeconds)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {t("admin.activationDetail.timing.activationEmail")}
          </dt>
          <dd className="font-medium text-foreground">{activationEmail ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
