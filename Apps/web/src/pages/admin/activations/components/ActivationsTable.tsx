import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ActivateActivationCommand, AdminActivationDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LiveTimer } from "@/components/shared/LiveTimer";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime, formatDZD } from "@/lib/utils";
import { formatDuration } from "@/lib/duration";
import { ActivationActionsMenu } from "./ActivationActionsMenu";
import { ResolveFreezeDialog } from "../../components/ResolveFreezeDialog";
import { SetActivatorPriceModal } from "./SetActivatorPriceModal";
import { SetActivationCostModal } from "./SetActivationCostModal";

interface Props {
  data?: AdminActivationDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  onActivate: (activation: AdminActivationDTO, command: ActivateActivationCommand) => void;
  onCancel: (activation: AdminActivationDTO) => void;
  onSetPrice: (activation: AdminActivationDTO, amount: number) => void;
  onSetCost: (activation: AdminActivationDTO, amount: number) => void;
  isMutating?: boolean;
}

// Owns its own row-scoped Resolve dialog + Set-Price modal (mirrors OrdersTable/SetsTable).
export function ActivationsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
  onActivate,
  onCancel,
  onSetPrice,
  onSetCost,
  isMutating,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [resolveRow, setResolveRow] = useState<{
    row: AdminActivationDTO;
    action: "activate" | "cancel";
  } | null>(null);
  const [priceRow, setPriceRow] = useState<AdminActivationDTO | null>(null);
  const [costRow, setCostRow] = useState<AdminActivationDTO | null>(null);

  const columns = useMemo<ColumnDef<AdminActivationDTO>[]>(
    () => [
      { accessorKey: "key", header: t("admin.activations.table.key") },
      { accessorKey: "subscriptionLabel", header: t("admin.activations.table.plan") },
      {
        id: "activator",
        header: t("admin.activations.table.activator"),
        accessorFn: (row) => row.activatorFullName ?? "—",
      },
      { accessorKey: "distributorStoreName", header: t("admin.activations.table.distributor") },
      { accessorKey: "clientName", header: t("admin.activations.table.client") },
      {
        id: "state",
        header: t("admin.activations.table.state"),
        cell: ({ row }) => <StatusBadge status={row.original.state} />,
      },
      {
        id: "duration",
        header: t("admin.activations.table.duration"),
        cell: ({ row }) => {
          const activation = row.original;
          if (activation.durationSeconds != null) return formatDuration(activation.durationSeconds);
          if (activation.takenAt) return <LiveTimer since={activation.takenAt} mode="elapsed" />;
          return "—";
        },
      },
      {
        id: "price",
        header: t("admin.activations.table.price"),
        accessorFn: (row) =>
          row.activationPrice != null ? formatDZD(row.activationPrice, language) : "—",
      },
      {
        id: "cost",
        header: t("admin.activations.table.cost"),
        accessorFn: (row) =>
          row.activationCost != null ? formatDZD(row.activationCost, language) : "—",
      },
      {
        id: "createdAt",
        header: t("admin.activations.table.createdAt"),
        accessorFn: (row) => formatDateTime(row.requestedAt, language),
      },
      {
        id: "actions",
        header: t("admin.activations.table.actions"),
        cell: ({ row }) => (
          <ActivationActionsMenu
            activation={row.original}
            onRequestResolve={(activation, action) => setResolveRow({ row: activation, action })}
            onRequestSetPrice={setPriceRow}
            onRequestSetCost={setCostRow}
          />
        ),
      },
    ],
    [t, language],
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
              <div className="font-semibold">{row.clientName}</div>
              <div className="text-muted-foreground">
                {row.subscriptionLabel} · {row.distributorStoreName}
              </div>
            </div>
            <StatusBadge status={row.state} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Zap className="h-6 w-6" />}
            title={t(
              hasFilters
                ? "admin.activations.empty.noMatch"
                : "admin.activations.empty.noActivations",
            )}
            body=""
            decoration={
              hasFilters ? (
                <Button variant="outline" onClick={onClearFilters} className="mt-2">
                  {t("common.actions.clear")}
                </Button>
              ) : undefined
            }
          />
        }
      />

      <ResolveFreezeDialog
        open={resolveRow !== null}
        action={resolveRow?.action ?? "activate"}
        reason={resolveRow?.row.freezeReason}
        onOpenChange={(open) => !open && setResolveRow(null)}
        onConfirm={(command) => {
          if (!resolveRow) return;
          if (resolveRow.action === "activate") onActivate(resolveRow.row, command!);
          else onCancel(resolveRow.row);
          setResolveRow(null);
        }}
      />

      <SetActivatorPriceModal
        open={priceRow !== null}
        onOpenChange={(open) => !open && setPriceRow(null)}
        isPending={isMutating}
        currentAmount={priceRow?.activationPrice}
        onSubmit={(values) => {
          if (priceRow) onSetPrice(priceRow, values.amount);
          setPriceRow(null);
        }}
      />

      <SetActivationCostModal
        open={costRow !== null}
        onOpenChange={(open) => !open && setCostRow(null)}
        isPending={isMutating}
        currentAmount={costRow?.activationCost}
        onSubmit={(values) => {
          if (costRow) onSetCost(costRow, values.amount);
          setCostRow(null);
        }}
      />
    </>
  );
}
