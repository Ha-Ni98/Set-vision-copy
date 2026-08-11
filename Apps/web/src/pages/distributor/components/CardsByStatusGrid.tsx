import { CardStat } from "@my-app/contract";
import type { DistributorDashboardDTO } from "@my-app/contract";
import { CardStatusBadge } from "@/components/shared/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";
import { countOf } from "@/lib/utils";

// Every CardStat, in lifecycle order — a status with 0 cards still renders its own tile
// (countOf treats a missing entry as 0), so the grid never silently drops a state.
const ORDERED_STATS = [
  CardStat.AT_DISTRIBUTOR,
  CardStat.ACTIVATION_PROGRESS,
  CardStat.ACTIVATED,
  CardStat.ACTIVATION_FAILED,
  CardStat.IN_LOT,
  CardStat.PRINTED,
  CardStat.IN_SET,
] as const;

export function CardsByStatusGrid({ data }: { data: DistributorDashboardDTO }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 font-semibold text-foreground">
        {t("distributor.dashboard.byStatusTitle")}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ORDERED_STATS.map((stat) => (
          <div
            key={stat}
            className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4"
          >
            <CardStatusBadge status={stat} />
            <span className="text-2xl font-extrabold text-foreground">
              {countOf(data.cardsByStat, stat)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
