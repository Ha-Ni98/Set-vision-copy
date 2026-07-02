import { Zap, Users, Store, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { StatsRow, type DashboardStatCardData } from "./components/StatsRow";
import { FrozenActivationsTable } from "./components/FrozenActivationsTable";
import { RecentActivationsTable } from "./components/RecentActivationsTable";
import { PendingActivationsTable } from "./components/PendingActivationsTable";

// Static region layout only — no hooks yet (wired in Sprint 4, plan.md §D1). Each region
// below is given a different placeholder state (loading / empty / error) purely so this
// sprint's "renders all three states, layout intact" goal is visible in one render; Sprint 4
// swaps each literal for its real query's isLoading/data/isError/refetch.
const STATIC_CARDS: DashboardStatCardData[] = [
  {
    key: "totalActivations",
    icon: <Zap className="h-5 w-5" />,
    labelKey: "admin.dashboard.stats.totalActivations.title",
    value: null,
    subLabelKey: "admin.dashboard.stats.totalActivations.subLabel",
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "totalActivators",
    icon: <Users className="h-5 w-5" />,
    labelKey: "admin.dashboard.stats.totalActivators.title",
    value: null,
    subLabelKey: "admin.dashboard.stats.totalActivators.subLabel",
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "totalDistributors",
    icon: <Store className="h-5 w-5" />,
    labelKey: "admin.dashboard.stats.totalDistributors.title",
    value: null,
    subLabelKey: "admin.dashboard.stats.totalDistributors.subLabel",
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "activeCards",
    icon: <CreditCard className="h-5 w-5" />,
    labelKey: "admin.dashboard.stats.activeCards.title",
    value: null,
    subLabelKey: "admin.dashboard.stats.activeCards.subLabel",
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
];

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.dashboard")} subtitle={t("admin.dashboard.subtitle")} />

      <StatsRow cards={STATIC_CARDS} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("admin.dashboard.frozen.title")}
        </h2>
        <FrozenActivationsTable
          isLoading
          isError={false}
          onRetry={() => {}}
          onActivate={() => {}}
          onCancel={() => {}}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("admin.dashboard.recent.title")}
        </h2>
        <RecentActivationsTable data={[]} isLoading={false} isError={false} onRetry={() => {}} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("admin.dashboard.pending.title")}
        </h2>
        <PendingActivationsTable isLoading={false} isError onRetry={() => {}} />
      </section>
    </div>
  );
}
