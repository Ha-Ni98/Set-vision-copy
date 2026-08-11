import { ActivationStat, CardStat } from "@my-app/contract";
import type { SubscriptionPlanDTO } from "@my-app/contract";
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

export type SortOption = "NEWEST" | "OLDEST" | "COMPLETED";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  state: ActivationStat | "";
  onStateChange: (value: ActivationStat | "") => void;
  cardStat: CardStat | "";
  onCardStatChange: (value: CardStat | "") => void;
  subscriptionPlanId: string;
  onSubscriptionPlanIdChange: (value: string) => void;
  plans?: SubscriptionPlanDTO[];
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function MyActivationsFilters({
  search,
  onSearchChange,
  state,
  onStateChange,
  cardStat,
  onCardStatChange,
  subscriptionPlanId,
  onSubscriptionPlanIdChange,
  plans,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sort,
  onSortChange,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="relative flex-1 sm:min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("distributor.activations.filters.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <Select
        value={state || ALL}
        onValueChange={(v) => onStateChange(v === ALL ? "" : (v as ActivationStat))}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder={t("distributor.activations.filters.statePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("distributor.activations.filters.statePlaceholder")}
          </SelectItem>
          {Object.values(ActivationStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.activationStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={cardStat || ALL}
        onValueChange={(v) => onCardStatChange(v === ALL ? "" : (v as CardStat))}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder={t("distributor.activations.filters.cardStatPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("distributor.activations.filters.cardStatPlaceholder")}
          </SelectItem>
          {Object.values(CardStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.cardStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={subscriptionPlanId || ALL}
        onValueChange={(v) => onSubscriptionPlanIdChange(v === ALL ? "" : v)}
      >
        <SelectTrigger className="sm:w-52">
          <SelectValue placeholder={t("distributor.cards.filters.planPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("distributor.cards.filters.planPlaceholder")}</SelectItem>
          {(plans ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NEWEST">{t("distributor.activations.filters.sortNewest")}</SelectItem>
          <SelectItem value="OLDEST">{t("distributor.activations.filters.sortOldest")}</SelectItem>
          <SelectItem value="COMPLETED">
            {t("distributor.activations.filters.sortCompleted")}
          </SelectItem>
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
