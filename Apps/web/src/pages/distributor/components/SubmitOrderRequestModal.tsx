import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SubscriptionPlanDTO, CreateCardOrderRequestCommand } from "@my-app/contract";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import {
  submitOrderRequestSchema,
  type SubmitOrderRequestFormValues,
  type SubmitOrderRequestFormInput,
} from "./submit-order-request.schema";

const DEFAULT_VALUES: SubmitOrderRequestFormInput = {
  subscriptionPlanId: "",
  nbOfCards: 1,
  note: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateCardOrderRequestCommand) => void;
  isPending?: boolean;
  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
}

export function SubmitOrderRequestModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  plans,
  plansLoading,
}: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SubmitOrderRequestFormInput, unknown, SubmitOrderRequestFormValues>({
    resolver: zodResolver(submitOrderRequestSchema(t)),
    defaultValues: DEFAULT_VALUES,
  });

  const subscriptionPlanId = watch("subscriptionPlanId");

  useEffect(() => {
    if (!open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  const submit = handleSubmit((values) => {
    onSubmit({
      subscriptionPlanId: values.subscriptionPlanId,
      nbOfCards: values.nbOfCards,
      ...(values.note && { note: values.note }),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("distributor.orderRequests.submit.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="order-request-plan">{t("distributor.orderRequests.form.plan")}</Label>
            <Select
              value={subscriptionPlanId}
              onValueChange={(v) => setValue("subscriptionPlanId", v, { shouldValidate: true })}
              disabled={plansLoading}
            >
              <SelectTrigger id="order-request-plan">
                <SelectValue placeholder={t("distributor.orderRequests.form.planPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {(plans ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subscriptionPlanId && (
              <p className="text-sm text-destructive">{errors.subscriptionPlanId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-request-quantity">
              {t("distributor.orderRequests.form.quantity")}
            </Label>
            <Input
              id="order-request-quantity"
              type="number"
              min={1}
              max={10_000}
              {...register("nbOfCards")}
            />
            {errors.nbOfCards && (
              <p className="text-sm text-destructive">{errors.nbOfCards.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-request-note">{t("distributor.orderRequests.form.note")}</Label>
            <Textarea id="order-request-note" rows={3} {...register("note")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("common.actions.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
