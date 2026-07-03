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
  /** Called on submit — RHF + Zod (set-activator-price.schema.ts) + useSetActivationPrice wire this in Sprint 3. */
  onSubmit: () => void;
  isPending?: boolean;
  /** Prefills the field when overriding an already-set price. */
  currentAmount?: number | null;
}

// Field-markup shell only — no RHF/Zod hookup yet (Sprint 2 vs Sprint 3 split). Shared by
// the Activations list (row action) and Activation Detail's Financial block.
export function SetActivatorPriceModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  currentAmount,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.activations.setPriceModal.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="set-activator-price-amount">
              {t("admin.activations.setPriceModal.amount")}
            </Label>
            <Input
              id="set-activator-price-amount"
              type="number"
              min={0}
              step={0.01}
              defaultValue={currentAmount ?? 0}
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
