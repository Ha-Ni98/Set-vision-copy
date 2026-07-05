import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Zap, Clock3, Wallet } from "lucide-react";
import { ActivationStat } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useActivationsSummary } from "@/hooks/useStatistics";
import {
  useAdminActivations,
  useActivateByAdmin,
  useCancelByAdmin,
  useSetActivationPrice,
} from "@/hooks/useAdminActivations";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useActivators } from "@/hooks/useActivators";
import { useDistributors } from "@/hooks/useDistributors";
import { useWilayas, useCommunes } from "@/hooks/useGeography";
import { formatTime, formatDZD } from "@/lib/utils";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { ByStateDonut } from "./components/ByStateDonut";
import { ActivationsFilters } from "./components/ActivationsFilters";
import { ActivationsTable } from "./components/ActivationsTable";

const LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function ActivationsPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [activatorId, setActivatorId] = useState(() => searchParams.get("activator") ?? "");
  const [distributorId, setDistributorId] = useState(() => searchParams.get("distributor") ?? "");
  const [wilayaId, setWilayaId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [state, setState] = useState(() => searchParams.get("state") ?? "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebouncedValue(search);

  const summary = useActivationsSummary();
  const activationsQuery = useAdminActivations({
    page,
    limit: LIMIT,
    key: debouncedSearch || undefined,
    subscriptionPlanId: subscriptionPlanId || undefined,
    activatorId: activatorId || undefined,
    distributorId: distributorId || undefined,
    wilayaId: wilayaId || undefined,
    communeId: communeId || undefined,
    state: (state as ActivationStat) || undefined,
    dateFrom: toIsoDate(dateFrom),
    dateTo: toIsoDate(dateTo),
  });
  const plansQuery = useSubscriptionPlans({ active: true });
  const activatorsQuery = useActivators({ page: 1, limit: 100 });
  const distributorsQuery = useDistributors({ page: 1, limit: 100 });
  const wilayasQuery = useWilayas();
  const communesQuery = useCommunes(wilayaId || undefined);

  const activateByAdmin = useActivateByAdmin();
  const cancelByAdmin = useCancelByAdmin();
  const setActivationPrice = useSetActivationPrice();
  const isMutating =
    activateByAdmin.isPending || cancelByAdmin.isPending || setActivationPrice.isPending;

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
  const clearFilters = () => {
    setSearch("");
    setSubscriptionPlanId("");
    setActivatorId("");
    setDistributorId("");
    setWilayaId("");
    setCommuneId("");
    setState("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const cards: DashboardStatCardData[] = [
    {
      key: "total",
      icon: <Zap className="h-5 w-5" />,
      labelKey: "admin.activations.stats.total.title",
      value: summary.data ? String(summary.data.total.all) : null,
      subLabelKey: "admin.activations.stats.total.subLabel",
      subLabelVars: summary.data
        ? {
            today: summary.data.total.today,
            week: summary.data.total.week,
            month: summary.data.total.month,
          }
        : undefined,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "avgDuration",
      icon: <Clock3 className="h-5 w-5" />,
      labelKey: "admin.activations.stats.avgDuration.title",
      value:
        summary.data && summary.data.avgDurationSeconds != null
          ? formatTime(summary.data.avgDurationSeconds)
          : summary.data
            ? "—"
            : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "totalRevenue",
      icon: <Wallet className="h-5 w-5" />,
      labelKey: "admin.activations.stats.totalRevenue.title",
      value: summary.data ? formatDZD(summary.data.totalRevenue, language) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.activations")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <StatsRow cards={cards} />
        </div>
        <ByStateDonut
          data={summary.data?.byState}
          isLoading={summary.isLoading}
          isError={summary.isError}
          onRetry={summary.refetch}
        />
      </div>

      <ActivationsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        subscriptionPlanId={subscriptionPlanId}
        onPlanChange={(id) => {
          setSubscriptionPlanId(id);
          setPage(1);
        }}
        activatorId={activatorId}
        onActivatorChange={(id) => {
          setActivatorId(id);
          setPage(1);
        }}
        distributorId={distributorId}
        onDistributorChange={(id) => {
          setDistributorId(id);
          setPage(1);
        }}
        wilayaId={wilayaId}
        onWilayaChange={(id) => {
          setWilayaId(id);
          setCommuneId("");
          setPage(1);
        }}
        communeId={communeId}
        onCommuneChange={(id) => {
          setCommuneId(id);
          setPage(1);
        }}
        state={state}
        onStateChange={(s) => {
          setState(s);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(v) => {
          setDateFrom(v);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(v) => {
          setDateTo(v);
          setPage(1);
        }}
        plans={plansQuery.data}
        plansLoading={plansQuery.isLoading}
        plansError={plansQuery.isError}
        activators={activatorsQuery.data?.items}
        activatorsLoading={activatorsQuery.isLoading}
        activatorsError={activatorsQuery.isError}
        distributors={distributorsQuery.data?.items}
        distributorsLoading={distributorsQuery.isLoading}
        distributorsError={distributorsQuery.isError}
        wilayas={wilayasQuery.data}
        wilayasLoading={wilayasQuery.isLoading}
        wilayasError={wilayasQuery.isError}
        communes={communesQuery.data}
        communesLoading={communesQuery.isLoading}
        communesError={communesQuery.isError}
      />

      <ActivationsTable
        data={activationsQuery.data?.items}
        isLoading={activationsQuery.isLoading}
        isError={activationsQuery.isError}
        onRetry={activationsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onActivate={(activation, command) => activateByAdmin.mutate({ id: activation.id, command })}
        onCancel={(activation) => cancelByAdmin.mutate(activation.id)}
        onSetPrice={(activation, amount) =>
          setActivationPrice.mutate({ id: activation.id, command: { amount } })
        }
        isMutating={isMutating}
      />

      {activationsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={activationsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
