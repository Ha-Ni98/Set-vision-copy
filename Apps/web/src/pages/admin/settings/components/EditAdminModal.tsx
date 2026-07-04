import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { updateAdminSchema, type UpdateAdminFormValues } from "./update-admin.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: AdminDTO | null;
  onSubmit: (values: UpdateAdminFormValues) => void;
  isPending?: boolean;
}

export function EditAdminModal({ open, onOpenChange, admin, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateAdminFormValues>({
    resolver: zodResolver(updateAdminSchema(t)),
    defaultValues: { fullName: admin?.fullName, username: admin?.username, phone: admin?.phone },
  });

  useEffect(() => {
    if (open && admin) {
      reset({ fullName: admin.fullName, username: admin.username, phone: admin.phone });
    }
  }, [open, admin, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.settings.admins.edit.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-admin-fullname">
              {t("admin.settings.admins.create.fullName")}
            </Label>
            <Input id="edit-admin-fullname" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-admin-username">
              {t("admin.settings.admins.create.username")}
            </Label>
            <Input id="edit-admin-username" {...register("username")} />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-admin-phone">{t("admin.settings.admins.create.phone")}</Label>
            <Input id="edit-admin-phone" type="tel" {...register("phone")} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("common.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
