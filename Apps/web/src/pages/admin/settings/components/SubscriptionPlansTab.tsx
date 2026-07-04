import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SubscriptionPlanDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EnabledBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Power, CreditCard, Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useSubscriptionPlans,
  useCreateSubscriptionPlan,
  useToggleSubscriptionPlan,
} from "@/hooks/useSubscriptionPlans";
import { AddPlanModal } from "./AddPlanModal";

export function SubscriptionPlansTab() {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [toggleRow, setToggleRow] = useState<SubscriptionPlanDTO | null>(null);

  const plansQuery = useSubscriptionPlans({});
  const createPlan = useCreateSubscriptionPlan();
  const togglePlan = useToggleSubscriptionPlan();

  const columns = useMemo<ColumnDef<SubscriptionPlanDTO>[]>(
    () => [
      { accessorKey: "label", header: t("admin.settings.plans.table.label") },
      {
        id: "type",
        header: t("admin.settings.plans.table.type"),
        cell: ({ row }) => t(`enums.subscriptionType.${row.original.subscriptionType}`),
      },
      {
        id: "duration",
        header: t("admin.settings.plans.table.duration"),
        cell: ({ row }) => t(`enums.subscriptionDuration.${row.original.subscriptionDuration}`),
      },
      {
        id: "status",
        header: t("admin.settings.plans.table.status"),
        cell: ({ row }) => <EnabledBadge isEnabled={row.original.isActive} />,
      },
      {
        id: "actions",
        header: t("admin.settings.plans.table.actions"),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setToggleRow(row.original)}>
                <Power className="mr-2 h-4 w-4" />
                {row.original.isActive ? t("common.actions.disable") : t("common.actions.enable")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.settings.plans.create.title")}
        </Button>
      </div>

      {plansQuery.isLoading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : plansQuery.isError ? (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={
            <Button onClick={() => plansQuery.refetch()}>{t("common.actions.tryAgain")}</Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={plansQuery.data ?? []}
          getRowKey={(row) => row.id}
          renderMobileRow={(row) => (
            <div className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <div className="font-semibold">{row.label}</div>
                <div className="text-muted-foreground">
                  {t(`enums.subscriptionType.${row.subscriptionType}`)} ·{" "}
                  {t(`enums.subscriptionDuration.${row.subscriptionDuration}`)}
                </div>
              </div>
              <EnabledBadge isEnabled={row.isActive} />
            </div>
          )}
          emptyState={
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title={t("admin.settings.plans.empty.noPlans")}
              body=""
            />
          }
        />
      )}

      <AddPlanModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => createPlan.mutate(values, { onSuccess: () => setCreateOpen(false) })}
        isPending={createPlan.isPending}
      />

      <AlertDialog open={toggleRow !== null} onOpenChange={(open) => !open && setToggleRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                toggleRow?.isActive
                  ? "admin.settings.plans.toggleConfirm.disableTitle"
                  : "admin.settings.plans.toggleConfirm.enableTitle",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={togglePlan.isPending}
              onClick={() => {
                if (toggleRow) togglePlan.mutate(toggleRow.id);
                setToggleRow(null);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
