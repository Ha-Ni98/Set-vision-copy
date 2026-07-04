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
import type { ActivatorDetailDTO } from "@my-app/contract";
import { updateActivatorSchema, type UpdateActivatorFormValues } from "./update-activator.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activator: ActivatorDetailDTO | undefined;
  onSubmit: (values: UpdateActivatorFormValues) => void;
  isPending?: boolean;
}

export function EditActivatorModal({ open, onOpenChange, activator, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateActivatorFormValues>({
    resolver: zodResolver(updateActivatorSchema(t)),
    defaultValues: {
      fullName: activator?.fullName,
      username: activator?.username,
      phone: activator?.phone,
    },
  });

  useEffect(() => {
    if (open && activator) {
      reset({ fullName: activator.fullName, username: activator.username, phone: activator.phone });
    }
  }, [open, activator, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.actions.edit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-activator-fullname">{t("admin.activators.create.fullName")}</Label>
            <Input id="edit-activator-fullname" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-activator-username">{t("admin.activators.create.username")}</Label>
            <Input id="edit-activator-username" {...register("username")} />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-activator-phone">{t("admin.activators.create.phone")}</Label>
            <Input id="edit-activator-phone" type="tel" {...register("phone")} />
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
