import type { AdminDTO } from "@my-app/contract";
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
  admin: AdminDTO | null;
  /** Called on submit — RHF + Zod (update-admin.schema.ts) + useUpdateAdmin wire this in Sprint 5. */
  onSubmit: () => void;
  isPending?: boolean;
}

// Field-markup shell only — no RHF/Zod hookup yet (Sprint 2 vs Sprint 5 split).
export function EditAdminModal({ open, onOpenChange, admin, onSubmit, isPending }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.settings.admins.edit.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-admin-fullname">
              {t("admin.settings.admins.create.fullName")}
            </Label>
            <Input id="edit-admin-fullname" defaultValue={admin?.fullName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-admin-username">
              {t("admin.settings.admins.create.username")}
            </Label>
            <Input id="edit-admin-username" defaultValue={admin?.username} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-admin-phone">{t("admin.settings.admins.create.phone")}</Label>
            <Input id="edit-admin-phone" type="tel" defaultValue={admin?.phone} />
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
