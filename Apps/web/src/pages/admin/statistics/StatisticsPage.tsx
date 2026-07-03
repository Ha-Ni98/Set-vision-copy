import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { StatisticsFilterBar, type StatisticsPeriodValue } from "./components/StatisticsFilterBar";
import { ActivationsOverTimeChart } from "./components/ActivationsOverTimeChart";
import { ActivationsByStateDonut } from "./components/ActivationsByStateDonut";
import { TopActivatorsBar } from "./components/TopActivatorsBar";
import { TopDistributorsBar } from "./components/TopDistributorsBar";
import { AvgTimeTrendChart } from "./components/AvgTimeTrendChart";
import { RevenueOverTimeChart } from "./components/RevenueOverTimeChart";
import { WilayaHeatmap } from "./components/WilayaHeatmap";
import { HeatmapLegend } from "./components/HeatmapLegend";
import { HeatmapColorModeSelect } from "./components/HeatmapColorModeSelect";
import { WilayaDrilldownPanel } from "./components/WilayaDrilldownPanel";

// Static composition — no data hooks yet (wired in Sprint 4, plan.md §D3).
export default function StatisticsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<StatisticsPeriodValue>("this_month");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [wilayaId, setWilayaId] = useState("");
  const [colorMode, setColorMode] = useState<
    "distributors" | "activations" | "cancellations" | "avgTime"
  >("activations");
  const [drilldownOpen, setDrilldownOpen] = useState(false);

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
        plansLoading
        plansError={false}
        wilayasLoading
        wilayasError={false}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivationsOverTimeChart isLoading isError={false} onRetry={() => {}} />
        <ActivationsByStateDonut isLoading isError={false} onRetry={() => {}} />
        <TopActivatorsBar isLoading isError={false} onRetry={() => {}} />
        <TopDistributorsBar isLoading isError={false} onRetry={() => {}} />
        <AvgTimeTrendChart isLoading isError={false} onRetry={() => {}} />
        <RevenueOverTimeChart isLoading isError={false} onRetry={() => {}} />
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
          isLoading
          isError={false}
          onRetry={() => {}}
          colorMode={colorMode}
          onWilayaSelect={() => setDrilldownOpen(true)}
        />
      </div>

      <WilayaDrilldownPanel
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        isLoading
        isError={false}
        onRetry={() => {}}
      />
    </div>
  );
}
