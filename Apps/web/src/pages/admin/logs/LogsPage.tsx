import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { LogsFilters } from "./components/LogsFilters";
import { LogsTable } from "./components/LogsTable";

// Static composition — no data hooks yet (wired in Sprint 3, plan.md §D5).
export default function LogsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [actionType, setActionType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters =
    search.length > 0 ||
    userId.length > 0 ||
    actionType.length > 0 ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.logs")} subtitle={t("admin.logs.subtitle")} />

      <LogsFilters
        search={search}
        onSearchChange={setSearch}
        userId={userId}
        onUserChange={setUserId}
        actionType={actionType}
        onActionTypeChange={setActionType}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        usersLoading
        usersError={false}
      />

      <LogsTable
        isLoading
        isError={false}
        onRetry={() => {}}
        hasFilters={hasFilters}
        onClearFilters={() => {
          setSearch("");
          setUserId("");
          setActionType("");
          setDateFrom("");
          setDateTo("");
        }}
      />
    </div>
  );
}
