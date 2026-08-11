import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useNotifications } from "@/hooks/useNotifications";
import type {
  NotificationStat,
  NotificationChannel,
  NotificationType,
  UserRole,
} from "@my-app/contract";
import { NotificationsFilters } from "./components/NotificationsFilters";
import { NotificationsTable } from "./components/NotificationsTable";

const LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stat, setStat] = useState("");
  const [channel, setChannel] = useState("");
  const [type, setType] = useState("");
  const [recipientRole, setRecipientRole] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebouncedValue(search);

  const notificationsQuery = useNotifications({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    stat: (stat as NotificationStat) || undefined,
    channel: (channel as NotificationChannel) || undefined,
    type: (type as NotificationType) || undefined,
    recipientRole: (recipientRole as UserRole) || undefined,
    dateFrom: toIsoDate(dateFrom),
    dateTo: toIsoDate(dateTo),
  });

  const hasFilters =
    search.length > 0 ||
    stat.length > 0 ||
    channel.length > 0 ||
    type.length > 0 ||
    recipientRole.length > 0 ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  const clearFilters = () => {
    setSearch("");
    setStat("");
    setChannel("");
    setType("");
    setRecipientRole("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.shell.nav.notifications")}
        subtitle={t("admin.notifications.subtitle")}
      />

      <NotificationsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        stat={stat}
        onStatChange={(v) => {
          setStat(v);
          setPage(1);
        }}
        channel={channel}
        onChannelChange={(v) => {
          setChannel(v);
          setPage(1);
        }}
        type={type}
        onTypeChange={(v) => {
          setType(v);
          setPage(1);
        }}
        recipientRole={recipientRole}
        onRecipientRoleChange={(v) => {
          setRecipientRole(v);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(v) => {
          setDateFrom(v);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(v) => {
          setDateTo(v);
          setPage(1);
        }}
        hasFilters={hasFilters}
        onClear={clearFilters}
      />

      <NotificationsTable
        data={notificationsQuery.data?.items}
        isLoading={notificationsQuery.isLoading}
        isError={notificationsQuery.isError}
        onRetry={notificationsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />

      {notificationsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={notificationsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
