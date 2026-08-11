import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  LotCreationConflictDetailsSchema,
  CardUnavailableReason,
  type CreateLotCommand,
  type UnavailableCardDTO,
} from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { CardPicker } from "./CardPicker";
import { createLotSchema } from "./create-lot.schema";
import type { SelectedCard } from "./card-picker.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateLotCommand) => void;
  isPending?: boolean;
  /** The create mutation's error — a 409 carries error.details.unavailableCards (set-8-plan §5). */
  createError?: unknown;
}

const REASON_LABEL_KEY: Record<CardUnavailableReason, string> = {
  [CardUnavailableReason.NOT_FOUND]: "admin.setsLots.lots.create.picker.reason.notFound",
  [CardUnavailableReason.ALREADY_IN_LOT]: "admin.setsLots.lots.create.picker.reason.alreadyInLot",
  [CardUnavailableReason.NOT_PRINTED]: "admin.setsLots.lots.create.picker.reason.notPrinted",
  [CardUnavailableReason.WRONG_PLAN]: "admin.setsLots.lots.create.picker.reason.wrongPlan",
  [CardUnavailableReason.DISABLED]: "admin.setsLots.lots.create.picker.reason.disabled",
  [CardUnavailableReason.REVOKED]: "admin.setsLots.lots.create.picker.reason.revoked",
};

// A create conflict (409) returns exactly which cards failed and why (error.details), typed —
// the same job CreateSetModal's ad-hoc `{ takenKeys }` parse does today, typed instead of
// guessed (set-8-plan §5.5).
function extractUnavailableCards(error: unknown): UnavailableCardDTO[] {
  if (axios.isAxiosError(error)) {
    const details = (error.response?.data as { error?: { details?: unknown } })?.error?.details;
    const parsed = LotCreationConflictDetailsSchema.safeParse(details);
    if (parsed.success) return parsed.data.unavailableCards;
  }
  return [];
}

// Self-contained (calls its own useSubscriptionPlans) — the page passes no data props, only
// the submit handler and the create error, mirroring CreateSetModal's architecture.
export function CreateLotModal({ open, onOpenChange, onSubmit, isPending, createError }: Props) {
  const { t } = useTranslation();
  const plansQuery = useSubscriptionPlans({ active: true });
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [selected, setSelected] = useState<Map<string, SelectedCard>>(new Map());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSubscriptionPlanId("");
      setSelected(new Map());
      setFormError(null);
    }
  }, [open]);

  const unavailableCards = useMemo(() => extractUnavailableCards(createError), [createError]);

  // A 409 removes exactly the failed cards from the live selection (set-8-plan §5.5) — the
  // admin's remaining, still-valid selection survives and Create can be pressed again immediately.
  useEffect(() => {
    if (unavailableCards.length === 0) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const c of unavailableCards) next.delete(c.cardId);
      return next;
    });
    // Only when a fresh conflict arrives, never on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createError]);

  const submit = () => {
    const parsed = createLotSchema(t).safeParse({
      subscriptionPlanId,
      cardIds: [...selected.keys()],
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setFormError(null);
    onSubmit(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("admin.setsLots.lots.create.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.setsLots.lots.create.plan")}</Label>
            <Select
              value={subscriptionPlanId}
              onValueChange={(v) => {
                setSubscriptionPlanId(v);
                setSelected(new Map()); // a different plan invalidates every prior selection
              }}
              disabled={plansQuery.isLoading || plansQuery.isError}
            >
              <SelectTrigger>
                {plansQuery.isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <SelectValue placeholder={t("admin.setsLots.lots.create.planPlaceholder")} />
                )}
              </SelectTrigger>
              <SelectContent>
                {(plansQuery.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!subscriptionPlanId && (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {t("admin.setsLots.lots.create.picker.choosePlanFirst")}
            </p>
          )}

          {subscriptionPlanId && (
            <CardPicker
              subscriptionPlanId={subscriptionPlanId}
              selected={selected}
              setSelected={setSelected}
            />
          )}

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          {unavailableCards.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <div className="flex items-center gap-1.5 font-medium text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t("admin.setsLots.lots.create.picker.conflictTitle")}
              </div>
              <ul className="list-inside list-disc space-y-0.5 text-destructive">
                {unavailableCards.map((c) => (
                  <li key={c.cardId} className="font-mono">
                    {c.key ?? t("admin.setsLots.lots.create.picker.reason.unknownCard")} —{" "}
                    {t(REASON_LABEL_KEY[c.reason])}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={isPending || selected.size === 0}>
            {isPending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("common.actions.submitting")}
              </>
            ) : (
              t("admin.setsLots.lots.create.submitWithCount", { count: selected.size })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
