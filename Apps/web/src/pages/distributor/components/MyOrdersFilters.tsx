import { OrderStat } from "@my-app/contract";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";

const ALL = "__all__";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  state: OrderStat | "";
  onStateChange: (value: OrderStat | "") => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
}

export function MyOrdersFilters({
  search,
  onSearchChange,
  state,
  onStateChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="relative flex-1 sm:min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("distributor.orders.filters.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <Select
        value={state || ALL}
        onValueChange={(v) => onStateChange(v === ALL ? "" : (v as OrderStat))}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder={t("distributor.orders.filters.statePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("distributor.orders.filters.statePlaceholder")}</SelectItem>
          {Object.values(OrderStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.orderStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Input
          type="date"
          aria-label={t("distributor.orders.filters.dateFrom")}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-0 min-w-0 flex-1 sm:w-40 sm:flex-none"
        />
        <span className="shrink-0 text-sm text-muted-foreground">
          {t("distributor.orders.filters.dateTo")}
        </span>
        <Input
          type="date"
          aria-label={t("distributor.orders.filters.dateTo")}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-0 min-w-0 flex-1 sm:w-40 sm:flex-none"
        />
      </div>
    </div>
  );
}
