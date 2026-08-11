import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RevenueGranularity, type RevenueSeriesDTO } from "@my-app/contract";
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
import { LineChart as LineChartIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD, formatDZDCompact } from "@/lib/utils";

interface Props {
  data?: RevenueSeriesDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  granularity: RevenueGranularity;
  onGranularityChange: (granularity: RevenueGranularity) => void;
}

// cashIn/cashOut/net reuse the app's success/destructive/primary tokens everywhere on this tab
// (same entity, same color, every chart). The legend + tooltip always name each series in text,
// and net is a line against cashIn/cashOut's bars — position and mark shape carry identity
// alongside color, not color alone.
export function RevenueTrendChart({
  data,
  isLoading,
  isError,
  onRetry,
  granularity,
  onGranularityChange,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const points = useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        date: new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(p.bucketStart)),
        cashIn: p.cashIn,
        cashOut: p.cashOut,
        net: p.net,
      })),
    [data, language],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">{t("admin.revenue.trend.title")}</h3>
        <Select
          value={granularity}
          onValueChange={(v) => onGranularityChange(v as RevenueGranularity)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RevenueGranularity.DAY}>
              {t("admin.revenue.granularity.day")}
            </SelectItem>
            <SelectItem value={RevenueGranularity.WEEK}>
              {t("admin.revenue.granularity.week")}
            </SelectItem>
            <SelectItem value={RevenueGranularity.MONTH}>
              {t("admin.revenue.granularity.month")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          icon={<LineChartIcon className="h-6 w-6" />}
          title={t("admin.revenue.empty")}
          body=""
        />
      )}

      {!isLoading && !isError && points.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} className="stroke-border" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="currentColor"
              className="text-muted-foreground"
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="currentColor"
              className="text-muted-foreground"
              tickFormatter={(v: number) => formatDZDCompact(v, language)}
            />
            <Tooltip formatter={(v, name) => [formatDZD(Number(v), language), name]} />
            <Legend />
            <ReferenceLine y={0} className="stroke-border" />
            <Bar
              dataKey="cashIn"
              name={t("admin.revenue.kpi.cashIn")}
              fill="oklch(var(--success))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="cashOut"
              name={t("admin.revenue.kpi.cashOut")}
              fill="oklch(var(--destructive))"
              radius={[4, 4, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="net"
              name={t("admin.revenue.kpi.net")}
              stroke="oklch(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
