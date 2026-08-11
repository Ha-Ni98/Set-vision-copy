import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueSummaryDTO } from "@my-app/contract";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { BarChart as BarChartIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD, formatDZDCompact } from "@/lib/utils";

interface Props {
  data?: RevenueSummaryDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// warning + primary — deliberately NOT reusing cashOut's own destructive token here, since this
// chart breaks cashOut into two sub-parts and reusing the outer category's color for one part
// would make it look like the other part (activationPrice) isn't part of cash out at all.
export function CashOutSplitBar({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

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

  const hasData =
    !!data && (data.cashOutSplit.activationCost > 0 || data.cashOutSplit.activationPrice > 0);
  if (!hasData) {
    return (
      <EmptyState
        icon={<BarChartIcon className="h-6 w-6" />}
        title={t("admin.revenue.empty")}
        body=""
      />
    );
  }

  const points = [
    {
      name: t("admin.revenue.cashOutSplit.title"),
      activationCost: data.cashOutSplit.activationCost,
      activationPrice: data.cashOutSplit.activationPrice,
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-4 font-semibold text-foreground">
        {t("admin.revenue.cashOutSplit.title")}
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={points}
          layout="vertical"
          margin={{ top: 8, left: 8, right: 24, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} className="stroke-border" />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            className="text-muted-foreground"
            tickFormatter={(v: number) => formatDZDCompact(v, language)}
          />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip formatter={(v, name) => [formatDZD(Number(v), language), name]} />
          <Legend />
          <Bar
            dataKey="activationCost"
            name={t("admin.revenue.cashOutSplit.activationCost")}
            stackId="cashOut"
            fill="oklch(var(--warning))"
            radius={[4, 0, 0, 4]}
          >
            <LabelList
              dataKey="activationCost"
              position="insideLeft"
              formatter={(v) => formatDZDCompact(Number(v), language)}
              className="fill-warning-foreground text-xs"
            />
          </Bar>
          <Bar
            dataKey="activationPrice"
            name={t("admin.revenue.cashOutSplit.activationPrice")}
            stackId="cashOut"
            fill="oklch(var(--primary))"
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="activationPrice"
              position="insideRight"
              formatter={(v) => formatDZDCompact(Number(v), language)}
              className="fill-primary-foreground text-xs"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
