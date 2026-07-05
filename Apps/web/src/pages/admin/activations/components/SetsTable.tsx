import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SetDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { SetStatusBadge } from "@/components/shared/StatusBadge";
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
import { Layers, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";
import { SetActionsMenu } from "./SetActionsMenu";

interface Props {
  data?: SetDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateFirst?: () => void;
  onSendToPrint: (set: SetDTO) => void;
  onMarkPrinted: (set: SetDTO) => void;
  onDelete: (set: SetDTO) => void;
  isMutating?: boolean;
}

// Owns its own row-scoped confirm dialogs (mirrors DistributorsTable/OrdersTable).
export function SetsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onCreateFirst,
  onSendToPrint,
  onMarkPrinted,
  onDelete,
  isMutating,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [sendToPrintRow, setSendToPrintRow] = useState<SetDTO | null>(null);
  const [markPrintedRow, setMarkPrintedRow] = useState<SetDTO | null>(null);
  const [deleteRow, setDeleteRow] = useState<SetDTO | null>(null);

  const columns = useMemo<ColumnDef<SetDTO>[]>(
    () => [
      { accessorKey: "setNumber", header: t("admin.setsLots.sets.table.setNumber") },
      { accessorKey: "numberOfKeys", header: t("admin.setsLots.sets.table.numberOfKeys") },
      { accessorKey: "subscriptionLabel", header: t("admin.setsLots.sets.table.plan") },
      {
        id: "status",
        header: t("admin.setsLots.sets.table.status"),
        cell: ({ row }) => <SetStatusBadge status={row.original.setStat} />,
      },
      {
        id: "createdAt",
        header: t("admin.setsLots.sets.table.createdAt"),
        accessorFn: (row) => formatDateTime(row.createdAt, language),
      },
      {
        id: "printedAt",
        header: t("admin.setsLots.sets.table.printedAt"),
        accessorFn: (row) => (row.printedAt ? formatDateTime(row.printedAt, language) : "—"),
      },
      {
        id: "actions",
        header: t("admin.setsLots.sets.table.actions"),
        cell: ({ row }) => (
          <SetActionsMenu
            set={row.original}
            onRequestSendToPrint={setSendToPrintRow}
            onRequestMarkPrinted={setMarkPrintedRow}
            onRequestDelete={setDeleteRow}
          />
        ),
      },
    ],
    [t, language],
  );

  if (isLoading) return <TableSkeleton rows={5} columns={7} />;
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
              <div className="font-semibold">{row.setNumber}</div>
              <div className="text-muted-foreground">
                {row.subscriptionLabel} · {row.numberOfKeys}
              </div>
            </div>
            <SetStatusBadge status={row.setStat} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title={t(
              hasFilters ? "admin.setsLots.sets.empty.noMatch" : "admin.setsLots.sets.empty.noSets",
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

      <AlertDialog
        open={sendToPrintRow !== null}
        onOpenChange={(open) => !open && setSendToPrintRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.setsLots.sets.actions.sendToPrintConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (sendToPrintRow) onSendToPrint(sendToPrintRow);
                setSendToPrintRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={markPrintedRow !== null}
        onOpenChange={(open) => !open && setMarkPrintedRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.setsLots.sets.actions.markPrintedConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (markPrintedRow) onMarkPrinted(markPrintedRow);
                setMarkPrintedRow(null);
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
            <AlertDialogTitle>
              {t("admin.setsLots.sets.actions.deleteConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.setsLots.sets.actions.deleteConfirm.body")}
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
