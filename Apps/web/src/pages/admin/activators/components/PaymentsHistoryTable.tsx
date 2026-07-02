import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { PaymentDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
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
import { Trash2, Wallet } from "lucide-react";
import { formatDZD, formatDateTime } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface Props {
  data?: PaymentDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onDelete: (paymentId: string) => void;
  onAddFirst?: () => void;
}

export function PaymentsHistoryTable({
  data,
  isLoading,
  isError,
  onRetry,
  onDelete,
  onAddFirst,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // DataTable has no per-row className hook, so soft-deleted dimming/strikethrough is
  // applied per cell here rather than at the row level.
  const cellClass = (row: PaymentDTO) => (row.isDeleted ? "opacity-50 line-through" : undefined);

  const columns = useMemo<ColumnDef<PaymentDTO>[]>(
    () => [
      {
        id: "date",
        header: t("admin.activators.detail.payments.columns.date"),
        cell: ({ row }) => (
          <span className={cellClass(row.original)}>
            {formatDateTime(row.original.paymentDate, language)}
          </span>
        ),
      },
      {
        id: "amount",
        header: t("admin.activators.detail.payments.columns.amount"),
        cell: ({ row }) => (
          <span className={cellClass(row.original)}>
            {formatDZD(row.original.amount, language)}
          </span>
        ),
      },
      {
        id: "previousCredits",
        header: t("admin.activators.detail.payments.columns.previousCredits"),
        cell: ({ row }) => (
          <span className={cellClass(row.original)}>
            {formatDZD(row.original.previousCredits, language)}
          </span>
        ),
      },
      {
        id: "recordedBy",
        header: t("admin.activators.detail.payments.columns.recordedBy"),
        cell: ({ row }) => (
          <span className={cellClass(row.original)}>{row.original.recordedByName}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.isDeleted ? null : (
            <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ),
      },
    ],
    [t, language],
  );

  if (isLoading) return <TableSkeleton rows={4} columns={5} />;
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
          <div
            className={`flex items-center justify-between gap-3 p-4 text-sm ${row.isDeleted ? "opacity-50 line-through" : ""}`}
          >
            <div>
              <div className="font-semibold">{formatDZD(row.amount, language)}</div>
              <div className="text-muted-foreground">
                {formatDateTime(row.paymentDate, language)}
              </div>
            </div>
            {!row.isDeleted && (
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title={t("admin.activators.detail.payments.empty")}
            body=""
            decoration={
              onAddFirst && (
                <Button onClick={onAddFirst} className="mt-2">
                  {t("common.actions.recordPayment")}
                </Button>
              )
            }
          />
        }
      />

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.activators.detail.payments.deleteConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) onDelete(deleteId);
                setDeleteId(null);
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
