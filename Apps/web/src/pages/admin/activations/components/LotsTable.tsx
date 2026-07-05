import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { LotDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { LotStatusBadge } from "@/components/shared/StatusBadge";
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
import { Package2, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";
import { LotActionsMenu } from "./LotActionsMenu";

interface Props {
  data?: LotDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateFirst?: () => void;
  onDelete: (lot: LotDTO) => void;
  isMutating?: boolean;
}

// Owns its own row-scoped confirm dialog (mirrors SetsTable/OrdersTable).
export function LotsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onCreateFirst,
  onDelete,
  isMutating,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [deleteRow, setDeleteRow] = useState<LotDTO | null>(null);

  const columns = useMemo<ColumnDef<LotDTO>[]>(
    () => [
      { accessorKey: "lotNumber", header: t("admin.setsLots.lots.table.lotNumber") },
      { accessorKey: "subscriptionLabel", header: t("admin.setsLots.lots.table.plan") },
      { accessorKey: "nbOfCards", header: t("admin.setsLots.lots.table.nbOfCards") },
      {
        accessorKey: "deliveredCardsCount",
        header: t("admin.setsLots.lots.table.deliveredCardsCount"),
      },
      {
        id: "status",
        header: t("admin.setsLots.lots.table.status"),
        cell: ({ row }) => <LotStatusBadge status={row.original.lotStat} />,
      },
      {
        id: "createdAt",
        header: t("admin.setsLots.lots.table.createdAt"),
        accessorFn: (row) => formatDateTime(row.createdAt, language),
      },
      {
        id: "deliveryDate",
        header: t("admin.setsLots.lots.table.deliveryDate"),
        accessorFn: (row) => (row.deliveryDate ? formatDateTime(row.deliveryDate, language) : "—"),
      },
      {
        id: "actions",
        header: t("admin.setsLots.lots.table.actions"),
        cell: ({ row }) => <LotActionsMenu lot={row.original} onRequestDelete={setDeleteRow} />,
      },
    ],
    [t, language],
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
    <>
      <DataTable
        columns={columns}
        data={rows}
        getRowKey={(row) => row.id}
        renderMobileRow={(row) => (
          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <div>
              <div className="font-semibold">{row.lotNumber}</div>
              <div className="text-muted-foreground">
                {row.subscriptionLabel} · {row.nbOfCards}
              </div>
            </div>
            <LotStatusBadge status={row.lotStat} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Package2 className="h-6 w-6" />}
            title={t(
              hasFilters ? "admin.setsLots.lots.empty.noMatch" : "admin.setsLots.lots.empty.noLots",
            )}
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
                    {t("common.actions.add")}
                  </Button>
                )
              )
            }
          />
        }
      />

      <AlertDialog open={deleteRow !== null} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.setsLots.lots.actions.deleteConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.setsLots.lots.actions.deleteConfirm.body")}
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
