import { useState } from "react";
import { Loader2 } from "lucide-react";
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

interface Props {
  wilayaId: string;
  onWilayaChange: (id: string) => void;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
  communes?: CommuneDTO[];
  communesLoading: boolean;
  communesError: boolean;
}

// Step 3 of the create-order wizard — RHF register()/Controller wiring + distributor
// prefill land in Sprint 3; this is the static field-markup shell only (mirrors
// CreateDistributorModal's Sprint-3-static-shell precedent). `wilayaId` is parent-owned
// (the page's useCommunes(wilayaId) call needs it); `communeId` has no downstream
// dependents so it's local, real UI state.
export function StepReceiverInfo({
  wilayaId,
  onWilayaChange,
  wilayas,
  wilayasLoading,
  wilayasError,
  communes,
  communesLoading,
  communesError,
}: Props) {
  const { t } = useTranslation();
  const [communeId, setCommuneId] = useState("");
  const communeDisabled = !wilayaId || communesLoading || communesError;

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="order-received-name">{t("admin.orders.create.receivedName")}</Label>
        <Input id="order-received-name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="order-received-phone">{t("admin.orders.create.receivedPhone")}</Label>
        <Input id="order-received-phone" type="tel" />
      </div>
      <div className="space-y-2">
        <Label>{t("admin.orders.create.wilaya")}</Label>
        <Select
          value={wilayaId}
          onValueChange={(v) => {
            onWilayaChange(v);
            setCommuneId("");
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
                {w.frName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("admin.orders.create.commune")}</Label>
        <Select value={communeId} onValueChange={setCommuneId} disabled={communeDisabled}>
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
      </div>
    </div>
  );
}
