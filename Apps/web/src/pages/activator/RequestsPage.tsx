import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ActiveRequestDTO, PendingActivationDTO } from "@my-app/contract";
import { MOCK_ACTIVE_REQUESTS, MOCK_PENDING_POOL } from "@/lib/mock-data";
import { ActiveRequestCard } from "@/components/sections/activator/ActiveRequestCard";
import { LiveTimer } from "@/components/shared/LiveTimer";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequestCardSkeleton } from "@/components/shared/RequestCardSkeleton";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Zap, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

const ACTIVE_SLOTS_CAP = 3;

// isLoading*/isError* are hardcoded false this sprint — Sprint 4's useActiveRequests /
// usePendingActivations hooks drive them for real (two separate queries, two separate flags).
export default function RequestsPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<ActiveRequestDTO[]>(MOCK_ACTIVE_REQUESTS);
  const [pool, setPool] = useState<PendingActivationDTO[]>(MOCK_PENDING_POOL);
  const isLoadingActive = false;
  const isErrorActive = false;
  const isLoadingPending = false;
  const isErrorPending = false;

  const slotsUsed = active.length;

  const removeActive = (id: string) => setActive((a) => a.filter((x) => x.id !== id));
  const takeRequest = (id: string) => {
    toast.success(t("activator.requests.takenToast"));
    setPool((p) => p.filter((x) => x.id !== id));
  };

  const columns: ColumnDef<PendingActivationDTO, any>[] = [
    { id: "subscription", header: t("activator.requests.table.subscription"), cell: ({ row }) => <span className="font-medium text-foreground">{row.original.subscriptionLabel}</span> },
    { id: "key", header: t("activator.requests.table.key"), cell: ({ row }) => <span className="font-mono text-xs">{row.original.keyMasked}</span> },
    { id: "waiting", header: t("activator.requests.table.waiting"), cell: ({ row }) => <LiveTimer since={row.original.requestedAt} mode="wait" /> },
    {
      id: "action",
      header: t("common.actions.action"),
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" onClick={() => takeRequest(row.original.id)} disabled={slotsUsed >= ACTIVE_SLOTS_CAP}>
            <Zap className="mr-1 h-3.5 w-3.5" /> {t("common.actions.activate")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title={t("activator.requests.title")} subtitle={t("activator.requests.subtitle")} />

      <section>
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div>
            <div className="text-sm text-muted-foreground">{t("activator.requests.activeSlots")}</div>
            <div className="text-xl font-extrabold text-foreground">{t("activator.requests.slotsUsed", { used: slotsUsed, cap: ACTIVE_SLOTS_CAP })}</div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: ACTIVE_SLOTS_CAP }, (_, i) => (
              <div key={i} className={`h-3 w-3 rounded-full ${i < slotsUsed ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {isErrorActive ? (
          <NotFoundState icon={<AlertTriangle className="h-8 w-8" />} title={t("common.errors.crashTitle")} body={t("common.errors.crashBody")} />
        ) : isLoadingActive ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <RequestCardSkeleton />
            <RequestCardSkeleton />
          </div>
        ) : active.length === 0 ? (
          <EmptyState icon={<Zap className="h-8 w-8" />} title={t("activator.requests.emptyActive.title")} body={t("activator.requests.emptyActive.body")} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((req) => (
              <ActiveRequestCard key={req.id} req={req} onCompleted={removeActive} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t("activator.requests.pendingTitle")}</h2>
          {pool.length > 0 && (
            <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">{t("activator.requests.waitingCount", { count: pool.length })}</span>
          )}
        </div>

        {isErrorPending ? (
          <NotFoundState icon={<AlertTriangle className="h-8 w-8" />} title={t("common.errors.crashTitle")} body={t("common.errors.crashBody")} />
        ) : isLoadingPending ? (
          <TableSkeleton rows={4} columns={4} />
        ) : (
          <DataTable
            columns={columns}
            data={pool}
            getRowKey={(p) => p.id}
            renderMobileRow={(p) => (
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">{p.subscriptionLabel}</div>
                  <LiveTimer since={p.requestedAt} mode="wait" />
                </div>
                <div className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"><KeyRound className="h-3 w-3" /> {p.keyMasked}</div>
                <Button onClick={() => takeRequest(p.id)} disabled={slotsUsed >= ACTIVE_SLOTS_CAP} className="w-full"><Zap className="mr-1 h-4 w-4" /> {t("common.actions.activate")}</Button>
              </div>
            )}
            emptyState={
              <EmptyState
                icon={<span className="text-5xl">📭</span>}
                title={t("activator.requests.emptyPending.title")}
                body={t("activator.requests.emptyPending.body")}
                decoration={
                  <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-primary/50" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                  </div>
                }
              />
            }
          />
        )}
      </section>
    </div>
  );
}
