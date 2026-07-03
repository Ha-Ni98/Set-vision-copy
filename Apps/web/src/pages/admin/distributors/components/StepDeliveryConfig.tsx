import { useState } from "react";
import { Loader2 } from "lucide-react";
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

interface Props {
  deliveryCompanies?: DeliveryCompanyDTO[];
  deliveryCompaniesLoading: boolean;
  deliveryCompaniesError: boolean;
}

// Step 4 of the create-order wizard — RHF register()/Controller wiring lands in Sprint 3;
// this is the static field-markup shell only. Neither select here has a downstream
// dependent, so both are local, real UI state (mirrors StepReceiverInfo's commune field).
export function StepDeliveryConfig({
  deliveryCompanies,
  deliveryCompaniesLoading,
  deliveryCompaniesError,
}: Props) {
  const { t } = useTranslation();
  const [deliveryCompanyId, setDeliveryCompanyId] = useState("");
  const [deliveryType, setDeliveryType] = useState<string>(DeliveryType.HOME);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label>{t("admin.orders.create.deliveryCompany")}</Label>
        <Select
          value={deliveryCompanyId}
          onValueChange={setDeliveryCompanyId}
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
      </div>
      <div className="space-y-2">
        <Label>{t("admin.orders.create.deliveryType")}</Label>
        <Select value={deliveryType} onValueChange={setDeliveryType}>
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
        <Input id="order-price" type="number" min={0.01} step={0.01} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="deliver-price">{t("admin.orders.create.deliverPrice")}</Label>
        <Input id="deliver-price" type="number" min={0} step={0.01} defaultValue={0} />
      </div>
    </div>
  );
}
