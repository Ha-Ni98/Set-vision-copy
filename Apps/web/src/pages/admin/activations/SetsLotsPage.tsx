import { useState } from "react";
import { Layers, Package2, CreditCard, Truck, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { SetsFilters } from "./components/SetsFilters";
import { SetsTable } from "./components/SetsTable";
import { LotsFilters } from "./components/LotsFilters";
import { LotsTable } from "./components/LotsTable";
import { CreateSetModal } from "./components/CreateSetModal";
import { CreateLotModal } from "./components/CreateLotModal";

// Static composition — no data hooks yet (wired in Sprint 4, plan.md §D2).
const STATIC_CARDS: DashboardStatCardData[] = [
  {
    key: "totalSets",
    icon: <Layers className="h-5 w-5" />,
    labelKey: "admin.setsLots.stats.totalSets.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "totalLots",
    icon: <Package2 className="h-5 w-5" />,
    labelKey: "admin.setsLots.stats.totalLots.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "cardsInSets",
    icon: <CreditCard className="h-5 w-5" />,
    labelKey: "admin.setsLots.stats.cardsInSets.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "cardsAwaitingDelivery",
    icon: <Truck className="h-5 w-5" />,
    labelKey: "admin.setsLots.stats.cardsAwaitingDelivery.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
];

export default function SetsLotsPage() {
  const { t } = useTranslation();
  const [setsSearch, setSetsSearch] = useState("");
  const [setsPlanId, setSetsPlanId] = useState("");
  const [setsState, setSetsState] = useState("");
  const [lotsSearch, setLotsSearch] = useState("");
  const [lotsPlanId, setLotsPlanId] = useState("");
  const [lotsState, setLotsState] = useState("");
  const [createSetOpen, setCreateSetOpen] = useState(false);
  const [createSetPlanId, setCreateSetPlanId] = useState("");
  const [createLotOpen, setCreateLotOpen] = useState(false);
  const [createLotPlanId, setCreateLotPlanId] = useState("");

  const setsHasFilters = setsSearch.length > 0 || setsPlanId.length > 0 || setsState.length > 0;
  const lotsHasFilters = lotsSearch.length > 0 || lotsPlanId.length > 0 || lotsState.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.setsAndLots")} />

      <StatsRow cards={STATIC_CARDS} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.setsLots.sets.title")}
          </h2>
          <Button onClick={() => setCreateSetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("admin.setsLots.sets.create.title")}
          </Button>
        </div>
        <SetsFilters
          search={setsSearch}
          onSearchChange={setSetsSearch}
          subscriptionPlanId={setsPlanId}
          onPlanChange={setSetsPlanId}
          state={setsState}
          onStateChange={setSetsState}
          plansLoading
          plansError={false}
        />
        <SetsTable
          isLoading
          isError={false}
          onRetry={() => {}}
          hasFilters={setsHasFilters}
          onClearFilters={() => {
            setSetsSearch("");
            setSetsPlanId("");
            setSetsState("");
          }}
          onCreateFirst={() => setCreateSetOpen(true)}
          onSendToPrint={() => {}}
          onMarkPrinted={() => {}}
          onDelete={() => {}}
        />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">{t("admin.setsLots.lots.title")}</h2>
        <LotsFilters
          search={lotsSearch}
          onSearchChange={setLotsSearch}
          subscriptionPlanId={lotsPlanId}
          onPlanChange={setLotsPlanId}
          state={lotsState}
          onStateChange={setLotsState}
          plansLoading
          plansError={false}
        />
        <LotsTable
          isLoading
          isError={false}
          onRetry={() => {}}
          hasFilters={lotsHasFilters}
          onClearFilters={() => {
            setLotsSearch("");
            setLotsPlanId("");
            setLotsState("");
          }}
          onCreateFirst={() => setCreateLotOpen(true)}
          onDelete={() => {}}
        />
      </div>

      <CreateSetModal
        open={createSetOpen}
        onOpenChange={setCreateSetOpen}
        onSubmit={() => setCreateSetOpen(false)}
        plansLoading
        plansError={false}
        selectedPlanId={createSetPlanId}
        onPlanChange={setCreateSetPlanId}
      />

      <CreateLotModal
        open={createLotOpen}
        onOpenChange={setCreateLotOpen}
        onSubmit={() => setCreateLotOpen(false)}
        plansLoading
        plansError={false}
        selectedPlanId={createLotPlanId}
        onPlanChange={setCreateLotPlanId}
        candidatesLoading={false}
        candidatesError={false}
      />
    </div>
  );
}
