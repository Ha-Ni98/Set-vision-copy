import { Search, Loader2 } from "lucide-react";
import { LogActionType } from "@my-app/contract";
import type { AdminDTO } from "@my-app/contract";
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
  userId: string;
  onUserChange: (id: string) => void;
  actionType: string;
  onActionTypeChange: (type: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  users?: AdminDTO[];
  usersLoading: boolean;
  usersError: boolean;
}

export function LogsFilters({
  search,
  onSearchChange,
  userId,
  onUserChange,
  actionType,
  onActionTypeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  users,
  usersLoading,
  usersError,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.logs.search.placeholder")}
          className="pl-9"
        />
      </div>

      <Select
        value={userId || ALL}
        onValueChange={(v) => onUserChange(v === ALL ? "" : v)}
        disabled={usersLoading || usersError}
      >
        <SelectTrigger className="w-44">
          {usersLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <SelectValue placeholder={t("admin.logs.filters.userPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.logs.filters.userPlaceholder")}</SelectItem>
          {(users ?? []).map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={actionType || ALL}
        onValueChange={(v) => onActionTypeChange(v === ALL ? "" : v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder={t("admin.logs.filters.actionTypePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.logs.filters.actionTypePlaceholder")}</SelectItem>
          {Object.values(LogActionType).map((a) => (
            <SelectItem key={a} value={a}>
              {t(`enums.logActionType.${a}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={t("admin.logs.filters.dateFrom")}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">{t("admin.logs.filters.dateTo")}</span>
        <Input
          type="date"
          aria-label={t("admin.logs.filters.dateTo")}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
}
