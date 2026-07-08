import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { formatWilayaLabel } from "@/lib/utils";
import type { WilayaDTO, CommuneDTO } from "@my-app/contract";
import {
  createDistributorSchema,
  type CreateDistributorFormValues,
} from "./create-distributor.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateDistributorFormValues) => void;
  isPending?: boolean;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
  communes?: CommuneDTO[];
  communesLoading: boolean;
  communesError: boolean;
  selectedWilayaId: string;
  onWilayaChange: (id: string) => void;
}

export function CreateDistributorModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  wilayas,
  wilayasLoading,
  wilayasError,
  communes,
  communesLoading,
  communesError,
  selectedWilayaId,
  onWilayaChange,
}: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateDistributorFormValues>({
    resolver: zodResolver(createDistributorSchema(t)),
    defaultValues: { fullName: "", storeName: "", phone: "", wilayaId: "", communeId: "" },
  });
  const communeDisabled = !selectedWilayaId || communesLoading || communesError;

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.distributors.create.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="create-distributor-fullname">
              {t("admin.distributors.create.fullName")}
            </Label>
            <Input id="create-distributor-fullname" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-distributor-storename">
              {t("admin.distributors.create.storeName")}
            </Label>
            <Input id="create-distributor-storename" {...register("storeName")} />
            {errors.storeName && (
              <p className="text-sm text-destructive">{errors.storeName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-distributor-phone">{t("admin.distributors.create.phone")}</Label>
            <Input id="create-distributor-phone" type="tel" {...register("phone")} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("admin.distributors.create.wilaya")}</Label>
            <Controller
              control={control}
              name="wilayaId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    onWilayaChange(v);
                    setValue("communeId", "");
                  }}
                  disabled={wilayasLoading || wilayasError}
                >
                  <SelectTrigger>
                    {wilayasLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <SelectValue
                        placeholder={
                          wilayasError
                            ? t("admin.distributors.selectLoadError")
                            : t("admin.distributors.form.wilayaPlaceholder")
                        }
                      />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {(wilayas ?? []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {formatWilayaLabel(w)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.wilayaId && (
              <p className="text-sm text-destructive">{errors.wilayaId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("admin.distributors.create.commune")}</Label>
            <Controller
              control={control}
              name="communeId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={communeDisabled}
                >
                  <SelectTrigger>
                    {communesLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <SelectValue
                        placeholder={
                          !selectedWilayaId
                            ? t("admin.distributors.communeNeedsWilaya")
                            : communesError
                              ? t("admin.distributors.selectLoadError")
                              : t("admin.distributors.form.communePlaceholder")
                        }
                      />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {(communes ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.frName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.communeId && (
              <p className="text-sm text-destructive">{errors.communeId.message}</p>
            )}
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
      </DialogContent>
    </Dialog>
  );
}
