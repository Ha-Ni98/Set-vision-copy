import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CreditCard, Store, Flag } from "lucide-react";
import { CardStat, CardFlag } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInventorySummary } from "@/hooks/useStatistics";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useDistributors } from "@/hooks/useDistributors";
import {
  useCards,
  useCard,
  useDeleteCard,
  useDisableCard,
  useEnableCard,
  useRevokeCard,
} from "@/hooks/useCards";
import { countOf } from "@/lib/utils";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { CardsFilters } from "./components/CardsFilters";
import { CardsTable } from "./components/CardsTable";
import { CardDetailModal } from "./components/CardDetailModal";

const LIMIT = 10;

export default function CardsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(() => searchParams.get("key") ?? "");
  const [state, setState] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [distributorId, setDistributorId] = useState(() => searchParams.get("distributor") ?? "");
  const [flag, setFlag] = useState("");
  const [setNumber, setSetNumber] = useState(() => searchParams.get("set") ?? "");
  const [lotNumber, setLotNumber] = useState(() => searchParams.get("lot") ?? "");
  const [viewCardId, setViewCardId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const summary = useInventorySummary();
  const plansQuery = useSubscriptionPlans({ active: true });
  const distributorsQuery = useDistributors({ limit: 100 });
  const cardsQuery = useCards({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    state: (state as CardStat) || undefined,
    setNumber: setNumber || undefined,
    lotNumber: lotNumber || undefined,
    distributorId: distributorId || undefined,
    subscriptionPlanId: subscriptionPlanId || undefined,
    flag: (flag as CardFlag) || undefined,
  });
  const cardDetailQuery = useCard(viewCardId);

  const deleteCard = useDeleteCard();
  const disableCard = useDisableCard();
  const enableCard = useEnableCard();
  const revokeCard = useRevokeCard();
  const isMutating =
    deleteCard.isPending || disableCard.isPending || enableCard.isPending || revokeCard.isPending;

  const hasFilters =
    search.length > 0 ||
    state.length > 0 ||
    subscriptionPlanId.length > 0 ||
    distributorId.length > 0 ||
    flag.length > 0 ||
    setNumber.length > 0 ||
    lotNumber.length > 0;

  const cards: DashboardStatCardData[] = useMemo(() => {
    const totalCards = summary.data?.cards.reduce((sum, c) => sum + c.count, 0) ?? 0;
    const activeCards = countOf(summary.data?.cards, CardStat.AT_DISTRIBUTOR);
    const flagged = summary.data
      ? summary.data.cardFlags.disabled + summary.data.cardFlags.revoked
      : 0;
    return [
      {
        key: "totalCards",
        icon: <CreditCard className="h-5 w-5" />,
        labelKey: "admin.cards.stats.totalCards.title",
        value: summary.data ? String(totalCards) : null,
        isLoading: summary.isLoading,
        isError: summary.isError,
        onRetry: summary.refetch,
      },
      {
        key: "activeCards",
        icon: <Store className="h-5 w-5" />,
        labelKey: "admin.cards.stats.activeCards.title",
        value: summary.data ? String(activeCards) : null,
        isLoading: summary.isLoading,
        isError: summary.isError,
        onRetry: summary.refetch,
      },
      {
        key: "flagged",
        icon: <Flag className="h-5 w-5" />,
        labelKey: "admin.cards.stats.flagged.title",
        value: summary.data ? String(flagged) : null,
        isLoading: summary.isLoading,
        isError: summary.isError,
        onRetry: summary.refetch,
      },
    ];
  }, [summary.data, summary.isLoading, summary.isError, summary.refetch]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.cards")} />

      <StatsRow cards={cards} />

      <CardsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        state={state}
        onStateChange={(s) => {
          setState(s);
          setPage(1);
        }}
        subscriptionPlanId={subscriptionPlanId}
        onPlanChange={(id) => {
          setSubscriptionPlanId(id);
          setPage(1);
        }}
        distributorId={distributorId}
        onDistributorChange={(id) => {
          setDistributorId(id);
          setPage(1);
        }}
        flag={flag}
        onFlagChange={(f) => {
          setFlag(f);
          setPage(1);
        }}
        plans={plansQuery.data}
        plansLoading={plansQuery.isLoading}
        plansError={plansQuery.isError}
        distributors={distributorsQuery.data?.items}
        distributorsLoading={distributorsQuery.isLoading}
        distributorsError={distributorsQuery.isError}
        setNumber={setNumber || undefined}
        onClearSetFilter={() => {
          setSetNumber("");
          setPage(1);
        }}
        lotNumber={lotNumber || undefined}
        onClearLotFilter={() => {
          setLotNumber("");
          setPage(1);
        }}
      />

      <CardsTable
        data={cardsQuery.data?.items}
        isLoading={cardsQuery.isLoading}
        isError={cardsQuery.isError}
        onRetry={cardsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={() => {
          setSearch("");
          setState("");
          setSubscriptionPlanId("");
          setDistributorId("");
          setFlag("");
          setSetNumber("");
          setLotNumber("");
          setPage(1);
        }}
        onView={(card) => {
          setViewCardId(card.id);
          setDetailOpen(true);
        }}
        onDisable={(card) => disableCard.mutate(card.id)}
        onEnable={(card) => enableCard.mutate(card.id)}
        onRevoke={(card) => revokeCard.mutate(card.id)}
        onDelete={(card) => deleteCard.mutate(card.id)}
        isMutating={isMutating}
      />

      {cardsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={cardsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <CardDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        card={cardDetailQuery.data}
        isLoading={cardDetailQuery.isLoading}
        isError={cardDetailQuery.isError}
        onRetry={cardDetailQuery.refetch}
      />
    </div>
  );
}
