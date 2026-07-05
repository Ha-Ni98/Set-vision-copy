import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  createDeliveryCompanySchema,
  type CreateDeliveryCompanyFormValues,
} from "./create-delivery-company.schema";

const DEFAULT_VALUES: CreateDeliveryCompanyFormValues = { name: "", registeredName: "" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing — prefills the fields; absent for Add. */
  company?: DeliveryCompanyDTO | null;
  onSubmit: (values: CreateDeliveryCompanyFormValues) => void;
  isPending?: boolean;
}

// Shared by both Add and Edit (same two fields either way). Validates against the stricter
// create schema (both fields required) since the UI always shows/submits both regardless of
// mode — a valid CreateDeliveryCompanyFormValues is also a valid UpdateDeliveryCompanyCommand
// (whose fields are a strict optional superset).
export function CompanyModal({ open, onOpenChange, company, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const isEdit = !!company;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDeliveryCompanyFormValues>({
    resolver: zodResolver(createDeliveryCompanySchema(t)),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(
        company ? { name: company.name, registeredName: company.registeredName } : DEFAULT_VALUES,
      );
    }
  }, [open, company, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

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
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">{t("admin.settings.companies.create.name")}</Label>
            <Input id="company-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-registered-name">
              {t("admin.settings.companies.create.registeredName")}
            </Label>
            <Input id="company-registered-name" {...register("registeredName")} />
            {errors.registeredName && (
              <p className="text-sm text-destructive">{errors.registeredName.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t(isEdit ? "common.actions.save" : "common.actions.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
