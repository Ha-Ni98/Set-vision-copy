import { useMemo, useState } from "react";
import { CardStat, CardFlag } from "@my-app/contract";
import type { GetDistributorCardsQuery } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyCards } from "@/hooks/useMyCards";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MyCardsFilters } from "./components/MyCardsFilters";
import { MyCardsTable } from "./components/MyCardsTable";

const LIMIT = 10;

export default function CardsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [cardStat, setCardStat] = useState<CardStat | "">("");
  const [flag, setFlag] = useState<CardFlag | "">("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const plansQuery = useSubscriptionPlans({ active: true });

  const query: GetDistributorCardsQuery = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: debouncedSearch.trim() || undefined,
      cardStat: cardStat || undefined,
      flag: flag || undefined,
      subscriptionPlanId: subscriptionPlanId || undefined,
    }),
    [page, debouncedSearch, cardStat, flag, subscriptionPlanId],
  );

  const cardsQuery = useMyCards(query);

  const hasFilters =
    search.trim().length > 0 || cardStat !== "" || flag !== "" || subscriptionPlanId !== "";
  const clearFilters = () => {
    setSearch("");
    setCardStat("");
    setFlag("");
    setSubscriptionPlanId("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("distributor.cards.title")} />

      <MyCardsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        cardStat={cardStat}
        onCardStatChange={(v) => {
          setCardStat(v);
          setPage(1);
        }}
        flag={flag}
        onFlagChange={(v) => {
          setFlag(v);
          setPage(1);
        }}
        subscriptionPlanId={subscriptionPlanId}
        onSubscriptionPlanIdChange={(v) => {
          setSubscriptionPlanId(v);
          setPage(1);
        }}
        plans={plansQuery.data}
      />

      <MyCardsTable
        data={cardsQuery.data?.items}
        isLoading={cardsQuery.isLoading}
        isError={cardsQuery.isError}
        onRetry={cardsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />

      {cardsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={cardsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
