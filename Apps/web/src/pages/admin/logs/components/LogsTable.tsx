import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { LogDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { LogActionBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

interface Props {
  data?: LogDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

// Immutable, read-only audit trail — no actions column, no writes (plan §D5).
export function LogsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const columns = useMemo<ColumnDef<LogDTO>[]>(
    () => [
      {
        id: "action",
        header: t("admin.logs.table.action"),
        cell: ({ row }) => <LogActionBadge actionType={row.original.actionType} />,
      },
      { accessorKey: "actionDescription", header: t("admin.logs.table.description") },
      { accessorKey: "userName", header: t("admin.logs.table.user") },
      {
        id: "createdAt",
        header: t("admin.logs.table.date"),
        cell: ({ row }) => (
          <span title={formatDateTime(row.original.createdAt, language)}>
            {formatRelativeTime(row.original.createdAt, language)}
          </span>
        ),
      },
    ],
    [t, language],
  );

  if (isLoading) return <TableSkeleton rows={5} columns={4} />;
  if (isError) {
    return (
      <NotFoundState
        title={t("admin.dashboard.sectionError")}
        body={t("admin.dashboard.sectionErrorBody")}
        action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
      />
    );
  }

  const rows = data ?? [];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(row) => row.id}
      renderMobileRow={(row) => (
        <div className="flex items-center justify-between gap-3 p-4 text-sm">
          <div>
            <div className="font-semibold">{row.actionDescription}</div>
            <div className="text-muted-foreground">
              {row.userName} ·{" "}
              <span title={formatDateTime(row.createdAt, language)}>
                {formatRelativeTime(row.createdAt, language)}
              </span>
            </div>
          </div>
          <LogActionBadge actionType={row.actionType} />
        </div>
      )}
      emptyState={
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={t(hasFilters ? "admin.logs.empty.noMatch" : "admin.logs.empty.noLogs")}
          body=""
          decoration={
            hasFilters ? (
              <Button variant="outline" onClick={onClearFilters} className="mt-2">
                {t("common.actions.clear")}
              </Button>
            ) : undefined
          }
        />
      }
    />
  );
}
