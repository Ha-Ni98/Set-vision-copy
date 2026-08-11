import { CardStat, CardFlag } from "@my-app/contract";
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

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  cardStat: CardStat | "";
  onCardStatChange: (value: CardStat | "") => void;
  flag: CardFlag | "";
  onFlagChange: (value: CardFlag | "") => void;
  subscriptionPlanId: string;
  onSubscriptionPlanIdChange: (value: string) => void;
  plans?: SubscriptionPlanDTO[];
}

export function MyCardsFilters({
  search,
  onSearchChange,
  cardStat,
  onCardStatChange,
  flag,
  onFlagChange,
  subscriptionPlanId,
  onSubscriptionPlanIdChange,
  plans,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <div className="relative flex-1 sm:min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("distributor.cards.filters.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <Select
        value={cardStat || ALL}
        onValueChange={(v) => onCardStatChange(v === ALL ? "" : (v as CardStat))}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder={t("distributor.cards.filters.statPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("distributor.cards.filters.statPlaceholder")}</SelectItem>
          {Object.values(CardStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.cardStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={flag || ALL}
        onValueChange={(v) => onFlagChange(v === ALL ? "" : (v as CardFlag))}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder={t("distributor.cards.filters.flagPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("distributor.cards.filters.flagAll")}</SelectItem>
          <SelectItem value={CardFlag.disabled}>
            {t("distributor.cards.filters.flagDisabled")}
          </SelectItem>
          <SelectItem value={CardFlag.revoked}>
            {t("distributor.cards.filters.flagRevoked")}
          </SelectItem>
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
    </div>
  );
}
