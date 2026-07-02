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
import type { ActivatorDetailDTO } from "@my-app/contract";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activator: ActivatorDetailDTO | undefined;
  /** Called on submit — RHF + Zod + useUpdateActivator wire this in Sprint 5. */
  onSubmit: () => void;
  isPending?: boolean;
}

// Field-markup shell only — no RHF/Zod hookup yet (plan.md's Sprint 3 vs. Sprint 5 split).
export function EditActivatorModal({ open, onOpenChange, activator, onSubmit, isPending }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.actions.edit")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-activator-fullname">{t("admin.activators.create.fullName")}</Label>
            <Input id="edit-activator-fullname" defaultValue={activator?.fullName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-activator-username">{t("admin.activators.create.username")}</Label>
            <Input id="edit-activator-username" defaultValue={activator?.username} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-activator-phone">{t("admin.activators.create.phone")}</Label>
            <Input id="edit-activator-phone" type="tel" defaultValue={activator?.phone} />
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
