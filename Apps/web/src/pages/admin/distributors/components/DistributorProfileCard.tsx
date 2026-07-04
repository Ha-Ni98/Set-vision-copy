import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Power } from "lucide-react";
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
import { EnabledBadge } from "@/components/shared/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";
import type { DistributorDetailDTO, WilayaDTO, CommuneDTO } from "@my-app/contract";
import {
  updateDistributorSchema,
  type UpdateDistributorFormValues,
} from "./update-distributor.schema";

interface Props {
  distributor: DistributorDetailDTO;
  onToggle: () => void;
  onSave: (values: UpdateDistributorFormValues) => void;
  isPending?: boolean;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
  communes?: CommuneDTO[];
  communesLoading: boolean;
  communesError: boolean;
  editWilayaId: string;
  onEditWilayaChange: (id: string) => void;
}

// Assumes valid data — the page owns the shared profile+stats loading/error/not-found gate
// (mirrors ProfileCard's note). Inline edit per the spec (not a modal): a local isEditing
// toggle swaps the read-only display for the RHF-wired field markup.
export function DistributorProfileCard({
  distributor,
  onToggle,
  onSave,
  isPending,
  wilayas,
  wilayasLoading,
  wilayasError,
  communes,
  communesLoading,
  communesError,
  editWilayaId,
  onEditWilayaChange,
}: Props) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const communeDisabled = !editWilayaId || communesLoading || communesError;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UpdateDistributorFormValues>({
    resolver: zodResolver(updateDistributorSchema(t)),
    defaultValues: {
      fullName: distributor.fullName,
      storeName: distributor.storeName,
      phone: distributor.phone,
      wilayaId: distributor.wilayaId,
      communeId: distributor.communeId,
    },
  });

  useEffect(() => {
    if (isEditing) {
      reset({
        fullName: distributor.fullName,
        storeName: distributor.storeName,
        phone: distributor.phone,
        wilayaId: distributor.wilayaId,
        communeId: distributor.communeId,
      });
      onEditWilayaChange(distributor.wilayaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  if (!isEditing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{distributor.fullName}</h2>
              <EnabledBadge isEnabled={distributor.isEnabled} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">
                  {t("admin.distributors.create.storeName")}
                </dt>
                <dd className="font-medium text-foreground">{distributor.storeName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("admin.distributors.create.phone")}</dt>
                <dd className="font-medium text-foreground">{distributor.phone}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("admin.distributors.create.wilaya")}</dt>
                <dd className="font-medium text-foreground">{distributor.wilayaName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("admin.distributors.create.commune")}</dt>
                <dd className="font-medium text-foreground">{distributor.communeName}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> {t("common.actions.edit")}
            </Button>
            <Button variant="outline" size="sm" onClick={onToggle}>
              <Power className="mr-2 h-3.5 w-3.5" />
              {distributor.isEnabled ? t("common.actions.disable") : t("common.actions.enable")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const submit = handleSubmit((values) => {
    onSave(values);
    setIsEditing(false);
  });

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-distributor-fullname">
            {t("admin.distributors.create.fullName")}
          </Label>
          <Input id="edit-distributor-fullname" {...register("fullName")} />
          {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-distributor-storename">
            {t("admin.distributors.create.storeName")}
          </Label>
          <Input id="edit-distributor-storename" {...register("storeName")} />
          {errors.storeName && (
            <p className="text-sm text-destructive">{errors.storeName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-distributor-phone">{t("admin.distributors.create.phone")}</Label>
          <Input id="edit-distributor-phone" type="tel" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
        <div />
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
                  onEditWilayaChange(v);
                  setValue("communeId", "");
                }}
                disabled={wilayasLoading || wilayasError}
              >
                <SelectTrigger>
                  {wilayasLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <SelectValue placeholder={t("admin.distributors.form.wilayaPlaceholder")} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {(wilayas ?? []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.frName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("admin.distributors.create.commune")}</Label>
          <Controller
            control={control}
            name="communeId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={communeDisabled}>
                <SelectTrigger>
                  {communesLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : (
                    <SelectValue
                      placeholder={
                        !editWilayaId
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
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {t("common.actions.save")}
        </Button>
      </div>
    </form>
  );
}
