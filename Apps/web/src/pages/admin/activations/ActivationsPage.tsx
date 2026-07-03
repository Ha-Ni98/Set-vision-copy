import { useState } from "react";
import { Zap, Clock3, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { ByStateDonut } from "./components/ByStateDonut";
import { ActivationsFilters } from "./components/ActivationsFilters";
import { ActivationsTable } from "./components/ActivationsTable";

// Static composition — no data hooks yet (wired in Sprint 3, plan.md §D1).
const STATIC_CARDS: DashboardStatCardData[] = [
  {
    key: "total",
    icon: <Zap className="h-5 w-5" />,
    labelKey: "admin.activations.stats.total.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "avgDuration",
    icon: <Clock3 className="h-5 w-5" />,
    labelKey: "admin.activations.stats.avgDuration.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "totalRevenue",
    icon: <Wallet className="h-5 w-5" />,
    labelKey: "admin.activations.stats.totalRevenue.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
];

export default function ActivationsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [activatorId, setActivatorId] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const [wilayaId, setWilayaId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [state, setState] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters =
    search.length > 0 ||
    subscriptionPlanId.length > 0 ||
    activatorId.length > 0 ||
    distributorId.length > 0 ||
    wilayaId.length > 0 ||
    communeId.length > 0 ||
    state.length > 0 ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.activations")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <StatsRow cards={STATIC_CARDS} />
        </div>
        <ByStateDonut isLoading isError={false} onRetry={() => {}} />
      </div>

      <ActivationsFilters
        search={search}
        onSearchChange={setSearch}
        subscriptionPlanId={subscriptionPlanId}
        onPlanChange={setSubscriptionPlanId}
        activatorId={activatorId}
        onActivatorChange={setActivatorId}
        distributorId={distributorId}
        onDistributorChange={setDistributorId}
        wilayaId={wilayaId}
        onWilayaChange={(id) => {
          setWilayaId(id);
          setCommuneId("");
        }}
        communeId={communeId}
        onCommuneChange={setCommuneId}
        state={state}
        onStateChange={setState}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        plansLoading
        plansError={false}
        activatorsLoading
        activatorsError={false}
        distributorsLoading
        distributorsError={false}
        wilayasLoading
        wilayasError={false}
        communesLoading={false}
        communesError={false}
      />

      <ActivationsTable
        isLoading
        isError={false}
        onRetry={() => {}}
        hasFilters={hasFilters}
        onClearFilters={() => {
          setSearch("");
          setSubscriptionPlanId("");
          setActivatorId("");
          setDistributorId("");
          setWilayaId("");
          setCommuneId("");
          setState("");
          setDateFrom("");
          setDateTo("");
        }}
        onActivate={() => {}}
        onCancel={() => {}}
        onSetPrice={() => {}}
      />
    </div>
  );
}
