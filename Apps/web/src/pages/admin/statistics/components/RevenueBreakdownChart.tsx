import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  RevenueDimension,
  REVENUE_UNATTRIBUTED_KEY,
  type RevenueBreakdownDTO,
} from "@my-app/contract";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart as BarChartIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD, formatDZDCompact } from "@/lib/utils";

interface Props {
  data?: RevenueBreakdownDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  dimension: RevenueDimension;
  onDimensionChange: (dimension: RevenueDimension) => void;
}

const LABEL_MAX = 16;

export function RevenueBreakdownChart({
  data,
  isLoading,
  isError,
  onRetry,
  dimension,
  onDimensionChange,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const points = useMemo(
    () =>
      (data?.rows ?? []).map((r) => ({
        name:
          r.key === REVENUE_UNATTRIBUTED_KEY ? t("admin.revenue.breakdown.unattributed") : r.label,
        cashIn: r.cashIn,
        cashOut: r.cashOut,
        net: r.net,
      })),
    [data, t],
  );

  const hasOthers = !!data && (data.others.cashIn !== 0 || data.others.cashOut !== 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">{t("admin.revenue.breakdown.title")}</h3>
        <Select value={dimension} onValueChange={(v) => onDimensionChange(v as RevenueDimension)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RevenueDimension.PLAN}>
              {t("admin.revenue.breakdown.dimension.plan")}
            </SelectItem>
            <SelectItem value={RevenueDimension.WILAYA}>
              {t("admin.revenue.breakdown.dimension.wilaya")}
            </SelectItem>
            <SelectItem value={RevenueDimension.DISTRIBUTOR}>
              {t("admin.revenue.breakdown.dimension.distributor")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dimension === RevenueDimension.PLAN && (
        <p className="mb-3 text-xs text-muted-foreground">
          {t("admin.revenue.breakdown.planNote")}
        </p>
      )}

      {isLoading && <ChartSkeleton />}

      {!isLoading && isError && (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
        />
      )}

      {!isLoading && !isError && points.length === 0 && (
        <EmptyState
          icon={<BarChartIcon className="h-6 w-6" />}
          title={t("admin.revenue.empty")}
          body=""
        />
      )}

      {!isLoading && !isError && points.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={Math.max(220, points.length * 56)}>
            <BarChart data={points} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid horizontal={false} className="stroke-border" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                stroke="currentColor"
                className="text-muted-foreground"
                tickFormatter={(v: number) => formatDZDCompact(v, language)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                stroke="currentColor"
                className="text-muted-foreground"
                width={120}
                tickFormatter={(v: string) =>
                  v.length > LABEL_MAX ? `${v.slice(0, LABEL_MAX - 1)}…` : v
                }
              />
              <Tooltip formatter={(v, name) => [formatDZD(Number(v), language), name]} />
              <Legend />
              <Bar
                dataKey="cashIn"
                name={t("admin.revenue.kpi.cashIn")}
                fill="oklch(var(--success))"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="cashOut"
                name={t("admin.revenue.kpi.cashOut")}
                fill="oklch(var(--destructive))"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="net"
                name={t("admin.revenue.kpi.net")}
                fill="oklch(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          {hasOthers && data && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("admin.revenue.breakdown.others")}: {formatDZD(data.others.net, language)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
