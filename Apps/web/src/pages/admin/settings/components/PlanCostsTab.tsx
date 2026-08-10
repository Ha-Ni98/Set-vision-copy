import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SubscriptionPlanCostDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EnabledBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { usePlanCosts, useUpdatePlanCost } from "@/hooks/useSubscriptionPlans";
import { PlanCostCell } from "./PlanCostCell";

// Self-contained (Set 9 plan §5.2) — a list, not a matrix (one value column, unlike
// CommissionMatrixTab's tier axis), so it follows SubscriptionPlansTab's DataTable shape
// instead of CommissionMatrixTab's raw <table>. Lists ALL plans, including inactive ones
// (Set 9 plan §7 Q1) — an inactive plan can still have completed activations against it.
export function PlanCostsTab() {
  const { t } = useTranslation();
  const costsQuery = usePlanCosts();
  const updateCost = useUpdatePlanCost();
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [erroredPlanId, setErroredPlanId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<SubscriptionPlanCostDTO>[]>(
    () => [
      { accessorKey: "planLabel", header: t("admin.settings.planCosts.table.plan") },
      {
        id: "status",
        header: t("admin.settings.plans.table.status"),
        cell: ({ row }) => <EnabledBadge isEnabled={row.original.isActive} />,
      },
      {
        id: "cost",
        header: t("admin.settings.planCosts.table.cost"),
        cell: ({ row }) => {
          const plan = row.original;
          return (
            <PlanCostCell
              cost={plan.cost}
              isSaving={savingPlanId === plan.subscriptionPlanId}
              hasError={erroredPlanId === plan.subscriptionPlanId}
              onSubmit={(values) => {
                setSavingPlanId(plan.subscriptionPlanId);
                setErroredPlanId(null);
                updateCost.mutate(
                  { subscriptionPlanId: plan.subscriptionPlanId, cost: values.cost },
                  {
                    onSuccess: () => setSavingPlanId(null),
                    onError: () => {
                      setSavingPlanId(null);
                      setErroredPlanId(plan.subscriptionPlanId);
                    },
                  },
                );
              }}
            />
          );
        },
      },
    ],
    [t, savingPlanId, erroredPlanId, updateCost],
  );

  if (costsQuery.isLoading) return <TableSkeleton rows={4} columns={3} />;
  if (costsQuery.isError) {
    return (
      <NotFoundState
        title={t("admin.dashboard.sectionError")}
        body={t("admin.dashboard.sectionErrorBody")}
        action={
          <Button onClick={() => costsQuery.refetch()}>{t("common.actions.tryAgain")}</Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("admin.settings.planCosts.note")}</p>
      <DataTable
        columns={columns}
        data={costsQuery.data ?? []}
        getRowKey={(row) => row.subscriptionPlanId}
        renderMobileRow={(row) => (
          <div className="flex items-center justify-between gap-3 p-4 text-sm">
            <div>
              <div className="font-semibold">{row.planLabel}</div>
              <div className="text-muted-foreground">
                {row.cost != null ? row.cost.toFixed(2) : "—"}
              </div>
            </div>
            <EnabledBadge isEnabled={row.isActive} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title={t("admin.settings.planCosts.empty.noPlans")}
            body=""
          />
        }
      />
    </div>
  );
}
