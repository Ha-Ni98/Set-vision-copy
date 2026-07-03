import { useState } from "react";
import { Users, UserCheck, Trophy, Wallet, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useActivatorsSummary } from "@/hooks/useStatistics";
import {
  useActivators,
  useCreateActivator,
  useToggleActivator,
  useDeleteActivator,
} from "@/hooks/useActivators";
import { useRecordPayment } from "@/hooks/usePayments";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { ActivatorSearch } from "./components/ActivatorSearch";
import { ActivatorsTable } from "./components/ActivatorsTable";
import { CreateActivatorModal } from "./components/CreateActivatorModal";

const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;

export default function ActivatorsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const summary = useActivatorsSummary();
  const activatorsQuery = useActivators({ page, limit, search: debouncedSearch || undefined });
  const createActivator = useCreateActivator();
  const toggleActivator = useToggleActivator();
  const deleteActivator = useDeleteActivator();
  const recordPayment = useRecordPayment();

  const cards: DashboardStatCardData[] = [
    {
      key: "total",
      icon: <Users className="h-5 w-5" />,
      labelKey: "admin.activators.stats.total.title",
      value: summary.data ? String(summary.data.totalActivators) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "online",
      icon: <UserCheck className="h-5 w-5" />,
      labelKey: "admin.activators.stats.online.title",
      value: summary.data ? String(summary.data.onlineNow) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "successful",
      icon: <Trophy className="h-5 w-5" />,
      labelKey: "admin.activators.stats.successfulActivations.title",
      value: summary.data ? String(summary.data.totalSuccessful) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "creditsOwed",
      icon: <Wallet className="h-5 w-5" />,
      labelKey: "admin.activators.stats.creditsOwed.title",
      value: summary.data ? String(summary.data.totalCreditsOwed) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t("admin.shell.nav.activators")} />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.activators.create.title")}
        </Button>
      </div>

      <StatsRow cards={cards} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ActivatorSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <Select
          value={String(limit)}
          onValueChange={(v) => {
            setLimit(Number(v));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ActivatorsTable
        data={activatorsQuery.data?.items}
        isLoading={activatorsQuery.isLoading}
        isError={activatorsQuery.isError}
        onRetry={activatorsQuery.refetch}
        hasSearch={search.length > 0}
        onClearSearch={() => setSearch("")}
        onToggle={(a) => toggleActivator.mutate(a.id)}
        onDelete={(a) => deleteActivator.mutate(a.id)}
        onRecordPayment={(activatorId, values) =>
          recordPayment.mutate({
            activatorId,
            amount: values.amount,
            date: values.date ? new Date(values.date).toISOString() : undefined,
          })
        }
        isRecordingPayment={recordPayment.isPending}
        onAddFirst={() => setCreateOpen(true)}
      />

      {activatorsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={activatorsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <CreateActivatorModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setGeneratedPassword(null);
        }}
        onSubmit={(values) =>
          createActivator.mutate(values, {
            onSuccess: (data) => setGeneratedPassword(data.generatedPassword),
          })
        }
        isPending={createActivator.isPending}
        generatedPassword={generatedPassword}
      />
    </div>
  );
}
