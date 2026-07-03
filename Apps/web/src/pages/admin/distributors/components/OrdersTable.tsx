import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { OrderDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { OrderStatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime, formatDZD } from "@/lib/utils";
import { OrderActionsMenu } from "./OrderActionsMenu";
import { MarkDeliveredModal } from "./MarkDeliveredModal";
import type { MarkDeliveredFormValues } from "./mark-delivered.schema";

interface Props {
  data?: OrderDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateFirst?: () => void;
  onView: (order: OrderDTO) => void;
  onMarkInDelivery: (order: OrderDTO) => void;
  onMarkDelivered: (order: OrderDTO, values: MarkDeliveredFormValues) => void;
  onMarkReturned: (order: OrderDTO) => void;
  onDelete: (order: OrderDTO) => void;
  /** `useTransitionOrder`/`useDeleteOrder` pending state — wired in Sprint 3. */
  isMutating?: boolean;
}

// Owns its own row-scoped confirm dialogs (mirrors DistributorsTable) — the page only
// supplies the actual mutation callbacks.
export function OrdersTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onCreateFirst,
  onView,
  onMarkInDelivery,
  onMarkDelivered,
  onMarkReturned,
  onDelete,
  isMutating,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [markInDeliveryRow, setMarkInDeliveryRow] = useState<OrderDTO | null>(null);
  const [markDeliveredRow, setMarkDeliveredRow] = useState<OrderDTO | null>(null);
  const [markReturnedRow, setMarkReturnedRow] = useState<OrderDTO | null>(null);
  const [deleteRow, setDeleteRow] = useState<OrderDTO | null>(null);

  const columns = useMemo<ColumnDef<OrderDTO>[]>(
    () => [
      { accessorKey: "receivedName", header: t("admin.orders.table.receiver") },
      { accessorKey: "receivedPhone", header: t("admin.orders.table.phone") },
      { accessorKey: "distributorName", header: t("admin.orders.table.distributor") },
      { accessorKey: "wilayaName", header: t("admin.orders.table.wilaya") },
      { accessorKey: "deliveryCompanyName", header: t("admin.orders.table.deliveryCompany") },
      {
        id: "deliveryType",
        header: t("admin.orders.table.deliveryType"),
        cell: ({ row }) => t(`enums.deliveryType.${row.original.deliveryType}`),
      },
      { accessorKey: "cardsCount", header: t("admin.orders.table.cardsCount") },
      {
        id: "status",
        header: t("admin.orders.table.status"),
        cell: ({ row }) => <OrderStatusBadge status={row.original.orderStat} />,
      },
      {
        id: "createdAt",
        header: t("admin.orders.table.createdAt"),
        accessorFn: (row) => formatDateTime(row.createdAt, language),
      },
      {
        id: "actions",
        header: t("admin.orders.table.actions"),
        cell: ({ row }) => (
          <OrderActionsMenu
            order={row.original}
            onRequestView={onView}
            onRequestMarkInDelivery={setMarkInDeliveryRow}
            onRequestMarkDelivered={setMarkDeliveredRow}
            onRequestMarkReturned={setMarkReturnedRow}
            onRequestDelete={setDeleteRow}
          />
        ),
      },
    ],
    [t, language, onView],
  );

  if (isLoading) return <TableSkeleton rows={5} columns={10} />;
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
    <>
      <DataTable
        columns={columns}
        data={rows}
        getRowKey={(row) => row.id}
        renderMobileRow={(row) => (
          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <div>
              <div className="font-semibold">{row.receivedName}</div>
              <div className="text-muted-foreground">
                {row.distributorName} · {formatDZD(row.orderPrice, language)}
              </div>
            </div>
            <OrderStatusBadge status={row.orderStat} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title={t(hasFilters ? "admin.orders.empty.noMatch" : "admin.orders.empty.noOrders")}
            body=""
            decoration={
              hasFilters ? (
                <Button variant="outline" onClick={onClearFilters} className="mt-2">
                  {t("common.actions.clear")}
                </Button>
              ) : (
                onCreateFirst && (
                  <Button onClick={onCreateFirst} className="mt-2">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("admin.orders.create.title")}
                  </Button>
                )
              )
            }
          />
        }
      />

      <AlertDialog
        open={markInDeliveryRow !== null}
        onOpenChange={(open) => !open && setMarkInDeliveryRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.orders.actions.markInDeliveryConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (markInDeliveryRow) onMarkInDelivery(markInDeliveryRow);
                setMarkInDeliveryRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MarkDeliveredModal
        open={markDeliveredRow !== null}
        onOpenChange={(open) => !open && setMarkDeliveredRow(null)}
        isPending={isMutating}
        maxCount={markDeliveredRow?.cardsCount ?? 0}
        onSubmit={(values) => {
          if (markDeliveredRow) onMarkDelivered(markDeliveredRow, values);
          setMarkDeliveredRow(null);
        }}
      />

      <AlertDialog
        open={markReturnedRow !== null}
        onOpenChange={(open) => !open && setMarkReturnedRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.orders.actions.markReturnedConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (markReturnedRow) onMarkReturned(markReturnedRow);
                setMarkReturnedRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteRow !== null} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.orders.actions.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.orders.actions.deleteConfirm.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isMutating}
              onClick={() => {
                if (deleteRow) onDelete(deleteRow);
                setDeleteRow(null);
              }}
            >
              {t("common.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
