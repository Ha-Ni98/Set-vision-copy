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
  setActivatorPriceSchema,
  type SetActivatorPriceFormValues,
  type SetActivatorPriceFormInput,
} from "./set-activator-price.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SetActivatorPriceFormValues) => void;
  isPending?: boolean;
  /** Prefills the field when overriding an already-set price. */
  currentAmount?: number | null;
}

// Shared by the Activations list (row action) and Activation Detail's Financial block.
export function SetActivatorPriceModal({
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
  } = useForm<SetActivatorPriceFormInput, unknown, SetActivatorPriceFormValues>({
    resolver: zodResolver(setActivatorPriceSchema(t)),
    defaultValues: { amount: currentAmount ?? 0 },
  });

  useEffect(() => {
    if (open) reset({ amount: currentAmount ?? 0 });
  }, [open, currentAmount, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.activations.setPriceModal.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="set-activator-price-amount">
              {t("admin.activations.setPriceModal.amount")}
            </Label>
            <Input
              id="set-activator-price-amount"
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
