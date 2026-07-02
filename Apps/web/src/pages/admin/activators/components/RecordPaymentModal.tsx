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
  /** Called with the raw form values on submit — RHF + Zod validation wires this in Sprint 5. */
  onSubmit: () => void;
  isPending?: boolean;
}

// Field-markup shell only — no RHF/Zod hookup yet (plan.md's Sprint 3 vs. Sprint 5 split).
// Shared by the Activators list (row action) and Activator Detail (+ Record Payment).
export function RecordPaymentModal({ open, onOpenChange, onSubmit, isPending }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.activators.recordPayment.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t("admin.activators.recordPayment.amount")}</Label>
            <Input id="payment-amount" type="number" min={0} step={0.01} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-date">{t("admin.activators.recordPayment.date")}</Label>
            <Input
              id="payment-date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {t("common.actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
