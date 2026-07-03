import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useTranslation } from "@/hooks/useTranslation";
import { GeneratedPasswordPanel } from "../../activators/components/GeneratedPasswordPanel";
import { createAdminSchema, type CreateAdminFormValues } from "./create-admin.schema";

const DEFAULT_VALUES: CreateAdminFormValues = { fullName: "", username: "", phone: "" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateAdminFormValues) => void;
  isPending?: boolean;
  /** Set once the create mutation succeeds — swaps the form for the one-time reveal. */
  generatedPassword?: string | null;
}

// Mirrors Part-1's CreateActivatorModal exactly (same one-time-password swap pattern).
export function AddAdminModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  generatedPassword,
}: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAdminFormValues>({
    resolver: zodResolver(createAdminSchema(t)),
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
          <DialogTitle>{t("admin.settings.admins.create.title")}</DialogTitle>
        </DialogHeader>

        {generatedPassword ? (
          <>
            <GeneratedPasswordPanel
              password={generatedPassword}
              titleKey="admin.settings.admins.create.successTitle"
              bodyKey="admin.settings.admins.create.successBody"
            />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{t("common.actions.confirm")}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-admin-fullname">
                {t("admin.settings.admins.create.fullName")}
              </Label>
              <Input id="add-admin-fullname" {...register("fullName")} />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-admin-username">
                {t("admin.settings.admins.create.username")}
              </Label>
              <Input id="add-admin-username" {...register("username")} />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-admin-phone">{t("admin.settings.admins.create.phone")}</Label>
              <Input id="add-admin-phone" type="tel" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
