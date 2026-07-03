import { useState } from "react";
import { Store, CheckCircle2, CreditCard, TrendingUp, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useDistributorsSummary } from "@/hooks/useStatistics";
import {
  useDistributors,
  useCreateDistributor,
  useToggleDistributor,
  useDeleteDistributor,
} from "@/hooks/useDistributors";
import { useWilayas, useCommunes } from "@/hooks/useGeography";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { DistributorsFilters } from "./components/DistributorsFilters";
import { DistributorsTable } from "./components/DistributorsTable";
import { CreateDistributorModal } from "./components/CreateDistributorModal";

const LIMIT = 10;

export default function DistributorsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [wilayaId, setWilayaId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createWilayaId, setCreateWilayaId] = useState("");

  const summary = useDistributorsSummary();
  const distributorsQuery = useDistributors({
    page,
    limit: LIMIT,
    search: search || undefined,
    wilayaId: wilayaId || undefined,
    communeId: communeId || undefined,
  });
  const wilayasQuery = useWilayas();
  const communesQuery = useCommunes(wilayaId);
  const createWilayasQuery = useWilayas();
  const createCommunesQuery = useCommunes(createWilayaId);

  const createDistributor = useCreateDistributor();
  const toggleDistributor = useToggleDistributor();
  const deleteDistributor = useDeleteDistributor();

  const hasFilters = search.length > 0 || wilayaId.length > 0 || communeId.length > 0;
  const clearFilters = () => {
    setSearch("");
    setWilayaId("");
    setCommuneId("");
    setPage(1);
  };

  const cards: DashboardStatCardData[] = [
    {
      key: "total",
      icon: <Store className="h-5 w-5" />,
      labelKey: "admin.distributors.stats.total.title",
      value: summary.data ? String(summary.data.totalDistributors) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "active",
      icon: <CheckCircle2 className="h-5 w-5" />,
      labelKey: "admin.distributors.stats.active.title",
      value: summary.data ? String(summary.data.activeWithStock) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "cardsInStock",
      icon: <CreditCard className="h-5 w-5" />,
      labelKey: "admin.distributors.stats.cardsInStock.title",
      value: summary.data ? String(summary.data.totalCardsInStock) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "activationsThisMonth",
      icon: <TrendingUp className="h-5 w-5" />,
      labelKey: "admin.distributors.stats.activationsThisMonth.title",
      value: summary.data ? String(summary.data.activationsThisMonth) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t("admin.shell.nav.distributors")} />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.distributors.create.title")}
        </Button>
      </div>

      <StatsRow cards={cards} />

      <DistributorsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        wilayaId={wilayaId}
        onWilayaChange={(id) => {
          setWilayaId(id);
          setCommuneId("");
          setPage(1);
        }}
        communeId={communeId}
        onCommuneChange={(id) => {
          setCommuneId(id);
          setPage(1);
        }}
        wilayas={wilayasQuery.data}
        wilayasLoading={wilayasQuery.isLoading}
        wilayasError={wilayasQuery.isError}
        communes={communesQuery.data}
        communesLoading={communesQuery.isLoading}
        communesError={communesQuery.isError}
      />

      <DistributorsTable
        data={distributorsQuery.data?.items}
        isLoading={distributorsQuery.isLoading}
        isError={distributorsQuery.isError}
        onRetry={distributorsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onToggle={(d) => toggleDistributor.mutate(d.id)}
        onDelete={(d) => deleteDistributor.mutate(d.id)}
        onAddFirst={() => setCreateOpen(true)}
      />

      {distributorsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={distributorsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <CreateDistributorModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => {
          createDistributor.mutate(values, {
            onSuccess: () => {
              setCreateOpen(false);
              setCreateWilayaId("");
            },
          });
        }}
        isPending={createDistributor.isPending}
        wilayas={createWilayasQuery.data}
        wilayasLoading={createWilayasQuery.isLoading}
        wilayasError={createWilayasQuery.isError}
        communes={createCommunesQuery.data}
        communesLoading={createCommunesQuery.isLoading}
        communesError={createCommunesQuery.isError}
        selectedWilayaId={createWilayaId}
        onWilayaChange={setCreateWilayaId}
      />
    </div>
  );
}
