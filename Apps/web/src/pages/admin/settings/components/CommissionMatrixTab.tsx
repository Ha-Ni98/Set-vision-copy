import { useState } from "react";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useCommissions, useUpdateCommission } from "@/hooks/useSubscriptionPlans";
import { CommissionCell } from "./CommissionCell";

// Self-contained (Part-3 modal/heatmap convention) — `useCommissions()` already embeds the
// tier headers in its own response (`CommissionMatrixDTO.tiers`), so a separate
// `useCommissionDurations()` call isn't needed here after all.
export function CommissionMatrixTab() {
  const { t } = useTranslation();
  const commissionsQuery = useCommissions();
  const updateCommission = useUpdateCommission();
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [erroredCellKey, setErroredCellKey] = useState<string | null>(null);

  if (commissionsQuery.isLoading) return <TableSkeleton rows={4} columns={5} />;
  if (commissionsQuery.isError) {
    return (
      <NotFoundState
        title={t("admin.dashboard.sectionError")}
        body={t("admin.dashboard.sectionErrorBody")}
        action={
          <Button onClick={() => commissionsQuery.refetch()}>{t("common.actions.tryAgain")}</Button>
        }
      />
    );
  }

  const data = commissionsQuery.data;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("admin.settings.commission.note")}</p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">{t("admin.settings.plans.table.label")}</th>
              {(data?.tiers ?? []).map((tier) => (
                <th key={tier.id} className="p-3">
                  {tier.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(data?.rows ?? []).map((row) => (
              <tr key={row.planId}>
                <td className="p-3 font-medium text-foreground">{row.planLabel}</td>
                {row.cells.map((cell) => {
                  const key = `${row.planId}:${cell.commissionDurationId}`;
                  return (
                    <td key={cell.commissionDurationId} className="p-1">
                      <CommissionCell
                        commission={cell.commission}
                        isSaving={savingCellKey === key}
                        hasError={erroredCellKey === key}
                        onSubmit={(values) => {
                          setSavingCellKey(key);
                          setErroredCellKey(null);
                          updateCommission.mutate(
                            {
                              subscriptionPlanId: row.planId,
                              commissionDurationId: cell.commissionDurationId,
                              commission: values.commission,
                            },
                            {
                              onSuccess: () => setSavingCellKey(null),
                              onError: () => {
                                setSavingCellKey(null);
                                setErroredCellKey(key);
                              },
                            },
                          );
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
