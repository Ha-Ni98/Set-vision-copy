import { Search } from "lucide-react";
import {
  NotificationStat,
  NotificationChannel,
  NotificationType,
  UserRole,
} from "@my-app/contract";
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
  stat: string;
  onStatChange: (value: string) => void;
  channel: string;
  onChannelChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  recipientRole: string;
  onRecipientRoleChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  hasFilters: boolean;
  onClear: () => void;
}

export function NotificationsFilters({
  search,
  onSearchChange,
  stat,
  onStatChange,
  channel,
  onChannelChange,
  type,
  onTypeChange,
  recipientRole,
  onRecipientRoleChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  hasFilters,
  onClear,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.notifications.search.placeholder")}
          className="pl-9"
        />
      </div>

      <Select value={stat || ALL} onValueChange={(v) => onStatChange(v === ALL ? "" : v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t("admin.notifications.filters.statPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.notifications.filters.statPlaceholder")}</SelectItem>
          {Object.values(NotificationStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.notificationStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={channel || ALL} onValueChange={(v) => onChannelChange(v === ALL ? "" : v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t("admin.notifications.filters.channelPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.notifications.filters.channelPlaceholder")}</SelectItem>
          {Object.values(NotificationChannel).map((c) => (
            <SelectItem key={c} value={c}>
              {t(`enums.notificationChannel.${c}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={type || ALL} onValueChange={(v) => onTypeChange(v === ALL ? "" : v)}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={t("admin.notifications.filters.typePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.notifications.filters.typePlaceholder")}</SelectItem>
          {Object.values(NotificationType).map((v) => (
            <SelectItem key={v} value={v}>
              {t(`enums.notificationType.${v}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={recipientRole || ALL}
        onValueChange={(v) => onRecipientRoleChange(v === ALL ? "" : v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t("admin.notifications.filters.rolePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.notifications.filters.rolePlaceholder")}</SelectItem>
          {Object.values(UserRole).map((r) => (
            <SelectItem key={r} value={r}>
              {t(`common.roles.${r}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={t("admin.notifications.filters.dateFrom")}
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-40"
        />
        <span className="text-sm text-muted-foreground">
          {t("admin.notifications.filters.dateTo")}
        </span>
        <Input
          type="date"
          aria-label={t("admin.notifications.filters.dateTo")}
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-40"
        />
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear}>
          {t("common.actions.clear")}
        </Button>
      )}
    </div>
  );
}
