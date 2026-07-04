import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { CreateSetCommand } from "@my-app/contract";
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
  createSetSchema,
  type CreateSetFormValues,
  type CreateSetFormInput,
} from "./create-set.schema";

const DEFAULT_VALUES: CreateSetFormInput = { subscriptionPlanId: "", numberOfKeys: 100 };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateSetCommand) => void;
  isPending?: boolean;
}

// Calls its own useSubscriptionPlans — no page-level data props (mirrors CreateOrderModal's
// Sprint 3 architecture: any component can call hooks, and this modal is always-mounted).
export function CreateSetModal({ open, onOpenChange, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const plansQuery = useSubscriptionPlans({ active: true });
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateSetFormInput, unknown, CreateSetFormValues>({
    resolver: zodResolver(createSetSchema(t)),
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
          <DialogTitle>{t("admin.setsLots.sets.create.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.setsLots.sets.create.plan")}</Label>
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
                    {plansQuery.isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <SelectValue placeholder={t("admin.setsLots.sets.create.planPlaceholder")} />
                    )}
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
            <Label htmlFor="create-set-numberofkeys">
              {t("admin.setsLots.sets.create.numberOfKeys")}
            </Label>
            <Input
              id="create-set-numberofkeys"
              type="number"
              min={1}
              step={1}
              {...register("numberOfKeys")}
            />
            {errors.numberOfKeys && (
              <p className="text-sm text-destructive">{errors.numberOfKeys.message}</p>
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
