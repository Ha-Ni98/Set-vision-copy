import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CreditCard } from "lucide-react";
import type { CreateLotCommand } from "@my-app/contract";
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
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useAvailableCardsForLot } from "@/hooks/useCards";
import { createLotSchema, type CreateLotFormValues } from "./create-lot.schema";

const DEFAULT_VALUES: CreateLotFormValues = { subscriptionPlanId: "", cardIds: [] };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateLotCommand) => void;
  isPending?: boolean;
}

// Calls its own useSubscriptionPlans + useAvailableCardsForLot(watched plan) — no
// page-level data props (mirrors CreateSetModal/CreateOrderModal's Sprint 3/4 architecture).
export function CreateLotModal({ open, onOpenChange, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const plansQuery = useSubscriptionPlans({ active: true });
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateLotFormValues>({
    resolver: zodResolver(createLotSchema(t)),
    defaultValues: DEFAULT_VALUES,
  });
  const subscriptionPlanId = watch("subscriptionPlanId");
  const cardIds = watch("cardIds");
  const candidatesQuery = useAvailableCardsForLot(subscriptionPlanId || undefined);
  const cards = candidatesQuery.data ?? [];

  useEffect(() => {
    if (!open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  const toggleCard = (id: string) => {
    const next = cardIds.includes(id) ? cardIds.filter((c) => c !== id) : [...cardIds, id];
    setValue("cardIds", next, { shouldValidate: true });
  };

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.setsLots.lots.create.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.setsLots.lots.create.plan")}</Label>
            <Controller
              control={control}
              name="subscriptionPlanId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("cardIds", []);
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
              )}
            />
            {errors.subscriptionPlanId && (
              <p className="text-sm text-destructive">{errors.subscriptionPlanId.message}</p>
            )}
          </div>

          {candidatesQuery.isLoading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!candidatesQuery.isLoading && !!subscriptionPlanId && cards.length === 0 && (
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title={t("admin.setsLots.lots.create.noCandidates")}
              body=""
            />
          )}

          {!candidatesQuery.isLoading && cards.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() =>
                    setValue(
                      "cardIds",
                      cards.map((c) => c.id),
                      { shouldValidate: true },
                    )
                  }
                >
                  {t("common.actions.selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => setValue("cardIds", [], { shouldValidate: true })}
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
                      checked={cardIds.includes(card.id)}
                      onCheckedChange={() => toggleCard(card.id)}
                    />
                    <span className="font-mono">{card.key}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("admin.setsLots.lots.create.selectedCount", {
                  count: cardIds.length,
                  total: cards.length,
                })}
              </p>
            </>
          )}
          {errors.cardIds && <p className="text-sm text-destructive">{errors.cardIds.message}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending || cardIds.length === 0}>
              {t("common.actions.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
