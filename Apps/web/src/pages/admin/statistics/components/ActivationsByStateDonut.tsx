import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ActivationStat, type StatisticsOverviewDTO } from "@my-app/contract";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { PieChart as PieChartIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  data?: StatisticsOverviewDTO["activationsByState"];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// Same tone family as StatusBadge's ACTIVATION_TONE, expressed as chart fill colors so the
// donut can't visually drift from the badge language used everywhere else.
const STATE_COLOR: Record<ActivationStat, string> = {
  [ActivationStat.ACTIVATED]: "oklch(var(--success))",
  [ActivationStat.ACTIVATED_BY_ADMIN]: "oklch(var(--success))",
  [ActivationStat.PENDING]: "oklch(var(--warning))",
  [ActivationStat.PROCESSING]: "oklch(var(--warning))",
  [ActivationStat.ADDITIONAL_INFORMATION]: "oklch(var(--warning))",
  [ActivationStat.FREEZE]: "oklch(var(--warning))",
  [ActivationStat.WRONG_INFORMATION]: "oklch(var(--destructive))",
  [ActivationStat.REMOVED_FROM_ACTIVATOR]: "oklch(var(--destructive))",
  [ActivationStat.CANCELLED_BY_ACTIVATOR]: "oklch(var(--muted-foreground))",
  [ActivationStat.CANCELLED_BY_ADMIN]: "oklch(var(--muted-foreground))",
};

export function ActivationsByStateDonut({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();

  const points = useMemo(
    () =>
      (data ?? []).map((p) => ({
        name: t(`enums.activationStat.${p.state}`),
        state: p.state,
        count: p.count,
      })),
    [data, t],
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
        icon={<PieChartIcon className="h-6 w-6" />}
        title={t("admin.statistics.charts.empty")}
        body=""
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-4 font-semibold text-foreground">
        {t("admin.statistics.charts.activationsByState.title")}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={points} dataKey="count" nameKey="name" innerRadius={50} outerRadius={80}>
            {points.map((p) => (
              <Cell key={p.state} fill={STATE_COLOR[p.state]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
