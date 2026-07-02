import type { ReactNode } from "react";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardSkeleton } from "@/components/shared/StatCardSkeleton";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

// One card's already-derived view-model — StatsRow doesn't know (or need to know) which of
// the 3 summary hooks (plan.md §D1.1) a given card's data came from; that mapping is owned
// by whoever assembles this array (Sprint 4).
export interface DashboardStatCardData {
  key: string;
  icon: ReactNode;
  labelKey: string;
  value: string | null;
  /** Omit for cards with no sub-label (e.g. Activators/Distributors lists) — Dashboard's cards have one. */
  subLabelKey?: string;
  subLabelVars?: Record<string, string | number>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

interface Props {
  cards: DashboardStatCardData[];
}

export function StatsRow({ cards }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        if (card.isLoading) return <StatCardSkeleton key={card.key} />;

        if (card.isError) {
          return (
            <div
              key={card.key}
              className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <p className="text-sm text-muted-foreground">{t(card.labelKey)}</p>
              <p className="mt-2 text-sm text-destructive">{t("admin.dashboard.sectionError")}</p>
              <Button variant="link" className="mt-1 h-auto p-0 text-sm" onClick={card.onRetry}>
                {t("common.actions.tryAgain")}
              </Button>
            </div>
          );
        }

        return (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={t(card.labelKey)}
            value={card.value ?? "—"}
            trend={
              card.subLabelKey ? (
                <span className="text-xs text-muted-foreground">
                  {t(card.subLabelKey, card.subLabelVars)}
                </span>
              ) : undefined
            }
          />
        );
      })}
    </div>
  );
}
