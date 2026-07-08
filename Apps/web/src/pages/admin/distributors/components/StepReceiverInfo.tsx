import { Loader2 } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { WilayaDTO, CommuneDTO } from "@my-app/contract";
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
import type { CreateOrderFormInput } from "./create-order.schema";

interface Props {
  register: UseFormRegister<CreateOrderFormInput>;
  errors: FieldErrors<CreateOrderFormInput>;
  wilayaId: string;
  onWilayaChange: (id: string) => void;
  communeId: string;
  onCommuneChange: (id: string) => void;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
  communes?: CommuneDTO[];
  communesLoading: boolean;
  communesError: boolean;
}

// Step 3 of the create-order wizard — real RHF wiring (Sprint 3). `wilayaId`/`communeId`
// are both host-owned (the host's useCommunes(wilayaId) call needs the current value) and
// mirrored into the form via the host's setValue on change.
export function StepReceiverInfo({
  register,
  errors,
  wilayaId,
  onWilayaChange,
  communeId,
  onCommuneChange,
  wilayas,
  wilayasLoading,
  wilayasError,
  communes,
  communesLoading,
  communesError,
}: Props) {
  const { t } = useTranslation();
  const communeDisabled = !wilayaId || communesLoading || communesError;

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="order-received-name">{t("admin.orders.create.receivedName")}</Label>
        <Input id="order-received-name" {...register("receivedName")} />
        {errors.receivedName && (
          <p className="text-sm text-destructive">{errors.receivedName.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="order-received-phone">{t("admin.orders.create.receivedPhone")}</Label>
        <Input id="order-received-phone" type="tel" {...register("receivedPhone")} />
        {errors.receivedPhone && (
          <p className="text-sm text-destructive">{errors.receivedPhone.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>{t("admin.orders.create.wilaya")}</Label>
        <Select
          value={wilayaId}
          onValueChange={onWilayaChange}
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
        {errors.wilayaId && <p className="text-sm text-destructive">{errors.wilayaId.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>{t("admin.orders.create.commune")}</Label>
        <Select value={communeId} onValueChange={onCommuneChange} disabled={communeDisabled}>
          <SelectTrigger>
            {communesLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <SelectValue
                placeholder={
                  !wilayaId
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
        {errors.communeId && <p className="text-sm text-destructive">{errors.communeId.message}</p>}
      </div>
    </div>
  );
}
