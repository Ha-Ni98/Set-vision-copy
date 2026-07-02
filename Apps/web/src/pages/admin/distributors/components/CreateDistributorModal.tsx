import { useState } from "react";
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
import type { WilayaDTO, CommuneDTO } from "@my-app/contract";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on submit — RHF + Zod + useCreateDistributor wire this in Sprint 4. */
  onSubmit: () => void;
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

// Field-markup shell only — no RHF/Zod hookup yet (plan.md's Sprint 3 vs. Sprint 4 split).
// The wilaya→commune dependency (disabled/loading/error) is real, local UI behavior — not
// data wiring — so it's built here rather than deferred.
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
  const [communeId, setCommuneId] = useState("");
  const communeDisabled = !selectedWilayaId || communesLoading || communesError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.distributors.create.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="create-distributor-fullname">
              {t("admin.distributors.create.fullName")}
            </Label>
            <Input id="create-distributor-fullname" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-distributor-storename">
              {t("admin.distributors.create.storeName")}
            </Label>
            <Input id="create-distributor-storename" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-distributor-phone">{t("admin.distributors.create.phone")}</Label>
            <Input id="create-distributor-phone" type="tel" />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.distributors.create.wilaya")}</Label>
            <Select
              value={selectedWilayaId}
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
            <Label>{t("admin.distributors.create.commune")}</Label>
            <Select value={communeId} onValueChange={setCommuneId} disabled={communeDisabled}>
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
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {t("common.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
