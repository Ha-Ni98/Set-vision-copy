import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import type { PendingActivationDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { LiveTimer } from "@/components/shared/LiveTimer";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  data?: PendingActivationDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// Columns reduced vs the spec per plan.md §F-4 — PendingActivationDTO carries no client
// name. Wait-tier coloring (green <5m / amber 5-15m / red >15m) reuses LiveTimer's existing
// `mode="wait"` thresholds directly rather than a bespoke color map — same thresholds, no
// need to duplicate them.
export function PendingActivationsTable({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<PendingActivationDTO>[]>(
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
        id: "waiting",
        header: t("admin.dashboard.pending.title"),
        cell: ({ row }) => <LiveTimer since={row.original.requestedAt} mode="wait" />,
      },
    ],
    [t],
  );

  if (isLoading) return <TableSkeleton rows={5} columns={3} />;
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
          <div className="font-semibold text-primary">{row.subscriptionLabel}</div>
          <LiveTimer since={row.requestedAt} mode="wait" />
        </Link>
      )}
      emptyState={
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title={t("admin.dashboard.pending.empty")}
          body=""
        />
      }
    />
  );
}
