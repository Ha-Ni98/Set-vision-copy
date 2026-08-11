import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useWilayas } from "@/hooks/useGeography";
import { StatisticsFilterBar, type StatisticsPeriodValue } from "./components/StatisticsFilterBar";
import { OverviewTab } from "./components/OverviewTab";
import { RevenueTab } from "./components/RevenueTab";

// Filter bar is hoisted above the tabs (Set 11 plan §6.1) — period/plan/wilaya drive both the
// Overview and Revenue tabs, so switching tabs never resets the selection. Radix unmounts
// inactive TabsContent, so the Revenue tab's queries only fire once it's opened.
export default function StatisticsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<StatisticsPeriodValue>("this_month");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [wilayaId, setWilayaId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const plansQuery = useSubscriptionPlans({ active: true });
  const wilayasQuery = useWilayas();

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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("admin.statistics.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="revenue">{t("admin.statistics.tabs.revenue")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            period={period}
            subscriptionPlanId={subscriptionPlanId}
            wilayaId={wilayaId}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueTab
            period={period}
            subscriptionPlanId={subscriptionPlanId}
            wilayaId={wilayaId}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
