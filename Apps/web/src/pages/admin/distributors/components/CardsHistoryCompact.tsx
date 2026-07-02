import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { CardDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { CardStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  data?: CardDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function CardsHistoryCompact({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<CardDTO>[]>(
    () => [
      { accessorKey: "key", header: t("admin.distributors.detail.cards.columns.key") },
      {
        accessorKey: "subscriptionLabel",
        header: t("admin.distributors.detail.cards.columns.subscription"),
      },
      {
        id: "status",
        header: t("admin.distributors.detail.cards.columns.status"),
        cell: ({ row }) => <CardStatusBadge status={row.original.cardStat} />,
      },
    ],
    [t],
  );

  if (isLoading) return <TableSkeleton rows={3} columns={3} />;
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
            <div className="font-mono font-semibold">{row.key}</div>
            <div className="text-muted-foreground">{row.subscriptionLabel}</div>
          </div>
          <CardStatusBadge status={row.cardStat} />
        </div>
      )}
      emptyState={
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title={t("admin.distributors.detail.cards.empty")}
          body=""
        />
      }
    />
  );
}
