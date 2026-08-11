import { useMemo, useState } from "react";
import { ActivationStat, CardStat } from "@my-app/contract";
import type { GetDistributorActivationsQuery, DistributorActivationDTO } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyCardActivations, useMyCardActivation } from "@/hooks/useMyCardActivations";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MyActivationsFilters, type SortOption } from "./components/MyActivationsFilters";
import { MyActivationsTable } from "./components/MyActivationsTable";
import { MyActivationDetailDrawer } from "./components/MyActivationDetailDrawer";

const LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function sortToQuery(sort: SortOption): Pick<GetDistributorActivationsQuery, "sortBy" | "sortDir"> {
  switch (sort) {
    case "OLDEST":
      return { sortBy: "requestedAt", sortDir: "asc" };
    case "COMPLETED":
      return { sortBy: "completedAt", sortDir: "desc" };
    default:
      return { sortBy: "requestedAt", sortDir: "desc" };
  }
}

export default function ActivationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<ActivationStat | "">("");
  const [cardStat, setCardStat] = useState<CardStat | "">("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortOption>("NEWEST");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const plansQuery = useSubscriptionPlans({ active: true });

  const query: GetDistributorActivationsQuery = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: debouncedSearch.trim() || undefined,
      state: state || undefined,
      cardStat: cardStat || undefined,
      subscriptionPlanId: subscriptionPlanId || undefined,
      dateFrom: toIsoDate(dateFrom),
      dateTo: toIsoDate(dateTo),
      ...sortToQuery(sort),
    }),
    [page, debouncedSearch, state, cardStat, subscriptionPlanId, dateFrom, dateTo, sort],
  );

  const activationsQuery = useMyCardActivations(query);
  const detailQuery = useMyCardActivation(selectedId ?? "");

  const hasFilters =
    search.trim().length > 0 ||
    state !== "" ||
    cardStat !== "" ||
    subscriptionPlanId !== "" ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  const clearFilters = () => {
    setSearch("");
    setState("");
    setCardStat("");
    setSubscriptionPlanId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const openDetail = (activation: DistributorActivationDTO) => setSelectedId(activation.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("distributor.activations.title")} />

      <MyActivationsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        state={state}
        onStateChange={(v) => {
          setState(v);
          setPage(1);
        }}
        cardStat={cardStat}
        onCardStatChange={(v) => {
          setCardStat(v);
          setPage(1);
        }}
        subscriptionPlanId={subscriptionPlanId}
        onSubscriptionPlanIdChange={(v) => {
          setSubscriptionPlanId(v);
          setPage(1);
        }}
        plans={plansQuery.data}
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
        sort={sort}
        onSortChange={setSort}
      />

      <MyActivationsTable
        data={activationsQuery.data?.items}
        isLoading={activationsQuery.isLoading}
        isError={activationsQuery.isError}
        onRetry={activationsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onRowClick={openDetail}
      />

      {activationsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={activationsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <MyActivationDetailDrawer
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        activation={detailQuery.data}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        onRetry={detailQuery.refetch}
      />
    </div>
  );
}
