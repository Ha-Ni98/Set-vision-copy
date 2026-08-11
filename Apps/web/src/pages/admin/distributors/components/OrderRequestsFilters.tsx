import { Search, Loader2 } from "lucide-react";
import { OrderRequestStat } from "@my-app/contract";
import type { SubscriptionPlanDTO } from "@my-app/contract";
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
  subscriptionPlanId: string;
  onSubscriptionPlanChange: (id: string) => void;
  state: string;
  onStateChange: (state: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
  plansError: boolean;
}

export function OrderRequestsFilters({
  search,
  onSearchChange,
  subscriptionPlanId,
  onSubscriptionPlanChange,
  state,
  onStateChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  plans,
  plansLoading,
  plansError,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.orderRequests.search.placeholder")}
          className="pl-9"
        />
      </div>

      <Select
        value={subscriptionPlanId || ALL}
        onValueChange={(v) => onSubscriptionPlanChange(v === ALL ? "" : v)}
        disabled={plansLoading || plansError}
      >
        <SelectTrigger className="w-48">
          {plansLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.orderRequests.filters.planPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.orderRequests.filters.planPlaceholder")}</SelectItem>
          {(plans ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={state || ALL} onValueChange={(v) => onStateChange(v === ALL ? "" : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t("admin.orderRequests.filters.statePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.orderRequests.filters.statePlaceholder")}</SelectItem>
          {Object.values(OrderRequestStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.orderRequestStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={t("admin.orderRequests.filters.dateFrom")}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">
          {t("admin.orderRequests.filters.dateTo")}
        </span>
        <Input
          type="date"
          aria-label={t("admin.orderRequests.filters.dateTo")}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
