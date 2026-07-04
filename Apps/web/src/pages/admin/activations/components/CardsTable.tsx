import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import type { CardDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { CardStatusBadge } from "@/components/shared/StatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
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
import { CreditCard, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";
import { CardActionsMenu } from "./CardActionsMenu";
import { CardFlagChips } from "./CardFlagChips";

interface Props {
  data?: CardDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onView: (card: CardDTO) => void;
  onDisable: (card: CardDTO) => void;
  onEnable: (card: CardDTO) => void;
  onRevoke: (card: CardDTO) => void;
  onDelete: (card: CardDTO) => void;
  isMutating?: boolean;
}

// Owns its own row-scoped confirm dialogs (mirrors OrdersTable/SetsTable).
export function CardsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onView,
  onDisable,
  onEnable,
  onRevoke,
  onDelete,
  isMutating,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [disableRow, setDisableRow] = useState<CardDTO | null>(null);
  const [enableRow, setEnableRow] = useState<CardDTO | null>(null);
  const [revokeRow, setRevokeRow] = useState<CardDTO | null>(null);
  const [deleteRow, setDeleteRow] = useState<CardDTO | null>(null);

  const columns = useMemo<ColumnDef<CardDTO>[]>(
    () => [
      {
        id: "key",
        header: t("admin.cards.table.key"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="font-mono">{row.original.key}</span>
            <CopyButton text={row.original.key} />
          </div>
        ),
      },
      { accessorKey: "subscriptionLabel", header: t("admin.cards.table.plan") },
      { accessorKey: "setNumber", header: t("admin.cards.table.set") },
      {
        id: "lot",
        header: t("admin.cards.table.lot"),
        accessorFn: (row) => row.lotNumber ?? "—",
      },
      {
        id: "distributor",
        header: t("admin.cards.table.distributor"),
        accessorFn: (row) => row.distributorName ?? "—",
      },
      {
        id: "status",
        header: t("admin.cards.table.status"),
        cell: ({ row }) => <CardStatusBadge status={row.original.cardStat} />,
      },
      {
        id: "flags",
        header: t("admin.cards.table.flags"),
        cell: ({ row }) => (
          <CardFlagChips isDisabled={row.original.isDisabled} isRevoked={row.original.isRevoked} />
        ),
      },
      {
        id: "createdAt",
        header: t("admin.cards.table.createdAt"),
        accessorFn: (row) => formatDateTime(row.createdAt, language),
      },
      {
        id: "actions",
        header: t("admin.cards.table.actions"),
        cell: ({ row }) => (
          <CardActionsMenu
            card={row.original}
            onRequestView={onView}
            onRequestDisable={setDisableRow}
            onRequestEnable={setEnableRow}
            onRequestRevoke={setRevokeRow}
            onRequestDelete={setDeleteRow}
          />
        ),
      },
    ],
    [t, language, onView],
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
              <div className="font-mono font-semibold">{row.key}</div>
              <div className="text-muted-foreground">{row.subscriptionLabel}</div>
            </div>
            <CardStatusBadge status={row.cardStat} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<CreditCard className="h-6 w-6" />}
            title={t(hasFilters ? "admin.cards.empty.noMatch" : "admin.cards.empty.noCards")}
            body=""
            decoration={
              hasFilters ? (
                <Button variant="outline" onClick={onClearFilters} className="mt-2">
                  {t("common.actions.clear")}
                </Button>
              ) : (
                <Button variant="outline" asChild className="mt-2">
                  <Link to="/admin/activations/sets-lots">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("admin.cards.createSetLink")}
                  </Link>
                </Button>
              )
            }
          />
        }
      />

      <AlertDialog open={disableRow !== null} onOpenChange={(open) => !open && setDisableRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.cards.actions.disableConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (disableRow) onDisable(disableRow);
                setDisableRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={enableRow !== null} onOpenChange={(open) => !open && setEnableRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.cards.actions.enableConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (enableRow) onEnable(enableRow);
                setEnableRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeRow !== null} onOpenChange={(open) => !open && setRevokeRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.cards.actions.revokeConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                if (revokeRow) onRevoke(revokeRow);
                setRevokeRow(null);
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
            <AlertDialogTitle>{t("admin.cards.actions.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription />
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
