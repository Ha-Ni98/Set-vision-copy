import type { CommissionMatrixDTO } from "@my-app/contract";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { CommissionCell } from "./CommissionCell";

interface Props {
  data?: CommissionMatrixDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onCellSubmit: (subscriptionPlanId: string, commissionDurationId: string) => void;
  savingCellKey?: string | null;
  erroredCellKey?: string | null;
}

export function CommissionMatrixTab({
  data,
  isLoading,
  isError,
  onRetry,
  onCellSubmit,
  savingCellKey,
  erroredCellKey,
}: Props) {
  const { t } = useTranslation();

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
                        onSubmit={() => onCellSubmit(row.planId, cell.commissionDurationId)}
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
