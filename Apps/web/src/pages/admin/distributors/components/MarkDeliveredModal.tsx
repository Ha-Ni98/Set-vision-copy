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
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on submit — RHF + Zod (mark-delivered.schema.ts) + useTransitionOrder wire this in Sprint 3. */
  onSubmit: () => void;
  isPending?: boolean;
  /** The order's cardsCount — also the field's default value and upper bound. */
  maxCount: number;
}

// Field-markup shell only — no RHF/Zod hookup yet (plan.md's Sprint 2 vs. Sprint 3 split).
export function MarkDeliveredModal({ open, onOpenChange, onSubmit, isPending, maxCount }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.orders.markDelivered.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="mark-delivered-count">
              {t("admin.orders.markDelivered.deliveredCount")}
            </Label>
            <Input
              id="mark-delivered-count"
              type="number"
              min={0}
              max={maxCount}
              step={1}
              defaultValue={maxCount}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {t("common.actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
