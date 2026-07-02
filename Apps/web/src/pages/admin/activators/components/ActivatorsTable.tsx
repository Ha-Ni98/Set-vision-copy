import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ActivatorDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EnabledBadge } from "@/components/shared/StatusBadge";
import { durationToneClass } from "@/lib/duration-tone";
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
import { Users, UserPlus } from "lucide-react";
import { formatDZD, formatTime } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ActivatorActionsMenu } from "./ActivatorActionsMenu";
import { RecordPaymentModal } from "./RecordPaymentModal";

interface Props {
  data?: ActivatorDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasSearch: boolean;
  onClearSearch: () => void;
  onToggle: (activator: ActivatorDTO) => void;
  onDelete: (activator: ActivatorDTO) => void;
  onRecordPayment: () => void;
  onAddFirst?: () => void;
}

// No password column (session decision #4 — the plaintext-password column is dropped; a
// generated password only ever surfaces once, via CreateActivatorModal / a reset action).
export function ActivatorsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasSearch,
  onClearSearch,
  onToggle,
  onDelete,
  onRecordPayment,
  onAddFirst,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [toggleRow, setToggleRow] = useState<ActivatorDTO | null>(null);
  const [deleteRow, setDeleteRow] = useState<ActivatorDTO | null>(null);
  const [paymentRow, setPaymentRow] = useState<ActivatorDTO | null>(null);

  const columns = useMemo<ColumnDef<ActivatorDTO>[]>(
    () => [
      { accessorKey: "fullName", header: t("admin.activators.table.fullName") },
      { accessorKey: "username", header: t("admin.activators.table.username") },
      { accessorKey: "phone", header: t("admin.activators.table.phone") },
      {
        accessorKey: "nbOfSuccessfulActivation",
        header: t("admin.activators.table.successfulActivations"),
      },
      {
        id: "avgActivationTime",
        header: t("admin.activators.table.avgActivationTime"),
        cell: ({ row }) => (
          <span
            className={`font-mono text-sm ${durationToneClass(row.original.avgActivationTimeSeconds)}`}
          >
            {row.original.avgActivationTimeSeconds !== null
              ? formatTime(row.original.avgActivationTimeSeconds)
              : "—"}
          </span>
        ),
      },
      {
        id: "totalEarned",
        header: t("admin.activators.table.totalEarned"),
        accessorFn: (row) => formatDZD(row.totalEarning, language),
      },
      {
        id: "creditsOwed",
        header: t("admin.activators.table.creditsOwed"),
        accessorFn: (row) => formatDZD(row.credits, language),
      },
      {
        id: "status",
        header: t("admin.activators.table.status"),
        cell: ({ row }) => <EnabledBadge isEnabled={row.original.isEnabled} />,
      },
      {
        id: "actions",
        header: t("admin.activators.table.actions"),
        cell: ({ row }) => (
          <ActivatorActionsMenu
            activator={row.original}
            onRequestToggle={setToggleRow}
            onRequestDelete={setDeleteRow}
            onRequestPayment={setPaymentRow}
          />
        ),
      },
    ],
    [t, language],
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
              <div className="text-muted-foreground">{row.username}</div>
            </div>
            <EnabledBadge isEnabled={row.isEnabled} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={t(
              hasSearch ? "admin.activators.empty.noMatch" : "admin.activators.empty.noActivators",
            )}
            body=""
            decoration={
              hasSearch ? (
                <Button variant="outline" onClick={onClearSearch} className="mt-2">
                  {t("common.actions.clear")}
                </Button>
              ) : (
                onAddFirst && (
                  <Button onClick={onAddFirst} className="mt-2">
                    <UserPlus className="mr-2 h-4 w-4" />
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
                  ? "admin.activators.toggleConfirm.disableTitle"
                  : "admin.activators.toggleConfirm.enableTitle",
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
            <AlertDialogTitle>{t("admin.activators.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.activators.deleteConfirm.body")}
            </AlertDialogDescription>
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

      <RecordPaymentModal
        open={paymentRow !== null}
        onOpenChange={(open) => !open && setPaymentRow(null)}
        onSubmit={() => {
          onRecordPayment();
          setPaymentRow(null);
        }}
      />
    </>
  );
}
