import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import type { LotDTO, SubscriptionPlanDTO } from "@my-app/contract";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { useTranslation } from "@/hooks/useTranslation";

const ALL = "__all__";

interface Props {
  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
  plansError: boolean;
  subscriptionPlanId: string;
  onPlanChange: (id: string) => void;
  lots?: LotDTO[];
  lotsLoading: boolean;
  lotsError: boolean;
  onRetry: () => void;
  selectedLotIds: string[];
  onToggleLot: (id: string) => void;
}

// Step 2 of the create-order wizard — real hook wiring (useAvailableLotsForOrder +
// useSubscriptionPlans) lands in Sprint 3; this is the static filter/selection UI only.
export function StepSelectLots({
  plans,
  plansLoading,
  plansError,
  subscriptionPlanId,
  onPlanChange,
  lots,
  lotsLoading,
  lotsError,
  onRetry,
  selectedLotIds,
  onToggleLot,
}: Props) {
  const { t } = useTranslation();

  const cardsTotal = useMemo(
    () =>
      (lots ?? [])
        .filter((l) => selectedLotIds.includes(l.id))
        .reduce((sum, l) => sum + l.nbOfCards, 0),
    [lots, selectedLotIds],
  );

  return (
    <div className="flex flex-col gap-4">
      <Select
        value={subscriptionPlanId || ALL}
        onValueChange={(v) => onPlanChange(v === ALL ? "" : v)}
        disabled={plansLoading || plansError}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder={t("admin.setsLots.lots.filters.planPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.setsLots.lots.filters.planPlaceholder")}</SelectItem>
          {(plans ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {lotsLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      )}

      {lotsError && (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
        />
      )}

      {!lotsLoading && !lotsError && (lots ?? []).length === 0 && (
        <EmptyState
          icon={<Layers className="h-6 w-6" />}
          title={t("admin.orders.create.noEligibleLots")}
          body=""
          decoration={
            <Button variant="outline" asChild className="mt-2">
              <Link to="/admin/activations/sets-lots">{t("admin.shell.nav.setsAndLots")}</Link>
            </Button>
          }
        />
      )}

      {!lotsLoading && !lotsError && (lots?.length ?? 0) > 0 && (
        <>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {lots!.map((lot) => (
              <label
                key={lot.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selectedLotIds.includes(lot.id)}
                  onCheckedChange={() => onToggleLot(lot.id)}
                />
                <div>
                  <div className="font-semibold text-foreground">{lot.lotNumber}</div>
                  <div className="text-muted-foreground">
                    {lot.subscriptionLabel} · {lot.nbOfCards}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("admin.orders.create.lotsSelectedCount", {
              count: selectedLotIds.length,
              cards: cardsTotal,
            })}
          </p>
        </>
      )}
    </div>
  );
}
