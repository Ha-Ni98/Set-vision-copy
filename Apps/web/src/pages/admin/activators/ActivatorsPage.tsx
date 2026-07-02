import { useState } from "react";
import { Users, UserCheck, Trophy, Wallet, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { ActivatorSearch } from "./components/ActivatorSearch";
import { ActivatorsTable } from "./components/ActivatorsTable";
import { CreateActivatorModal } from "./components/CreateActivatorModal";

// Static composition — no data hooks yet (wired in Sprint 5, plan.md §D2). Reuses the
// Dashboard's StatsRow directly (it's already a generic cards[] renderer) rather than
// building a near-duplicate ActivatorsStatsRow.
const STATIC_CARDS: DashboardStatCardData[] = [
  {
    key: "total",
    icon: <Users className="h-5 w-5" />,
    labelKey: "admin.activators.stats.total.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "online",
    icon: <UserCheck className="h-5 w-5" />,
    labelKey: "admin.activators.stats.online.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "successful",
    icon: <Trophy className="h-5 w-5" />,
    labelKey: "admin.activators.stats.successfulActivations.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "creditsOwed",
    icon: <Wallet className="h-5 w-5" />,
    labelKey: "admin.activators.stats.creditsOwed.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
];

export default function ActivatorsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t("admin.shell.nav.activators")} />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.activators.create.title")}
        </Button>
      </div>

      <StatsRow cards={STATIC_CARDS} />

      <ActivatorSearch value={search} onChange={setSearch} />

      <ActivatorsTable
        isLoading
        isError={false}
        onRetry={() => {}}
        hasSearch={search.length > 0}
        onClearSearch={() => setSearch("")}
        onToggle={() => {}}
        onDelete={() => {}}
        onRecordPayment={() => {}}
        onAddFirst={() => setCreateOpen(true)}
      />

      <CreateActivatorModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={() => setCreateOpen(false)}
      />
    </div>
  );
}
