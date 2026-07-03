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
import { GeneratedPasswordPanel } from "../../activators/components/GeneratedPasswordPanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on submit — RHF + Zod (create-admin.schema.ts) + useCreateAdmin wire this in Sprint 5. */
  onSubmit: () => void;
  isPending?: boolean;
  /** Set once the create mutation succeeds — swaps the form for the one-time reveal. */
  generatedPassword?: string | null;
}

// Field-markup shell only — no RHF/Zod hookup yet (Sprint 2 vs Sprint 5 split), mirrors
// Part-1's CreateActivatorModal exactly (same one-time-password swap pattern).
export function AddAdminModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  generatedPassword,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.settings.admins.create.title")}</DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          <>
            <GeneratedPasswordPanel password={generatedPassword} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{t("common.actions.confirm")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-admin-fullname">
                  {t("admin.settings.admins.create.fullName")}
                </Label>
                <Input id="add-admin-fullname" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-admin-username">
                  {t("admin.settings.admins.create.username")}
                </Label>
                <Input id="add-admin-username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-admin-phone">{t("admin.settings.admins.create.phone")}</Label>
                <Input id="add-admin-phone" type="tel" />
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
