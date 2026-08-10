import { useState } from "react";
import { useStatisticsOverview, useWilayaHeatmap, useWilayaDrilldown } from "@/hooks/useStatistics";
import { useTranslation } from "@/hooks/useTranslation";
import { ActivationsOverTimeChart } from "./ActivationsOverTimeChart";
import { ActivationsByStateDonut } from "./ActivationsByStateDonut";
import { TopActivatorsBar } from "./TopActivatorsBar";
import { TopDistributorsBar } from "./TopDistributorsBar";
import { AvgTimeTrendChart } from "./AvgTimeTrendChart";
import { RevenueOverTimeChart } from "./RevenueOverTimeChart";
import { WilayaHeatmap, type WilayaHeatmapEntry } from "./WilayaHeatmap";
import { HeatmapLegend } from "./HeatmapLegend";
import { HeatmapColorModeSelect } from "./HeatmapColorModeSelect";
import type { HeatmapColorMode } from "./heatmap-color-scale";
import { WilayaDrilldownPanel } from "./WilayaDrilldownPanel";
import type { StatisticsPeriodValue } from "./StatisticsFilterBar";

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

// Lifted verbatim from the pre-tabs StatisticsPage body (Set 11 plan §6.2) — every chart
// component and prop is unchanged, only the filter state now arrives as props instead of local
// useState (it's hoisted to StatisticsPage so the Revenue tab shares it).
export function OverviewTab({ period, subscriptionPlanId, wilayaId, dateFrom, dateTo }: Props) {
  const { t } = useTranslation();
  const [colorMode, setColorMode] = useState<HeatmapColorMode>("activations");
  const [selectedWilaya, setSelectedWilaya] = useState<WilayaHeatmapEntry | null>(null);
  const [drilldownOpen, setDrilldownOpen] = useState(false);

  const isCustom = period === "custom";

  const overviewQuery = useStatisticsOverview({
    period,
    dateFrom: isCustom ? toIsoDate(dateFrom) : undefined,
    dateTo: isCustom ? toIsoDate(dateTo) : undefined,
    subscriptionPlanId: subscriptionPlanId || undefined,
    wilayaId: wilayaId || undefined,
  });

  const heatmapQuery = useWilayaHeatmap({
    period,
    subscriptionPlanId: subscriptionPlanId || undefined,
  });
  const drilldownQuery = useWilayaDrilldown(selectedWilaya?.wilayaId ?? "", { period });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivationsOverTimeChart
          data={overviewQuery.data?.activationsOverTime}
          isLoading={overviewQuery.isLoading}
          isError={overviewQuery.isError}
          onRetry={overviewQuery.refetch}
        />
        <ActivationsByStateDonut
          data={overviewQuery.data?.activationsByState}
          isLoading={overviewQuery.isLoading}
          isError={overviewQuery.isError}
          onRetry={overviewQuery.refetch}
        />
        <TopActivatorsBar
          data={overviewQuery.data?.topActivators}
          isLoading={overviewQuery.isLoading}
          isError={overviewQuery.isError}
          onRetry={overviewQuery.refetch}
        />
        <TopDistributorsBar
          data={overviewQuery.data?.topDistributors}
          isLoading={overviewQuery.isLoading}
          isError={overviewQuery.isError}
          onRetry={overviewQuery.refetch}
        />
        <AvgTimeTrendChart
          data={overviewQuery.data?.avgTimeTrend}
          isLoading={overviewQuery.isLoading}
          isError={overviewQuery.isError}
          onRetry={overviewQuery.refetch}
        />
        <RevenueOverTimeChart
          data={overviewQuery.data?.revenueOverTime}
          isLoading={overviewQuery.isLoading}
          isError={overviewQuery.isError}
          onRetry={overviewQuery.refetch}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">{t("admin.statistics.heatmap.title")}</h3>
          <div className="flex items-center gap-3">
            <HeatmapLegend />
            <HeatmapColorModeSelect value={colorMode} onChange={setColorMode} />
          </div>
        </div>
        <WilayaHeatmap
          data={heatmapQuery.data}
          isLoading={heatmapQuery.isLoading}
          isError={heatmapQuery.isError}
          onRetry={heatmapQuery.refetch}
          colorMode={colorMode}
          onWilayaSelect={(wilaya) => {
            setSelectedWilaya(wilaya);
            setDrilldownOpen(true);
          }}
          selectedWilayaId={selectedWilaya?.wilayaId}
        />
      </div>

      <WilayaDrilldownPanel
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        data={drilldownQuery.data}
        isLoading={drilldownQuery.isLoading}
        isError={drilldownQuery.isError}
        onRetry={drilldownQuery.refetch}
      />
    </div>
  );
}
