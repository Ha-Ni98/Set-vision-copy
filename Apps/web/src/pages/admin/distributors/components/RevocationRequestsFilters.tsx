import { Search } from "lucide-react";
import { RevocationRequestStat } from "@my-app/contract";
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
  state: string;
  onStateChange: (state: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
}

export function RevocationRequestsFilters({
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.revocationRequests.search.placeholder")}
          className="pl-9"
        />
      </div>

      <Select value={state || ALL} onValueChange={(v) => onStateChange(v === ALL ? "" : v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t("admin.revocationRequests.filters.statePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("admin.revocationRequests.filters.statePlaceholder")}
          </SelectItem>
          {Object.values(RevocationRequestStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.revocationRequestStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={t("admin.revocationRequests.filters.dateFrom")}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">
          {t("admin.revocationRequests.filters.dateTo")}
        </span>
        <Input
          type="date"
          aria-label={t("admin.revocationRequests.filters.dateTo")}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
