import { Search, Loader2 } from "lucide-react";
import { OrderStat } from "@my-app/contract";
import type { WilayaDTO, DeliveryCompanyDTO } from "@my-app/contract";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";

// Radix Select reserves "" for "no selection" internally, so "all" is represented by this
// sentinel and translated back to "" for the caller (mirrors DistributorsFilters).
const ALL = "__all__";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  wilayaId: string;
  onWilayaChange: (id: string) => void;
  deliveryCompanyId: string;
  onDeliveryCompanyChange: (id: string) => void;
  state: string;
  onStateChange: (state: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
  deliveryCompanies?: DeliveryCompanyDTO[];
  deliveryCompaniesLoading: boolean;
  deliveryCompaniesError: boolean;
}

export function OrdersFilters({
  search,
  onSearchChange,
  wilayaId,
  onWilayaChange,
  deliveryCompanyId,
  onDeliveryCompanyChange,
  state,
  onStateChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  wilayas,
  wilayasLoading,
  wilayasError,
  deliveryCompanies,
  deliveryCompaniesLoading,
  deliveryCompaniesError,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.orders.search.placeholder")}
          className="pl-9"
        />
      </div>

      <Select
        value={wilayaId || ALL}
        onValueChange={(v) => onWilayaChange(v === ALL ? "" : v)}
        disabled={wilayasLoading || wilayasError}
      >
        <SelectTrigger className="w-48">
          {wilayasLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.orders.filters.wilayaPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.orders.filters.wilayaPlaceholder")}</SelectItem>
          {(wilayas ?? []).map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.frName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={deliveryCompanyId || ALL}
        onValueChange={(v) => onDeliveryCompanyChange(v === ALL ? "" : v)}
        disabled={deliveryCompaniesLoading || deliveryCompaniesError}
      >
        <SelectTrigger className="w-48">
          {deliveryCompaniesLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.orders.filters.deliveryCompanyPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("admin.orders.filters.deliveryCompanyPlaceholder")}
          </SelectItem>
          {(deliveryCompanies ?? []).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state || ALL} onValueChange={(v) => onStateChange(v === ALL ? "" : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t("admin.orders.filters.statePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.orders.filters.statePlaceholder")}</SelectItem>
          {Object.values(OrderStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.orderStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={t("admin.orders.filters.dateFrom")}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">{t("admin.orders.filters.dateTo")}</span>
        <Input
          type="date"
          aria-label={t("admin.orders.filters.dateTo")}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
