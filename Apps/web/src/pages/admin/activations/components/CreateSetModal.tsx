import { Loader2 } from "lucide-react";
import type { SubscriptionPlanDTO } from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on submit — RHF + Zod (create-set.schema.ts) + useCreateSet wire this in Sprint 4. */
  onSubmit: () => void;
  isPending?: boolean;
  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
  plansError: boolean;
  selectedPlanId: string;
  onPlanChange: (id: string) => void;
}

// Field-markup shell only — no RHF/Zod hookup yet (plan.md's Sprint 2 vs. Sprint 4 split).
export function CreateSetModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  plans,
  plansLoading,
  plansError,
  selectedPlanId,
  onPlanChange,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.setsLots.sets.create.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.setsLots.sets.create.plan")}</Label>
            <Select
              value={selectedPlanId}
              onValueChange={onPlanChange}
              disabled={plansLoading || plansError}
            >
              <SelectTrigger>
                {plansLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <SelectValue placeholder={t("admin.setsLots.sets.filters.planPlaceholder")} />
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
          <div className="space-y-2">
            <Label htmlFor="create-set-numberofkeys">
              {t("admin.setsLots.sets.create.numberOfKeys")}
            </Label>
            <Input id="create-set-numberofkeys" type="number" min={1} step={1} defaultValue={100} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {t("common.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
