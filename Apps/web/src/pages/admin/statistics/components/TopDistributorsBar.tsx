import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatisticsOverviewDTO } from "@my-app/contract";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { BarChart as BarChartIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  data?: StatisticsOverviewDTO["topDistributors"];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function TopDistributorsBar({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();

  const points = useMemo(
    () => (data ?? []).map((d) => ({ name: d.storeName, count: d.count })),
    [data],
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
        icon={<BarChartIcon className="h-6 w-6" />}
        title={t("admin.statistics.charts.empty")}
        body=""
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-4 font-semibold text-foreground">
        {t("admin.statistics.charts.topDistributors.title")}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={points} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid horizontal={false} className="stroke-border" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-muted-foreground"
            width={100}
          />
          <Tooltip />
          <Bar dataKey="count" fill="oklch(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
