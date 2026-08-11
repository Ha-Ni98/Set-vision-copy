import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { OrderDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { OrderStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Eye, Search } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime, formatDZD } from "@/lib/utils";

interface Props {
  data?: OrderDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onRowClick: (order: OrderDTO) => void;
}

export function MyOrdersTable({
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

  const columns = useMemo<ColumnDef<OrderDTO>[]>(
    () => [
      { accessorKey: "orderNumber", header: t("distributor.orders.table.number") },
      {
        id: "lots",
        header: t("distributor.orders.table.lots"),
        cell: ({ row }) => row.original.lotNumbers.join(", ") || "—",
      },
      { accessorKey: "cardsCount", header: t("distributor.orders.table.cards") },
      {
        id: "status",
        header: t("distributor.orders.table.status"),
        cell: ({ row }) => <OrderStatusBadge status={row.original.orderStat} />,
      },
      {
        id: "orderPrice",
        header: t("distributor.orders.table.price"),
        cell: ({ row }) => formatDZD(row.original.orderPrice, language),
      },
      {
        id: "deliverPrice",
        header: t("distributor.orders.table.delivery"),
        cell: ({ row }) => formatDZD(row.original.deliverPrice, language),
      },
      {
        id: "createdAt",
        header: t("distributor.orders.table.created"),
        cell: ({ row }) => formatDateTime(row.original.createdAt, language),
      },
      {
        id: "completedAt",
        header: t("distributor.orders.table.completed"),
        cell: ({ row }) =>
          row.original.completedAt ? formatDateTime(row.original.completedAt, language) : "—",
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

  if (isLoading) return <TableSkeleton rows={10} columns={9} />;
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
            <div className="font-semibold text-foreground">{row.orderNumber}</div>
            <OrderStatusBadge status={row.orderStat} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("distributor.orders.mobileCardsCount", { count: row.cardsCount })}</span>
            <span>{formatDateTime(row.createdAt, language)}</span>
          </div>
        </button>
      )}
      emptyState={
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t(
            hasFilters ? "distributor.orders.empty.noMatch" : "distributor.orders.empty.noOrders",
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
