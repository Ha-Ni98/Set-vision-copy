import { useState } from "react";
import { CreditCard, Store, Flag } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { CardsFilters } from "./components/CardsFilters";
import { CardsTable } from "./components/CardsTable";
import { CardDetailModal } from "./components/CardDetailModal";

// Static composition — no data hooks yet (wired in Sprint 4, plan.md §D3). Cards-by-state
// breakdown isn't a single scalar, so the header stays at 3 cards here (Total, At-Distributor,
// Flagged); Sprint 4 finalizes the exact set once useInventorySummary is wired.
const STATIC_CARDS: DashboardStatCardData[] = [
  {
    key: "totalCards",
    icon: <CreditCard className="h-5 w-5" />,
    labelKey: "admin.cards.stats.totalCards.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "activeCards",
    icon: <Store className="h-5 w-5" />,
    labelKey: "admin.cards.stats.activeCards.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "flagged",
    icon: <Flag className="h-5 w-5" />,
    labelKey: "admin.cards.stats.flagged.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
];

export default function CardsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const [flag, setFlag] = useState("");
  const [setNumber, setSetNumber] = useState("");
  const [lotNumber, setLotNumber] = useState("");

  const hasFilters =
    search.length > 0 ||
    state.length > 0 ||
    subscriptionPlanId.length > 0 ||
    distributorId.length > 0 ||
    flag.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.cards")} />

      <StatsRow cards={STATIC_CARDS} />

      <CardsFilters
        search={search}
        onSearchChange={setSearch}
        state={state}
        onStateChange={setState}
        subscriptionPlanId={subscriptionPlanId}
        onPlanChange={setSubscriptionPlanId}
        distributorId={distributorId}
        onDistributorChange={setDistributorId}
        flag={flag}
        onFlagChange={setFlag}
        plansLoading
        plansError={false}
        distributorsLoading
        distributorsError={false}
        setNumber={setNumber || undefined}
        onClearSetFilter={() => setSetNumber("")}
        lotNumber={lotNumber || undefined}
        onClearLotFilter={() => setLotNumber("")}
      />

      <CardsTable
        isLoading
        isError={false}
        onRetry={() => {}}
        hasFilters={hasFilters}
        onClearFilters={() => {
          setSearch("");
          setState("");
          setSubscriptionPlanId("");
          setDistributorId("");
          setFlag("");
        }}
        onView={() => {}}
        onDisable={() => {}}
        onEnable={() => {}}
        onRevoke={() => {}}
        onDelete={() => {}}
      />

      <CardDetailModal
        open={false}
        onOpenChange={() => {}}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
      />
    </div>
  );
}
