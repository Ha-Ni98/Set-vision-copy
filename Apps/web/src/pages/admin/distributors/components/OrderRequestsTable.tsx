import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { CardOrderRequestDTO } from "@my-app/contract";
import { OrderRequestStat } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { OrderRequestStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, MoreHorizontal, Check, X, Unlink } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";

interface Props {
  data?: CardOrderRequestDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onApprove: (request: CardOrderRequestDTO) => void;
  onReject: (request: CardOrderRequestDTO) => void;
  onUnlink: (request: CardOrderRequestDTO) => void;
}

export function OrderRequestsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onApprove,
  onReject,
  onUnlink,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const columns = useMemo<ColumnDef<CardOrderRequestDTO>[]>(
    () => [
      { accessorKey: "distributorName", header: t("admin.orderRequests.table.distributor") },
      { accessorKey: "subscriptionLabel", header: t("admin.orderRequests.table.plan") },
      { accessorKey: "nbOfCards", header: t("admin.orderRequests.table.quantity") },
      { accessorKey: "note", header: t("admin.orderRequests.table.note") },
      {
        id: "status",
        header: t("admin.orderRequests.table.status"),
        cell: ({ row }) => <OrderRequestStatusBadge status={row.original.stat} />,
      },
      { accessorKey: "reviewedByName", header: t("admin.orderRequests.table.reviewedBy") },
      { accessorKey: "orderNumber", header: t("admin.orderRequests.table.order") },
      {
        id: "createdAt",
        header: t("admin.orderRequests.table.createdAt"),
        accessorFn: (row) => formatDateTime(row.createdAt, language),
      },
      {
        id: "actions",
        header: t("admin.orderRequests.table.actions"),
        cell: ({ row }) => {
          const request = row.original;
          const canReview = request.stat === OrderRequestStat.PENDING;
          const canUnlink = request.stat === OrderRequestStat.PENDING_DELIVERY;
          if (!canReview && !canUnlink) return null;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canReview && (
                  <>
                    <DropdownMenuItem onClick={() => onApprove(request)}>
                      <Check className="mr-2 h-4 w-4" /> {t("common.actions.approve")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onReject(request)}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" /> {t("common.actions.reject")}
                    </DropdownMenuItem>
                  </>
                )}
                {canUnlink && (
                  <>
                    {canReview && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => onUnlink(request)}>
                      <Unlink className="mr-2 h-4 w-4" /> {t("admin.orderRequests.actions.unlink")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, language, onApprove, onReject, onUnlink],
  );

  if (isLoading) return <TableSkeleton rows={5} columns={8} />;
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
            <div className="font-semibold">{row.distributorName}</div>
            <div className="text-muted-foreground">
              {row.subscriptionLabel} · {row.nbOfCards}
            </div>
          </div>
          <OrderRequestStatusBadge status={row.stat} />
        </div>
      )}
      emptyState={
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title={t(
            hasFilters
              ? "admin.orderRequests.empty.noMatch"
              : "admin.orderRequests.empty.noRequests",
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
