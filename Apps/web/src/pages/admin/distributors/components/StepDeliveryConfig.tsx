import { Loader2 } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { DeliveryType, type DeliveryCompanyDTO } from "@my-app/contract";
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
import type { CreateOrderFormInput } from "./create-order.schema";

interface Props {
  register: UseFormRegister<CreateOrderFormInput>;
  errors: FieldErrors<CreateOrderFormInput>;
  deliveryCompanyId: string;
  onDeliveryCompanyChange: (id: string) => void;
  deliveryType: string;
  onDeliveryTypeChange: (type: string) => void;
  deliveryCompanies?: DeliveryCompanyDTO[];
  deliveryCompaniesLoading: boolean;
  deliveryCompaniesError: boolean;
}

// Step 4 of the create-order wizard — real RHF wiring (Sprint 3). Both selects are
// host-owned/mirrored into the form via setValue, same pattern as StepReceiverInfo.
export function StepDeliveryConfig({
  register,
  errors,
  deliveryCompanyId,
  onDeliveryCompanyChange,
  deliveryType,
  onDeliveryTypeChange,
  deliveryCompanies,
  deliveryCompaniesLoading,
  deliveryCompaniesError,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label>{t("admin.orders.create.deliveryCompany")}</Label>
        <Select
          value={deliveryCompanyId}
          onValueChange={onDeliveryCompanyChange}
          disabled={deliveryCompaniesLoading || deliveryCompaniesError}
        >
          <SelectTrigger>
            {deliveryCompaniesLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <SelectValue placeholder={t("admin.orders.filters.deliveryCompanyPlaceholder")} />
            )}
          </SelectTrigger>
          <SelectContent>
            {(deliveryCompanies ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.deliveryCompanyId && (
          <p className="text-sm text-destructive">{errors.deliveryCompanyId.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>{t("admin.orders.create.deliveryType")}</Label>
        <Select value={deliveryType} onValueChange={onDeliveryTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(DeliveryType).map((dt) => (
              <SelectItem key={dt} value={dt}>
                {t(`enums.deliveryType.${dt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="order-price">{t("admin.orders.create.orderPrice")}</Label>
        <Input id="order-price" type="number" min={0.01} step={0.01} {...register("orderPrice")} />
        {errors.orderPrice && (
          <p className="text-sm text-destructive">{errors.orderPrice.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="deliver-price">{t("admin.orders.create.deliverPrice")}</Label>
        <Input id="deliver-price" type="number" min={0} step={0.01} {...register("deliverPrice")} />
        {errors.deliverPrice && (
          <p className="text-sm text-destructive">{errors.deliverPrice.message}</p>
        )}
      </div>
    </div>
  );
}
