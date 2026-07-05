import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubscriptionType, SubscriptionDuration } from "@my-app/contract";
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
import {
  createSubscriptionPlanSchema,
  type CreateSubscriptionPlanFormValues,
} from "./create-subscription-plan.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateSubscriptionPlanFormValues) => void;
  isPending?: boolean;
}

// Both pickers are enum-driven (plan decision #3) — this shell was already the final field
// set; RHF's Controller is required since shadcn's Select isn't a native input register() can
// bind to (Part-1 precedent).
export function AddPlanModal({ open, onOpenChange, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateSubscriptionPlanFormValues>({
    resolver: zodResolver(createSubscriptionPlanSchema(t)),
  });

  useEffect(() => {
    if (!open) reset({});
  }, [open, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.settings.plans.create.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.settings.plans.create.type")}</Label>
            <Controller
              control={control}
              name="subscriptionType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.validation.selectRequired")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SubscriptionType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`enums.subscriptionType.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subscriptionType && (
              <p className="text-sm text-destructive">{errors.subscriptionType.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("admin.settings.plans.create.duration")}</Label>
            <Controller
              control={control}
              name="subscriptionDuration"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.validation.selectRequired")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(SubscriptionDuration).map((duration) => (
                      <SelectItem key={duration} value={duration}>
                        {t(`enums.subscriptionDuration.${duration}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subscriptionDuration && (
              <p className="text-sm text-destructive">{errors.subscriptionDuration.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("common.actions.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
