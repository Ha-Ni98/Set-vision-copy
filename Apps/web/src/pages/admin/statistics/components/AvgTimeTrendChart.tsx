import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatisticsOverviewDTO } from "@my-app/contract";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { LineChart as LineChartIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDuration } from "@/lib/duration";

interface Props {
  data?: StatisticsOverviewDTO["avgTimeTrend"];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function AvgTimeTrendChart({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const points = useMemo(
    () =>
      (data ?? []).map((p) => ({
        date: new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(p.date)),
        avgSeconds: p.avgSeconds,
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
        title={t("admin.statistics.charts.empty")}
        body=""
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-4 font-semibold text-foreground">
        {t("admin.statistics.charts.avgTimeTrend.title")}
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
            width={96}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-muted-foreground"
            tickFormatter={(v: number) => formatDuration(v)}
          />
          <Tooltip formatter={(v) => formatDuration(Number(v))} />
          <Line
            type="monotone"
            dataKey="avgSeconds"
            stroke="oklch(var(--warning))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
