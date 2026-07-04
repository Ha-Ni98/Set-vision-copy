import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { OrderDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { OrderStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface Props {
  data?: OrderDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// Compact — every spec column is present (plan.md §D5: no reduced-fidelity deviation here,
// unlike the Dashboard's admin-activation tables).
export function OrdersHistoryCompact({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const columns = useMemo<ColumnDef<OrderDTO>[]>(
    () => [
      {
        accessorKey: "receivedName",
        header: t("admin.distributors.detail.orders.columns.receiver"),
      },
      { accessorKey: "wilayaName", header: t("admin.distributors.table.wilaya") },
      { accessorKey: "communeName", header: t("admin.distributors.table.commune") },
      {
        accessorKey: "deliveryCompanyName",
        header: t("admin.distributors.detail.orders.columns.deliveryCompany"),
      },
      {
        id: "state",
        header: t("admin.activators.table.status"),
        cell: ({ row }) => <OrderStatusBadge status={row.original.orderStat} />,
      },
      {
        accessorKey: "cardsCount",
        header: t("admin.distributors.detail.orders.columns.cardsCount"),
      },
      {
        id: "createdAt",
        header: t("admin.distributors.detail.orders.columns.createdAt"),
        accessorFn: (row) => formatDateTime(row.createdAt, language),
      },
      {
        id: "completedAt",
        header: t("admin.distributors.detail.orders.columns.completedAt"),
        accessorFn: (row) => (row.completedAt ? formatDateTime(row.completedAt, language) : "—"),
      },
    ],
    [t, language],
  );

  if (isLoading) return <TableSkeleton rows={3} columns={8} />;
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
            <div className="font-semibold">{row.receivedName}</div>
            <div className="text-muted-foreground">{row.orderNumber}</div>
          </div>
          <OrderStatusBadge status={row.orderStat} />
        </div>
      )}
      emptyState={
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title={t("admin.distributors.detail.orders.empty")}
          body=""
        />
      }
    />
  );
}
