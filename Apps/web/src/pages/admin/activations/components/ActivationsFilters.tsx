import { Search, Loader2 } from "lucide-react";
import { ActivationStat } from "@my-app/contract";
import type {
  SubscriptionPlanDTO,
  ActivatorDTO,
  DistributorDTO,
  WilayaDTO,
  CommuneDTO,
} from "@my-app/contract";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { formatWilayaLabel } from "@/lib/utils";

const ALL = "__all__";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  subscriptionPlanId: string;
  onPlanChange: (id: string) => void;
  activatorId: string;
  onActivatorChange: (id: string) => void;
  distributorId: string;
  onDistributorChange: (id: string) => void;
  wilayaId: string;
  onWilayaChange: (id: string) => void;
  communeId: string;
  onCommuneChange: (id: string) => void;
  state: string;
  onStateChange: (state: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
  plansError: boolean;
  activators?: ActivatorDTO[];
  activatorsLoading: boolean;
  activatorsError: boolean;
  distributors?: DistributorDTO[];
  distributorsLoading: boolean;
  distributorsError: boolean;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
  communes?: CommuneDTO[];
  communesLoading: boolean;
  communesError: boolean;
}

export function ActivationsFilters({
  search,
  onSearchChange,
  subscriptionPlanId,
  onPlanChange,
  activatorId,
  onActivatorChange,
  distributorId,
  onDistributorChange,
  wilayaId,
  onWilayaChange,
  communeId,
  onCommuneChange,
  state,
  onStateChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  plans,
  plansLoading,
  plansError,
  activators,
  activatorsLoading,
  activatorsError,
  distributors,
  distributorsLoading,
  distributorsError,
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.activations.search.placeholder")}
          className="pl-9"
        />
      </div>

      <Select
        value={subscriptionPlanId || ALL}
        onValueChange={(v) => onPlanChange(v === ALL ? "" : v)}
        disabled={plansLoading || plansError}
      >
        <SelectTrigger className="w-40">
          {plansLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.activations.filters.planPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.activations.filters.planPlaceholder")}</SelectItem>
          {(plans ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activatorId || ALL}
        onValueChange={(v) => onActivatorChange(v === ALL ? "" : v)}
        disabled={activatorsLoading || activatorsError}
      >
        <SelectTrigger className="w-44">
          {activatorsLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.activations.filters.activatorPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.activations.filters.activatorPlaceholder")}</SelectItem>
          {(activators ?? []).map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={distributorId || ALL}
        onValueChange={(v) => onDistributorChange(v === ALL ? "" : v)}
        disabled={distributorsLoading || distributorsError}
      >
        <SelectTrigger className="w-44">
          {distributorsLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.activations.filters.distributorPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("admin.activations.filters.distributorPlaceholder")}
          </SelectItem>
          {(distributors ?? []).map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={wilayaId || ALL}
        onValueChange={(v) => {
          onWilayaChange(v === ALL ? "" : v);
          onCommuneChange("");
        }}
        disabled={wilayasLoading || wilayasError}
      >
        <SelectTrigger className="w-40">
          {wilayasLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.activations.filters.wilayaPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.activations.filters.wilayaPlaceholder")}</SelectItem>
          {(wilayas ?? []).map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {formatWilayaLabel(w)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={communeId || ALL}
        onValueChange={(v) => onCommuneChange(v === ALL ? "" : v)}
        disabled={communeDisabled}
      >
        <SelectTrigger className="w-40">
          {communesLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue
              placeholder={
                !wilayaId
                  ? t("admin.distributors.communeNeedsWilaya")
                  : communesError
                    ? t("admin.distributors.selectLoadError")
                    : t("admin.distributors.filters.communePlaceholder")
              }
            />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.distributors.filters.communePlaceholder")}</SelectItem>
          {(communes ?? []).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.frName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state || ALL} onValueChange={(v) => onStateChange(v === ALL ? "" : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t("admin.activations.filters.statePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.activations.filters.statePlaceholder")}</SelectItem>
          {Object.values(ActivationStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.activationStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={t("admin.activations.filters.dateFrom")}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">
          {t("admin.activations.filters.dateTo")}
        </span>
        <Input
          type="date"
          aria-label={t("admin.activations.filters.dateTo")}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
