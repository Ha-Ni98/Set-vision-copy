import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ActivateActivationCommand, AdminActivationDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ResolveFreezeDialog } from "./ResolveFreezeDialog";

interface Props {
  data?: AdminActivationDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onActivate: (activationId: string, command: ActivateActivationCommand) => void;
  onCancel: (activationId: string) => void;
}

// Columns reduced vs the spec per plan.md §F-2 — no frozen_since (AdminActivationDTO has no
// such field; no dedicated frozen endpoint exists yet).
export function FrozenActivationsTable({
  data,
  isLoading,
  isError,
  onRetry,
  onActivate,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [dialogRow, setDialogRow] = useState<{
    row: AdminActivationDTO;
    action: "activate" | "cancel";
  } | null>(null);

  const columns = useMemo<ColumnDef<AdminActivationDTO>[]>(
    () => [
      { accessorKey: "key", header: t("admin.dashboard.frozen.columns.key") },
      {
        accessorKey: "subscriptionLabel",
        header: t("admin.dashboard.frozen.columns.subscription"),
      },
      {
        id: "activator",
        accessorFn: (row) => row.activatorFullName ?? "—",
        header: t("admin.dashboard.frozen.columns.activator"),
      },
      { accessorKey: "clientName", header: t("admin.dashboard.frozen.columns.client") },
      { accessorKey: "freezeReason", header: t("admin.dashboard.frozen.columns.reason") },
      {
        id: "actions",
        header: t("common.actions.action"),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogRow({ row: row.original, action: "activate" })}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {t("common.actions.activate")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDialogRow({ row: row.original, action: "cancel" })}
            >
              <ShieldAlert className="mr-1 h-3.5 w-3.5" /> {t("common.actions.cancel")}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  if (isLoading) return <TableSkeleton rows={4} columns={6} />;
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
              <div className="font-semibold">{row.subscriptionLabel}</div>
              <div className="text-muted-foreground">{row.clientName}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialogRow({ row, action: "activate" })}
                aria-label={t("common.actions.activate")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => setDialogRow({ row, action: "cancel" })}
                aria-label={t("common.actions.cancel")}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6" />}
            title={t("admin.dashboard.frozen.empty")}
            body=""
          />
        }
      />
      <ResolveFreezeDialog
        open={dialogRow !== null}
        action={dialogRow?.action ?? "activate"}
        subscriptionPlanId={dialogRow?.row.subscriptionPlanId ?? ""}
        onOpenChange={(open) => {
          if (!open) setDialogRow(null);
        }}
        onConfirm={(command) => {
          if (!dialogRow) return;
          if (dialogRow.action === "activate") onActivate(dialogRow.row.id, command!);
          else onCancel(dialogRow.row.id);
          setDialogRow(null);
        }}
      />
    </>
  );
}
