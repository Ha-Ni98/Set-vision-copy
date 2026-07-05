import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useStatisticsOverview, useWilayaHeatmap, useWilayaDrilldown } from "@/hooks/useStatistics";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useWilayas } from "@/hooks/useGeography";
import { StatisticsFilterBar, type StatisticsPeriodValue } from "./components/StatisticsFilterBar";
import { ActivationsOverTimeChart } from "./components/ActivationsOverTimeChart";
import { ActivationsByStateDonut } from "./components/ActivationsByStateDonut";
import { TopActivatorsBar } from "./components/TopActivatorsBar";
import { TopDistributorsBar } from "./components/TopDistributorsBar";
import { AvgTimeTrendChart } from "./components/AvgTimeTrendChart";
import { RevenueOverTimeChart } from "./components/RevenueOverTimeChart";
import { WilayaHeatmap, type WilayaHeatmapEntry } from "./components/WilayaHeatmap";
import { HeatmapLegend } from "./components/HeatmapLegend";
import { HeatmapColorModeSelect } from "./components/HeatmapColorModeSelect";
import type { HeatmapColorMode } from "./components/heatmap-color-scale";
import { WilayaDrilldownPanel } from "./components/WilayaDrilldownPanel";

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function StatisticsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<StatisticsPeriodValue>("this_month");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [wilayaId, setWilayaId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
  const plansQuery = useSubscriptionPlans({ active: true });
  const wilayasQuery = useWilayas();

  const heatmapQuery = useWilayaHeatmap({
    period,
    subscriptionPlanId: subscriptionPlanId || undefined,
  });
  const drilldownQuery = useWilayaDrilldown(selectedWilaya?.wilayaId ?? "", { period });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.shell.nav.statistics")}
        subtitle={t("admin.statistics.subtitle")}
      />

      <StatisticsFilterBar
        period={period}
        onPeriodChange={setPeriod}
        subscriptionPlanId={subscriptionPlanId}
        onPlanChange={setSubscriptionPlanId}
        wilayaId={wilayaId}
        onWilayaChange={setWilayaId}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        plans={plansQuery.data}
        plansLoading={plansQuery.isLoading}
        plansError={plansQuery.isError}
        wilayas={wilayasQuery.data}
        wilayasLoading={wilayasQuery.isLoading}
        wilayasError={wilayasQuery.isError}
      />

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
