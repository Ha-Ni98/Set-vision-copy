import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  setActivationCostSchema,
  type SetActivationCostFormValues,
  type SetActivationCostFormInput,
} from "./set-activation-cost.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SetActivationCostFormValues) => void;
  isPending?: boolean;
  /** Prefills the field when overriding an already-set cost. */
  currentAmount?: number | null;
}

// Shared by the Activations list (row action) and Activation Detail's Financial block —
// copy-adapted from SetActivatorPriceModal.tsx (Set 9 plan §5.3).
export function SetActivationCostModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  currentAmount,
}: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetActivationCostFormInput, unknown, SetActivationCostFormValues>({
    resolver: zodResolver(setActivationCostSchema(t)),
    defaultValues: { amount: currentAmount ?? 0 },
  });

  useEffect(() => {
    if (open) reset({ amount: currentAmount ?? 0 });
  }, [open, currentAmount, reset]);

  const submit = handleSubmit((values) => onSubmit(values));
  const isEditing = currentAmount != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(
              isEditing
                ? "admin.activations.setCostModal.editTitle"
                : "admin.activations.setCostModal.title",
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="set-activation-cost-amount">
              {t("admin.activations.setCostModal.amount")}
            </Label>
            <Input
              id="set-activation-cost-amount"
              type="number"
              min={0}
              step={0.01}
              {...register("amount")}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("common.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
