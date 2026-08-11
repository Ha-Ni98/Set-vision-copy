import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import {
  addActivationEmailSchema,
  type AddActivationEmailFormValues,
} from "./add-activation-email.schema";

const DEFAULT_VALUES: AddActivationEmailFormValues = { subscriptionPlanId: "", email: "" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AddActivationEmailFormValues) => void;
  isPending?: boolean;
  /** True right after a submit attempt failed with 409 (already in the pool for this plan) —
   *  a correctable user error, surfaced inline in addition to the global toast (plan §7.2). */
  duplicateError?: boolean;
}

export function AddActivationEmailModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  duplicateError,
}: Props) {
  const { t } = useTranslation();
  const plansQuery = useSubscriptionPlans({ active: true });
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AddActivationEmailFormValues>({
    resolver: zodResolver(addActivationEmailSchema(t)),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.settings.activationEmails.add.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.settings.activationEmails.add.plan")}</Label>
            <Controller
              control={control}
              name="subscriptionPlanId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={plansQuery.isLoading || plansQuery.isError}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.validation.selectRequired")} />
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
          <div className="space-y-2">
            <Label htmlFor="add-activation-email-email">
              {t("admin.settings.activationEmails.add.email")}
            </Label>
            <Input
              id="add-activation-email-email"
              type="email"
              aria-invalid={!!errors.email || !!duplicateError}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : (
              duplicateError && (
                <p className="text-sm text-destructive">
                  {t("admin.settings.activationEmails.add.duplicate")}
                </p>
              )
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
