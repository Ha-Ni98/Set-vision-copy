import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DistributorDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EnabledBadge } from "@/components/shared/StatusBadge";
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
import { Store, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { DistributorActionsMenu } from "./DistributorActionsMenu";

interface Props {
  data?: DistributorDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onToggle: (distributor: DistributorDTO) => void;
  onDelete: (distributor: DistributorDTO) => void;
  onAddFirst?: () => void;
}

export function DistributorsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onToggle,
  onDelete,
  onAddFirst,
}: Props) {
  const { t } = useTranslation();
  const [toggleRow, setToggleRow] = useState<DistributorDTO | null>(null);
  const [deleteRow, setDeleteRow] = useState<DistributorDTO | null>(null);

  const columns = useMemo<ColumnDef<DistributorDTO>[]>(
    () => [
      { accessorKey: "fullName", header: t("admin.distributors.table.fullName") },
      { accessorKey: "storeName", header: t("admin.distributors.table.storeName") },
      { accessorKey: "phone", header: t("admin.distributors.table.phone") },
      { accessorKey: "wilayaName", header: t("admin.distributors.table.wilaya") },
      { accessorKey: "communeName", header: t("admin.distributors.table.commune") },
      { accessorKey: "nbOfActivation", header: t("admin.distributors.table.activationsCount") },
      { accessorKey: "nbOfActiveCards", header: t("admin.distributors.table.activeCards") },
      {
        accessorKey: "deliveredOrdersCount",
        header: t("admin.distributors.table.deliveredOrders"),
      },
      {
        id: "status",
        header: t("admin.distributors.table.status"),
        cell: ({ row }) => <EnabledBadge isEnabled={row.original.isEnabled} />,
      },
      {
        id: "actions",
        header: t("admin.distributors.table.actions"),
        cell: ({ row }) => (
          <DistributorActionsMenu
            distributor={row.original}
            onRequestToggle={setToggleRow}
            onRequestDelete={setDeleteRow}
          />
        ),
      },
    ],
    [t],
  );

  if (isLoading) return <TableSkeleton rows={5} columns={9} />;
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
              <div className="font-semibold">{row.fullName}</div>
              <div className="text-muted-foreground">
                {row.storeName} · {row.wilayaName}
              </div>
            </div>
            <EnabledBadge isEnabled={row.isEnabled} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title={t(
              hasFilters
                ? "admin.distributors.empty.noMatch"
                : "admin.distributors.empty.noDistributors",
            )}
            body=""
            decoration={
              hasFilters ? (
                <Button variant="outline" onClick={onClearFilters} className="mt-2">
                  {t("common.actions.clear")}
                </Button>
              ) : (
                onAddFirst && (
                  <Button onClick={onAddFirst} className="mt-2">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("common.actions.add")}
                  </Button>
                )
              )
            }
          />
        }
      />

      <AlertDialog open={toggleRow !== null} onOpenChange={(open) => !open && setToggleRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                toggleRow?.isEnabled
                  ? "admin.distributors.toggleConfirm.disableTitle"
                  : "admin.distributors.toggleConfirm.enableTitle",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toggleRow) onToggle(toggleRow);
                setToggleRow(null);
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
            <AlertDialogTitle>{t("admin.distributors.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
