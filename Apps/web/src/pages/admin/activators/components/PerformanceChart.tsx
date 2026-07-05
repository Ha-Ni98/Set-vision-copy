import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ActivatorPerformanceDTO } from "@my-app/contract";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { LineChart as LineChartIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface Props {
  data?: ActivatorPerformanceDTO["series"];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function PerformanceChart({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const points = useMemo(
    () =>
      (data ?? []).map((p) => ({
        date: new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(p.date)),
        count: p.count,
      })),
    [data, language],
  );

  if (isLoading) return <ChartSkeleton />;
  if (isError) {
    return (
      <NotFoundState
        title={t("admin.dashboard.sectionError")}
        body={t("admin.dashboard.sectionErrorBody")}
        action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
      />
    );
  }

  if (points.length === 0) {
    return (
      <EmptyState
        icon={<LineChartIcon className="h-6 w-6" />}
        title={t("admin.activators.detail.chart.empty")}
        body=""
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-4 font-semibold text-foreground">
        {t("admin.activators.detail.chart.title")}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={points}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="oklch(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
