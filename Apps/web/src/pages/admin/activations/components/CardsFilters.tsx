import { Search, Loader2, X } from "lucide-react";
import { CardStat, CardFlag } from "@my-app/contract";
import type { SubscriptionPlanDTO, DistributorDTO } from "@my-app/contract";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  state: string;
  onStateChange: (state: string) => void;
  subscriptionPlanId: string;
  onPlanChange: (id: string) => void;
  distributorId: string;
  onDistributorChange: (id: string) => void;
  flag: string;
  onFlagChange: (flag: string) => void;
  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
  plansError: boolean;
  distributors?: DistributorDTO[];
  distributorsLoading: boolean;
  distributorsError: boolean;
  /** Pre-filters seeded from ?set=/?lot= — rendered as clearable chips, not selects, since
   * there's no hook to list every set/lot number (plan §D3.6). */
  setNumber?: string;
  onClearSetFilter: () => void;
  lotNumber?: string;
  onClearLotFilter: () => void;
}

export function CardsFilters({
  search,
  onSearchChange,
  state,
  onStateChange,
  subscriptionPlanId,
  onPlanChange,
  distributorId,
  onDistributorChange,
  flag,
  onFlagChange,
  plans,
  plansLoading,
  plansError,
  distributors,
  distributorsLoading,
  distributorsError,
  setNumber,
  onClearSetFilter,
  lotNumber,
  onClearLotFilter,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("admin.cards.search.placeholder")}
            className="pl-9"
          />
        </div>

        <Select value={state || ALL} onValueChange={(v) => onStateChange(v === ALL ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("admin.cards.filters.statePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("admin.cards.filters.statePlaceholder")}</SelectItem>
            {Object.values(CardStat).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`enums.cardStat.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={subscriptionPlanId || ALL}
          onValueChange={(v) => onPlanChange(v === ALL ? "" : v)}
          disabled={plansLoading || plansError}
        >
          <SelectTrigger className="w-48">
            {plansLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <SelectValue placeholder={t("admin.cards.filters.planPlaceholder")} />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("admin.cards.filters.planPlaceholder")}</SelectItem>
            {(plans ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={distributorId || ALL}
          onValueChange={(v) => onDistributorChange(v === ALL ? "" : v)}
          disabled={distributorsLoading || distributorsError}
        >
          <SelectTrigger className="w-48">
            {distributorsLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <SelectValue placeholder={t("admin.cards.filters.distributorPlaceholder")} />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("admin.cards.filters.distributorPlaceholder")}</SelectItem>
            {(distributors ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={flag || ALL} onValueChange={(v) => onFlagChange(v === ALL ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("admin.cards.filters.flagPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("admin.cards.filters.flagPlaceholder")}</SelectItem>
            {Object.values(CardFlag).map((f) => (
              <SelectItem key={f} value={f}>
                {t(`enums.cardFlag.${f}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(setNumber || lotNumber) && (
        <div className="flex flex-wrap items-center gap-2">
          {setNumber && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearSetFilter}
              className="h-7 gap-1 text-xs"
            >
              {t("admin.cards.table.set")}: {setNumber} <X className="h-3 w-3" />
            </Button>
          )}
          {lotNumber && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearLotFilter}
              className="h-7 gap-1 text-xs"
            >
              {t("admin.cards.table.lot")}: {lotNumber} <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
