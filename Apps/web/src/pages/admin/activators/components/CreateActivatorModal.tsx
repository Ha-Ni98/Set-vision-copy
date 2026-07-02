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
import { GeneratedPasswordPanel } from "./GeneratedPasswordPanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on submit — RHF + Zod + useCreateActivator wire this in Sprint 5. */
  onSubmit: () => void;
  isPending?: boolean;
  /** Set once the create mutation succeeds — swaps the form for the one-time reveal. */
  generatedPassword?: string | null;
}

// Field-markup shell only — no RHF/Zod hookup yet (plan.md's Sprint 3 vs. Sprint 5 split).
export function CreateActivatorModal({
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
          <DialogTitle>{t("admin.activators.create.title")}</DialogTitle>
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
                <Label htmlFor="create-activator-fullname">
                  {t("admin.activators.create.fullName")}
                </Label>
                <Input id="create-activator-fullname" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-activator-username">
                  {t("admin.activators.create.username")}
                </Label>
                <Input id="create-activator-username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-activator-phone">{t("admin.activators.create.phone")}</Label>
                <Input id="create-activator-phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-activator-credits">
                  {t("admin.activators.create.initialCredits")}
                </Label>
                <Input
                  id="create-activator-credits"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={0}
                />
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
