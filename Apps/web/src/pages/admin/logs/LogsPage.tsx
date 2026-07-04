import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLogs } from "@/hooks/useLogs";
import { useAdmins } from "@/hooks/useAdmins";
import type { LogActionType } from "@my-app/contract";
import { LogsFilters } from "./components/LogsFilters";
import { LogsTable } from "./components/LogsTable";

const LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function LogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [actionType, setActionType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebouncedValue(search);

  const logsQuery = useLogs({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    userId: userId || undefined,
    actionType: (actionType as LogActionType) || undefined,
    dateFrom: toIsoDate(dateFrom),
    dateTo: toIsoDate(dateTo),
  });
  const usersQuery = useAdmins({ page: 1, limit: 100 });

  const hasFilters =
    search.length > 0 ||
    userId.length > 0 ||
    actionType.length > 0 ||
    dateFrom.length > 0 ||
    dateTo.length > 0;
  const clearFilters = () => {
    setSearch("");
    setUserId("");
    setActionType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.logs")} subtitle={t("admin.logs.subtitle")} />

      <LogsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        userId={userId}
        onUserChange={(id) => {
          setUserId(id);
          setPage(1);
        }}
        actionType={actionType}
        onActionTypeChange={(v) => {
          setActionType(v);
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
        users={usersQuery.data?.items}
        usersLoading={usersQuery.isLoading}
        usersError={usersQuery.isError}
      />

      <LogsTable
        data={logsQuery.data?.items}
        isLoading={logsQuery.isLoading}
        isError={logsQuery.isError}
        onRetry={logsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />

      {logsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={logsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
