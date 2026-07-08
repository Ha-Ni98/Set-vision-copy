import { Loader2 } from "lucide-react";
import type { SubscriptionPlanDTO, WilayaDTO } from "@my-app/contract";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { formatWilayaLabel } from "@/lib/utils";

// StatisticsPeriod is a z.enum of string literals (no runtime TS enum object exists on the
// contract), so the closed set is declared locally — plan.md §D3 period reconciliation.
export const STATISTICS_PERIODS = [
  "today",
  "this_week",
  "this_month",
  "last_30d",
  "last_90d",
  "this_year",
  "custom",
] as const;
export type StatisticsPeriodValue = (typeof STATISTICS_PERIODS)[number];

const ALL = "__all__";

interface Props {
  period: StatisticsPeriodValue;
  onPeriodChange: (period: StatisticsPeriodValue) => void;
  subscriptionPlanId: string;
  onPlanChange: (id: string) => void;
  wilayaId: string;
  onWilayaChange: (id: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
  plansError: boolean;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
}

export function StatisticsFilterBar({
  period,
  onPeriodChange,
  subscriptionPlanId,
  onPlanChange,
  wilayaId,
  onWilayaChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  plans,
  plansLoading,
  plansError,
  wilayas,
  wilayasLoading,
  wilayasError,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={period} onValueChange={(v) => onPeriodChange(v as StatisticsPeriodValue)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATISTICS_PERIODS.map((p) => (
            <SelectItem key={p} value={p}>
              {t(`admin.statistics.period.${p}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={subscriptionPlanId || ALL}
        onValueChange={(v) => onPlanChange(v === ALL ? "" : v)}
        disabled={plansLoading || plansError}
      >
        <SelectTrigger className="w-44">
          {plansLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.statistics.filters.planPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.statistics.filters.planPlaceholder")}</SelectItem>
          {(plans ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={wilayaId || ALL}
        onValueChange={(v) => onWilayaChange(v === ALL ? "" : v)}
        disabled={wilayasLoading || wilayasError}
      >
        <SelectTrigger className="w-44">
          {wilayasLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.statistics.filters.wilayaPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.statistics.filters.wilayaPlaceholder")}</SelectItem>
          {(wilayas ?? []).map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {formatWilayaLabel(w)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label={t("admin.statistics.filters.dateFrom")}
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">
            {t("admin.statistics.filters.dateTo")}
          </span>
          <Input
            type="date"
            aria-label={t("admin.statistics.filters.dateTo")}
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-40"
          />
        </div>
      )}
    </div>
  );
}
