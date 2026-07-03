import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import type { AvailableCardDTO, SubscriptionPlanDTO } from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on submit — RHF + Zod (create-lot.schema.ts) + useCreateLot wire this in Sprint 4. */
  onSubmit: () => void;
  isPending?: boolean;
  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
  plansError: boolean;
  /** Parent-owned — the page's useAvailableCardsForLot(planId) call needs it. */
  selectedPlanId: string;
  onPlanChange: (id: string) => void;
  candidateCards?: AvailableCardDTO[];
  candidatesLoading: boolean;
  candidatesError: boolean;
}

// Field-markup shell (plan.md's Sprint 2 vs. Sprint 4 split) except for the candidate
// checkbox list — Select/Deselect-All + live count are real, local UI behavior (not data
// wiring), so they're built here, same reasoning as CreateDistributorModal's Sprint-3
// wilaya→commune dependency.
export function CreateLotModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  plans,
  plansLoading,
  plansError,
  selectedPlanId,
  onPlanChange,
  candidateCards,
  candidatesLoading,
  candidatesError,
}: Props) {
  const { t } = useTranslation();
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const toggleCard = (id: string) =>
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

  const cards = candidateCards ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedCardIds([]);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.setsLots.lots.create.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.setsLots.lots.create.plan")}</Label>
            <Select
              value={selectedPlanId}
              onValueChange={(v) => {
                onPlanChange(v);
                setSelectedCardIds([]);
              }}
              disabled={plansLoading || plansError}
            >
              <SelectTrigger>
                {plansLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <SelectValue placeholder={t("admin.setsLots.lots.filters.planPlaceholder")} />
                )}
              </SelectTrigger>
              <SelectContent>
                {(plans ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {candidatesLoading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!candidatesLoading && !!selectedPlanId && cards.length === 0 && (
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title={t("admin.setsLots.lots.create.noCandidates")}
              body=""
            />
          )}

          {!candidatesLoading && cards.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => setSelectedCardIds(cards.map((c) => c.id))}
                >
                  {t("common.actions.selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => setSelectedCardIds([])}
                >
                  {t("common.actions.deselectAll")}
                </Button>
              </div>
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {cards.map((card) => (
                  <label
                    key={card.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-2 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedCardIds.includes(card.id)}
                      onCheckedChange={() => toggleCard(card.id)}
                    />
                    <span className="font-mono">{card.key}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("admin.setsLots.lots.create.selectedCount", {
                  count: selectedCardIds.length,
                  total: cards.length,
                })}
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending || selectedCardIds.length === 0}>
            {t("common.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
