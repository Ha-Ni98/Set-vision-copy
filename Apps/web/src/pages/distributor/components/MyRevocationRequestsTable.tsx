import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { CardRevocationRequestDTO } from "@my-app/contract";
import { RevocationRequestStat } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { RevocationRequestStatusBadge } from "@/components/shared/StatusBadge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, MoreHorizontal, XCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";

interface Props {
  data?: CardRevocationRequestDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onCancel: (request: CardRevocationRequestDTO) => void;
  isMutating?: boolean;
}

export function MyRevocationRequestsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onCancel,
  isMutating,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [cancelRow, setCancelRow] = useState<CardRevocationRequestDTO | null>(null);

  const columns = useMemo<ColumnDef<CardRevocationRequestDTO>[]>(
    () => [
      {
        id: "cardKey",
        header: t("distributor.revocations.table.card"),
        // Nullable per the Set 7 key policy: once approved, the card is back at
        // AT_DISTRIBUTOR (sellable stock) and the server stops sending a live key.
        cell: ({ row }) => row.original.cardKey ?? "—",
      },
      { accessorKey: "subscriptionLabel", header: t("distributor.revocations.table.plan") },
      { accessorKey: "reason", header: t("distributor.revocations.table.reason") },
      {
        id: "status",
        header: t("distributor.revocations.table.status"),
        cell: ({ row }) => <RevocationRequestStatusBadge status={row.original.stat} />,
      },
      { accessorKey: "adminNote", header: t("distributor.revocations.table.adminNote") },
      {
        id: "createdAt",
        header: t("distributor.revocations.table.createdAt"),
        accessorFn: (row) => formatDateTime(row.createdAt, language),
      },
      {
        id: "actions",
        header: t("distributor.revocations.table.actions"),
        cell: ({ row }) =>
          row.original.stat === RevocationRequestStat.PENDING && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setCancelRow(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" /> {t("common.actions.cancel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
      },
    ],
    [t, language],
  );

  if (isLoading) return <TableSkeleton rows={5} columns={6} />;
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
              <div className="font-semibold">{row.cardKey ?? "—"}</div>
              <div className="text-muted-foreground">{row.subscriptionLabel}</div>
            </div>
            <RevocationRequestStatusBadge status={row.stat} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<CreditCard className="h-6 w-6" />}
            title={t(
              hasFilters
                ? "distributor.revocations.empty.noMatch"
                : "distributor.revocations.empty.noRequests",
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

      <AlertDialog open={cancelRow !== null} onOpenChange={(open) => !open && setCancelRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("distributor.revocations.cancelConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("distributor.revocations.cancelConfirm.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isMutating}
              onClick={() => {
                if (cancelRow) onCancel(cancelRow);
                setCancelRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
