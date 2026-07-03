import type { DeliveryCompanyDTO } from "@my-app/contract";
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
  /** Present when editing — prefills the fields; absent for Add. */
  company?: DeliveryCompanyDTO | null;
  /** Called on submit — RHF + Zod (create/update-delivery-company.schema.ts) +
   * useCreateDeliveryCompany/useUpdateDeliveryCompany wire this in Sprint 5. */
  onSubmit: () => void;
  isPending?: boolean;
}

// Field-markup shell only — no RHF/Zod hookup yet (Sprint 2 vs Sprint 5 split). Shared by
// both Add and Edit (same two fields either way).
export function CompanyModal({ open, onOpenChange, company, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const isEdit = !!company;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(
              isEdit
                ? "admin.settings.companies.edit.title"
                : "admin.settings.companies.create.title",
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">{t("admin.settings.companies.create.name")}</Label>
            <Input id="company-name" defaultValue={company?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-registered-name">
              {t("admin.settings.companies.create.registeredName")}
            </Label>
            <Input id="company-registered-name" defaultValue={company?.registeredName} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {t(isEdit ? "common.actions.save" : "common.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
