import { useMemo, useState } from "react";
import { Layers, Package2, CreditCard, Truck, Plus } from "lucide-react";
import {
  SetStat,
  LotStat,
  CardStat,
  type CreateSetCommand,
  type CreateLotCommand,
} from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInventorySummary } from "@/hooks/useStatistics";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useSets, useCreateSet, useTransitionSet, useDeleteSet } from "@/hooks/useSets";
import { useLots, useCreateLot, useDeleteLot } from "@/hooks/useLots";
import { countOf } from "@/lib/utils";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { SetsFilters } from "./components/SetsFilters";
import { SetsTable } from "./components/SetsTable";
import { LotsFilters } from "./components/LotsFilters";
import { LotsTable } from "./components/LotsTable";
import { CreateSetModal } from "./components/CreateSetModal";
import { CreateLotModal } from "./components/CreateLotModal";

const LIMIT = 10;

export default function SetsLotsPage() {
  const { t } = useTranslation();
  const [setsPage, setSetsPage] = useState(1);
  const [setsSearch, setSetsSearch] = useState("");
  const [setsPlanId, setSetsPlanId] = useState("");
  const [setsState, setSetsState] = useState("");
  const [lotsPage, setLotsPage] = useState(1);
  const [lotsSearch, setLotsSearch] = useState("");
  const [lotsPlanId, setLotsPlanId] = useState("");
  const [lotsState, setLotsState] = useState("");
  const [createSetOpen, setCreateSetOpen] = useState(false);
  const [createLotOpen, setCreateLotOpen] = useState(false);

  const debouncedSetsSearch = useDebouncedValue(setsSearch);
  const debouncedLotsSearch = useDebouncedValue(lotsSearch);

  const summary = useInventorySummary();
  const plansQuery = useSubscriptionPlans({ active: true });

  const setsQuery = useSets({
    page: setsPage,
    limit: LIMIT,
    search: debouncedSetsSearch || undefined,
    subscriptionPlanId: setsPlanId || undefined,
    state: (setsState as SetStat) || undefined,
  });
  const lotsQuery = useLots({
    page: lotsPage,
    limit: LIMIT,
    search: debouncedLotsSearch || undefined,
    subscriptionPlanId: lotsPlanId || undefined,
    state: (lotsState as LotStat) || undefined,
  });

  const createSet = useCreateSet();
  const transitionSet = useTransitionSet();
  const deleteSet = useDeleteSet();
  const createLot = useCreateLot();
  const deleteLot = useDeleteLot();
  const isSetsMutating = transitionSet.isPending || deleteSet.isPending;

  const setsHasFilters = setsSearch.length > 0 || setsPlanId.length > 0 || setsState.length > 0;
  const lotsHasFilters = lotsSearch.length > 0 || lotsPlanId.length > 0 || lotsState.length > 0;

  const cards: DashboardStatCardData[] = useMemo(() => {
    const totalSets = summary.data?.sets.reduce((sum, s) => sum + s.count, 0) ?? 0;
    const totalLots = summary.data?.lots.reduce((sum, l) => sum + l.count, 0) ?? 0;
    const cardsInSets = countOf(summary.data?.cards, CardStat.IN_SET);
    const cardsAwaitingDelivery = countOf(summary.data?.cards, CardStat.IN_LOT);
    return [
      {
        key: "totalSets",
        icon: <Layers className="h-5 w-5" />,
        labelKey: "admin.setsLots.stats.totalSets.title",
        value: summary.data ? String(totalSets) : null,
        isLoading: summary.isLoading,
        isError: summary.isError,
        onRetry: summary.refetch,
      },
      {
        key: "totalLots",
        icon: <Package2 className="h-5 w-5" />,
        labelKey: "admin.setsLots.stats.totalLots.title",
        value: summary.data ? String(totalLots) : null,
        isLoading: summary.isLoading,
        isError: summary.isError,
        onRetry: summary.refetch,
      },
      {
        key: "cardsInSets",
        icon: <CreditCard className="h-5 w-5" />,
        labelKey: "admin.setsLots.stats.cardsInSets.title",
        value: summary.data ? String(cardsInSets) : null,
        isLoading: summary.isLoading,
        isError: summary.isError,
        onRetry: summary.refetch,
      },
      {
        key: "cardsAwaitingDelivery",
        icon: <Truck className="h-5 w-5" />,
        labelKey: "admin.setsLots.stats.cardsAwaitingDelivery.title",
        value: summary.data ? String(cardsAwaitingDelivery) : null,
        isLoading: summary.isLoading,
        isError: summary.isError,
        onRetry: summary.refetch,
      },
    ];
  }, [summary.data, summary.isLoading, summary.isError, summary.refetch]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.setsAndLots")} />

      <StatsRow cards={cards} />

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
          onSearchChange={(v) => {
            setSetsSearch(v);
            setSetsPage(1);
          }}
          subscriptionPlanId={setsPlanId}
          onPlanChange={(id) => {
            setSetsPlanId(id);
            setSetsPage(1);
          }}
          state={setsState}
          onStateChange={(s) => {
            setSetsState(s);
            setSetsPage(1);
          }}
          plans={plansQuery.data}
          plansLoading={plansQuery.isLoading}
          plansError={plansQuery.isError}
        />
        <SetsTable
          data={setsQuery.data?.items}
          isLoading={setsQuery.isLoading}
          isError={setsQuery.isError}
          onRetry={setsQuery.refetch}
          hasFilters={setsHasFilters}
          onClearFilters={() => {
            setSetsSearch("");
            setSetsPlanId("");
            setSetsState("");
            setSetsPage(1);
          }}
          onCreateFirst={() => setCreateSetOpen(true)}
          onSendToPrint={(set) =>
            transitionSet.mutate({ id: set.id, command: { to: SetStat.PENDING_PRINTING } })
          }
          onMarkPrinted={(set) =>
            transitionSet.mutate({ id: set.id, command: { to: SetStat.PRINTED } })
          }
          onDelete={(set) => deleteSet.mutate(set.id)}
          isMutating={isSetsMutating}
        />
        {setsQuery.data && (
          <SimplePagination
            page={setsPage}
            totalPages={setsQuery.data.meta.totalPages}
            onPageChange={setSetsPage}
          />
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.setsLots.lots.title")}
          </h2>
          <Button onClick={() => setCreateLotOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("admin.setsLots.lots.create.title")}
          </Button>
        </div>
        <LotsFilters
          search={lotsSearch}
          onSearchChange={(v) => {
            setLotsSearch(v);
            setLotsPage(1);
          }}
          subscriptionPlanId={lotsPlanId}
          onPlanChange={(id) => {
            setLotsPlanId(id);
            setLotsPage(1);
          }}
          state={lotsState}
          onStateChange={(s) => {
            setLotsState(s);
            setLotsPage(1);
          }}
          plans={plansQuery.data}
          plansLoading={plansQuery.isLoading}
          plansError={plansQuery.isError}
        />
        <LotsTable
          data={lotsQuery.data?.items}
          isLoading={lotsQuery.isLoading}
          isError={lotsQuery.isError}
          onRetry={lotsQuery.refetch}
          hasFilters={lotsHasFilters}
          onClearFilters={() => {
            setLotsSearch("");
            setLotsPlanId("");
            setLotsState("");
            setLotsPage(1);
          }}
          onCreateFirst={() => setCreateLotOpen(true)}
          onDelete={(lot) => deleteLot.mutate(lot.id)}
          isMutating={deleteLot.isPending}
        />
        {lotsQuery.data && (
          <SimplePagination
            page={lotsPage}
            totalPages={lotsQuery.data.meta.totalPages}
            onPageChange={setLotsPage}
          />
        )}
      </div>

      <CreateSetModal
        open={createSetOpen}
        onOpenChange={(open) => {
          setCreateSetOpen(open);
          if (!open) createSet.reset(); // clear a stale 409 so reopening starts clean
        }}
        onSubmit={(command: CreateSetCommand) =>
          createSet.mutate(command, { onSuccess: () => setCreateSetOpen(false) })
        }
        isPending={createSet.isPending}
        createError={createSet.error}
      />

      <CreateLotModal
        open={createLotOpen}
        onOpenChange={setCreateLotOpen}
        onSubmit={(command: CreateLotCommand) =>
          createLot.mutate(command, { onSuccess: () => setCreateLotOpen(false) })
        }
        isPending={createLot.isPending}
      />
    </div>
  );
}
