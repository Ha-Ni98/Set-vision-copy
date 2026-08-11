import { useState } from "react";
import { RevenueGranularity, RevenueDimension, RevenueSort } from "@my-app/contract";
import { useRevenueSummary, useRevenueSeries, useRevenueBreakdown } from "@/hooks/useStatistics";
import { useTranslation } from "@/hooks/useTranslation";
import { RevenueKpiRow } from "./RevenueKpiRow";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { CashOutSplitBar } from "./CashOutSplitBar";
import { RevenueBreakdownChart } from "./RevenueBreakdownChart";
import type { StatisticsPeriodValue } from "./StatisticsFilterBar";

const BREAKDOWN_LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

interface Props {
  period: StatisticsPeriodValue;
  subscriptionPlanId: string;
  wilayaId: string;
  dateFrom: string;
  dateTo: string;
}

export function RevenueTab({ period, subscriptionPlanId, wilayaId, dateFrom, dateTo }: Props) {
  const { t } = useTranslation();
  const [granularity, setGranularity] = useState<RevenueGranularity>(RevenueGranularity.DAY);
  const [dimension, setDimension] = useState<RevenueDimension>(RevenueDimension.PLAN);

  const isCustom = period === "custom";
  const rangeFilters = {
    period,
    dateFrom: isCustom ? toIsoDate(dateFrom) : undefined,
    dateTo: isCustom ? toIsoDate(dateTo) : undefined,
    subscriptionPlanId: subscriptionPlanId || undefined,
    wilayaId: wilayaId || undefined,
  };

  const summaryQuery = useRevenueSummary(rangeFilters);
  const seriesQuery = useRevenueSeries({ ...rangeFilters, granularity });
  const breakdownQuery = useRevenueBreakdown({
    ...rangeFilters,
    dimension,
    sort: RevenueSort.CASH_IN,
    limit: BREAKDOWN_LIMIT,
  });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">{t("admin.revenue.anchorNote")}</p>

      <RevenueKpiRow
        data={summaryQuery.data}
        isLoading={summaryQuery.isLoading}
        isError={summaryQuery.isError}
        onRetry={summaryQuery.refetch}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueTrendChart
            data={seriesQuery.data}
            isLoading={seriesQuery.isLoading}
            isError={seriesQuery.isError}
            onRetry={seriesQuery.refetch}
            granularity={granularity}
            onGranularityChange={setGranularity}
          />
        </div>
        <CashOutSplitBar
          data={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
          onRetry={summaryQuery.refetch}
        />
      </div>

      <RevenueBreakdownChart
        data={breakdownQuery.data}
        isLoading={breakdownQuery.isLoading}
        isError={breakdownQuery.isError}
        onRetry={breakdownQuery.refetch}
        dimension={dimension}
        onDimensionChange={setDimension}
      />
    </div>
  );
}
