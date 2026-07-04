import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import type { RecentActivationDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";

interface Props {
  data?: RecentActivationDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// Columns reduced vs the spec per plan.md §F-3 — RecentActivationDTO carries no
// activator/client/distributor name or duration. DataTable has no whole-row onClick, so the
// subscription cell itself carries the "row click → /admin/activations/{id}" navigation.
export function RecentActivationsTable({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const columns = useMemo<ColumnDef<RecentActivationDTO>[]>(
    () => [
      {
        id: "subscription",
        header: t("admin.dashboard.frozen.columns.subscription"),
        cell: ({ row }) => (
          <Link
            to={`/admin/activations/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.subscriptionLabel}
          </Link>
        ),
      },
      { accessorKey: "keyMasked", header: t("admin.dashboard.frozen.columns.key") },
      {
        id: "completedAt",
        accessorFn: (row) => formatDateTime(row.completedAt, language),
        header: t("admin.dashboard.recent.columns.completedAt"),
      },
      {
        id: "state",
        header: t("admin.activators.table.status"),
        cell: ({ row }) => <StatusBadge status={row.original.state} />,
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
        <Link
          to={`/admin/activations/${row.id}`}
          className="flex items-center justify-between gap-3 p-4 text-sm"
        >
          <div>
            <div className="font-semibold text-primary">{row.subscriptionLabel}</div>
            <div className="text-muted-foreground">{formatDateTime(row.completedAt, language)}</div>
          </div>
          <StatusBadge status={row.state} />
        </Link>
      )}
      emptyState={
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title={t("admin.dashboard.recent.empty")}
          body=""
        />
      }
    />
  );
}
