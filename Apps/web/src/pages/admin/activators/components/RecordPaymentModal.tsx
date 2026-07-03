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
  recordPaymentSchema,
  type RecordPaymentFormValues,
  type RecordPaymentFormInput,
} from "./record-payment.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RecordPaymentFormValues) => void;
  isPending?: boolean;
}

// Shared by the Activators list (row action) and Activator Detail (+ Record Payment).
// `activatorId` isn't a form field — the caller injects it (from the row/route) when
// building the final RecordPaymentCommand (plan.md §D2.4).
export function RecordPaymentModal({ open, onOpenChange, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecordPaymentFormInput, unknown, RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentSchema(t)),
    defaultValues: { amount: 0, date: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (!open) reset({ amount: 0, date: new Date().toISOString().slice(0, 10) });
  }, [open, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.activators.recordPayment.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t("admin.activators.recordPayment.amount")}</Label>
            <Input id="payment-amount" type="number" min={0} step={0.01} {...register("amount")} />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-date">{t("admin.activators.recordPayment.date")}</Label>
            <Input id="payment-date" type="date" {...register("date")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("common.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
