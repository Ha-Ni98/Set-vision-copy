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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on submit — RHF + Zod (create-subscription-plan.schema.ts) + useCreateSubscriptionPlan wire this in Sprint 5. */
  onSubmit: () => void;
  isPending?: boolean;
}

// Field-markup shell only — no RHF/Zod hookup yet (Sprint 2 vs Sprint 5 split). Both pickers
// are enum-driven (plan decision #3), so this shell is already the final field set.
export function AddPlanModal({ open, onOpenChange, onSubmit, isPending }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.settings.plans.create.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.settings.plans.create.type")}</Label>
            <Select>
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
          </div>
          <div className="space-y-2">
            <Label>{t("admin.settings.plans.create.duration")}</Label>
            <Select>
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
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {t("common.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
