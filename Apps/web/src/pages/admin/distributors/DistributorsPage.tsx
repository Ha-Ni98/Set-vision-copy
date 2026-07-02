import { useState } from "react";
import { Store, CheckCircle2, CreditCard, TrendingUp, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { DistributorsFilters } from "./components/DistributorsFilters";
import { DistributorsTable } from "./components/DistributorsTable";
import { CreateDistributorModal } from "./components/CreateDistributorModal";

// Static composition — no data hooks yet (wired in Sprint 4, plan.md §D4). Reuses the
// Dashboard's StatsRow directly, same reasoning as ActivatorsPage.
const STATIC_CARDS: DashboardStatCardData[] = [
  {
    key: "total",
    icon: <Store className="h-5 w-5" />,
    labelKey: "admin.distributors.stats.total.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "active",
    icon: <CheckCircle2 className="h-5 w-5" />,
    labelKey: "admin.distributors.stats.active.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "cardsInStock",
    icon: <CreditCard className="h-5 w-5" />,
    labelKey: "admin.distributors.stats.cardsInStock.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "activationsThisMonth",
    icon: <TrendingUp className="h-5 w-5" />,
    labelKey: "admin.distributors.stats.activationsThisMonth.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
];

export default function DistributorsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [wilayaId, setWilayaId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createWilayaId, setCreateWilayaId] = useState("");

  const hasFilters = search.length > 0 || wilayaId.length > 0 || communeId.length > 0;
  const clearFilters = () => {
    setSearch("");
    setWilayaId("");
    setCommuneId("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t("admin.shell.nav.distributors")} />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.distributors.create.title")}
        </Button>
      </div>

      <StatsRow cards={STATIC_CARDS} />

      <DistributorsFilters
        search={search}
        onSearchChange={setSearch}
        wilayaId={wilayaId}
        onWilayaChange={setWilayaId}
        communeId={communeId}
        onCommuneChange={setCommuneId}
        wilayasLoading
        wilayasError={false}
        communesLoading={false}
        communesError={false}
      />

      <DistributorsTable
        isLoading
        isError={false}
        onRetry={() => {}}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onToggle={() => {}}
        onDelete={() => {}}
        onAddFirst={() => setCreateOpen(true)}
      />

      <CreateDistributorModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={() => setCreateOpen(false)}
        wilayasLoading
        wilayasError={false}
        communesLoading={false}
        communesError={false}
        selectedWilayaId={createWilayaId}
        onWilayaChange={setCreateWilayaId}
      />
    </div>
  );
}
