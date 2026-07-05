import { useMemo } from "react";
import { Zap, Users, Store, CreditCard } from "lucide-react";
import { ActivationStat } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useActivationsSummary,
  useActivatorsSummary,
  useDistributorsSummary,
} from "@/hooks/useStatistics";
import {
  useAdminActivations,
  useActivateByAdmin,
  useCancelByAdmin,
} from "@/hooks/useAdminActivations";
import { useRecentActivations } from "@/hooks/useRecentActivations";
import { usePendingActivations } from "@/hooks/usePendingActivations";
import { StatsRow, type DashboardStatCardData } from "./components/StatsRow";
import { FrozenActivationsTable } from "./components/FrozenActivationsTable";
import { RecentActivationsTable } from "./components/RecentActivationsTable";
import { PendingActivationsTable } from "./components/PendingActivationsTable";

// Wired per plan.md §D1 / §F. Dashboard fidelity is intentionally reduced vs the raw spec —
// see plan.md §F for the full deviations ledger (no trend %, no frozen_since, reduced
// recent/pending columns) — not a Sprint 4 regression.
export default function DashboardPage() {
  const { t } = useTranslation();

  const activationsSummary = useActivationsSummary();
  const activatorsSummary = useActivatorsSummary();
  const distributorsSummary = useDistributorsSummary();
  const frozenQuery = useAdminActivations({ state: ActivationStat.FREEZE, limit: 50 });
  const recentQuery = useRecentActivations();
  const pendingQuery = usePendingActivations();
  const activateByAdmin = useActivateByAdmin();
  const cancelByAdmin = useCancelByAdmin();

  const completedCount = useMemo(() => {
    const byState = activationsSummary.data?.byState;
    if (!byState) return null;
    return byState
      .filter(
        (s) =>
          s.state === ActivationStat.ACTIVATED || s.state === ActivationStat.ACTIVATED_BY_ADMIN,
      )
      .reduce((sum, s) => sum + s.count, 0);
  }, [activationsSummary.data]);

  const cards: DashboardStatCardData[] = [
    {
      key: "totalActivations",
      icon: <Zap className="h-5 w-5" />,
      labelKey: "admin.dashboard.stats.totalActivations.title",
      value: completedCount !== null ? String(completedCount) : null,
      subLabelKey: "admin.dashboard.stats.totalActivations.subLabel",
      subLabelVars: { count: activationsSummary.data?.total.month ?? 0 },
      isLoading: activationsSummary.isLoading,
      isError: activationsSummary.isError,
      onRetry: activationsSummary.refetch,
    },
    {
      key: "totalActivators",
      icon: <Users className="h-5 w-5" />,
      labelKey: "admin.dashboard.stats.totalActivators.title",
      value: activatorsSummary.data ? String(activatorsSummary.data.totalActivators) : null,
      subLabelKey: "admin.dashboard.stats.totalActivators.subLabel",
      subLabelVars: { count: activatorsSummary.data?.onlineNow ?? 0 },
      isLoading: activatorsSummary.isLoading,
      isError: activatorsSummary.isError,
      onRetry: activatorsSummary.refetch,
    },
    {
      key: "totalDistributors",
      icon: <Store className="h-5 w-5" />,
      labelKey: "admin.dashboard.stats.totalDistributors.title",
      value: distributorsSummary.data ? String(distributorsSummary.data.totalDistributors) : null,
      subLabelKey: "admin.dashboard.stats.totalDistributors.subLabel",
      subLabelVars: { count: distributorsSummary.data?.activeWithStock ?? 0 },
      isLoading: distributorsSummary.isLoading,
      isError: distributorsSummary.isError,
      onRetry: distributorsSummary.refetch,
    },
    {
      key: "activeCards",
      icon: <CreditCard className="h-5 w-5" />,
      labelKey: "admin.dashboard.stats.activeCards.title",
      value: distributorsSummary.data ? String(distributorsSummary.data.totalCardsInStock) : null,
      subLabelKey: "admin.dashboard.stats.activeCards.subLabel",
      subLabelVars: { count: distributorsSummary.data?.activeWithStock ?? 0 },
      isLoading: distributorsSummary.isLoading,
      isError: distributorsSummary.isError,
      onRetry: distributorsSummary.refetch,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.dashboard")} subtitle={t("admin.dashboard.subtitle")} />

      <StatsRow cards={cards} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("admin.dashboard.frozen.title")}
        </h2>
        <FrozenActivationsTable
          data={frozenQuery.data?.items}
          isLoading={frozenQuery.isLoading}
          isError={frozenQuery.isError}
          onRetry={frozenQuery.refetch}
          onActivate={(id, command) => activateByAdmin.mutate({ id, command })}
          onCancel={(id) => cancelByAdmin.mutate(id)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("admin.dashboard.recent.title")}
        </h2>
        <RecentActivationsTable
          data={recentQuery.data}
          isLoading={recentQuery.isLoading}
          isError={recentQuery.isError}
          onRetry={recentQuery.refetch}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("admin.dashboard.pending.title")}
        </h2>
        <PendingActivationsTable
          data={pendingQuery.data}
          isLoading={pendingQuery.isLoading}
          isError={pendingQuery.isError}
          onRetry={pendingQuery.refetch}
        />
      </section>
    </div>
  );
}
