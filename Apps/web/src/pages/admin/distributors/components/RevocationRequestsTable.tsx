import { useMemo } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, MoreHorizontal, Check, X } from "lucide-react";
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
  onApprove: (request: CardRevocationRequestDTO) => void;
  onReject: (request: CardRevocationRequestDTO) => void;
}

export function RevocationRequestsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onApprove,
  onReject,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const columns = useMemo<ColumnDef<CardRevocationRequestDTO>[]>(
    () => [
      { accessorKey: "distributorName", header: t("admin.revocationRequests.table.distributor") },
      { accessorKey: "cardKey", header: t("admin.revocationRequests.table.card") },
      { accessorKey: "subscriptionLabel", header: t("admin.revocationRequests.table.plan") },
      { accessorKey: "reason", header: t("admin.revocationRequests.table.reason") },
      {
        id: "status",
        header: t("admin.revocationRequests.table.status"),
        cell: ({ row }) => <RevocationRequestStatusBadge status={row.original.stat} />,
      },
      { accessorKey: "reviewedByName", header: t("admin.revocationRequests.table.reviewedBy") },
      {
        id: "createdAt",
        header: t("admin.revocationRequests.table.createdAt"),
        accessorFn: (row) => formatDateTime(row.createdAt, language),
      },
      {
        id: "actions",
        header: t("admin.revocationRequests.table.actions"),
        cell: ({ row }) => {
          const request = row.original;
          if (request.stat !== RevocationRequestStat.PENDING) return null;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onApprove(request)}>
                  <Check className="mr-2 h-4 w-4" /> {t("common.actions.approve")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onReject(request)}
                  className="text-destructive focus:text-destructive"
                >
                  <X className="mr-2 h-4 w-4" /> {t("common.actions.reject")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, language, onApprove, onReject],
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
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(row) => row.id}
      renderMobileRow={(row) => (
        <div className="flex items-center justify-between gap-3 p-4 text-sm">
          <div>
            <div className="font-semibold">{row.distributorName}</div>
            <div className="text-muted-foreground">
              {row.cardKey} · {row.subscriptionLabel}
            </div>
          </div>
          <RevocationRequestStatusBadge status={row.stat} />
        </div>
      )}
      emptyState={
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title={t(
            hasFilters
              ? "admin.revocationRequests.empty.noMatch"
              : "admin.revocationRequests.empty.noRequests",
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
