import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DistributorActivationDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye, Search } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";
import { formatDuration } from "@/lib/duration";

interface Props {
  data?: DistributorActivationDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onRowClick: (activation: DistributorActivationDTO) => void;
}

function KeyCell({ activation }: { activation: DistributorActivationDTO }) {
  const { t } = useTranslation();
  if (!activation.key) {
    return (
      <span className="text-muted-foreground" title={t("distributor.cards.keyHidden")}>
        —
      </span>
    );
  }
  return <span className="font-mono text-xs">{activation.key}</span>;
}

export function MyActivationsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onRowClick,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const columns = useMemo<ColumnDef<DistributorActivationDTO>[]>(
    () => [
      {
        id: "client",
        header: t("distributor.activations.table.client"),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.client.fullName}</span>
        ),
      },
      {
        id: "phone",
        header: t("distributor.activations.table.phone"),
        cell: ({ row }) => (
          <a
            href={`tel:${row.original.client.phone}`}
            className="text-muted-foreground hover:text-primary hover:underline"
          >
            {row.original.client.phone}
          </a>
        ),
      },
      { accessorKey: "subscriptionLabel", header: t("distributor.activations.table.plan") },
      {
        id: "key",
        header: t("distributor.activations.table.key"),
        cell: ({ row }) => <KeyCell activation={row.original} />,
      },
      {
        id: "status",
        header: t("distributor.activations.table.status"),
        cell: ({ row }) => <StatusBadge status={row.original.state} />,
      },
      {
        id: "requestedAt",
        header: t("distributor.activations.table.requested"),
        cell: ({ row }) => formatDateTime(row.original.requestedAt, language),
      },
      {
        id: "duration",
        header: t("distributor.activations.table.duration"),
        cell: ({ row }) => (
          <span className="font-mono">{formatDuration(row.original.durationSeconds)}</span>
        ),
      },
      {
        id: "actions",
        header: t("distributor.orders.table.actions"),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.actions.view")}
            onClick={() => onRowClick(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [t, language, onRowClick],
  );

  if (isLoading) return <TableSkeleton rows={10} columns={8} />;
  if (isError) {
    return (
      <NotFoundState
        title={t("common.errors.crashTitle")}
        body={t("common.errors.crashBody")}
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
        <button
          type="button"
          onClick={() => onRowClick(row)}
          className="w-full space-y-2 p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="font-semibold text-foreground">{row.client.fullName}</div>
            <StatusBadge status={row.state} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{row.subscriptionLabel}</span>
            <span>{formatDateTime(row.requestedAt, language)}</span>
          </div>
        </button>
      )}
      emptyState={
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t(
            hasFilters
              ? "distributor.activations.empty.noMatch"
              : "distributor.activations.empty.noActivations",
          )}
          body=""
          decoration={
            hasFilters && (
              <Button variant="outline" onClick={onClearFilters} className="mt-2">
                {t("common.actions.clear")}
              </Button>
            )
          }
        />
      }
    />
  );
}
