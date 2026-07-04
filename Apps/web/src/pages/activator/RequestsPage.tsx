import { useEffect, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { PendingActivationDTO } from "@my-app/contract";
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
import { useTranslation } from "@/hooks/useTranslation";
import { useActiveRequests } from "@/hooks/useActiveRequests";
import { usePendingActivations } from "@/hooks/usePendingActivations";
import { useTakeActivation } from "@/hooks/useTakeActivation";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { ACTIVE_SLOTS_CAP } from "@/config/constants";

const NEW_ROW_HIGHLIGHT_MS = 4000;

export default function RequestsPage() {
  const { t } = useTranslation();
  const {
    data: activeData,
    isLoading: isLoadingActive,
    isError: isErrorActive,
    refetch: refetchActive,
  } = useActiveRequests();
  const {
    data: pendingData,
    isLoading: isLoadingPending,
    isError: isErrorPending,
    refetch: refetchPending,
  } = usePendingActivations();
  const takeActivation = useTakeActivation();
  const { playChime } = useNotificationSound();

  const active = activeData ?? [];
  const pool = pendingData ?? [];
  const slotsUsed = active.length;

  // New-request chime/glow (spec line 260): diffed against the *previous* pending id set, not
  // fired on the very first load or on refetch churn where the set is unchanged (plan.md
  // Sprint 4 risk). The actual "purple glow" animation polish + reduced-motion handling is
  // Sprint 5's job (plan.md splits this explicitly) — this sprint owns the detection + a
  // functional highlight + the chime, gated by useNotificationSound's own mute check.
  const prevPendingIdsRef = useRef<Set<string> | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!pendingData) return;
    const currentIds = new Set(pendingData.map((p) => p.id));
    const prevIds = prevPendingIdsRef.current;
    if (prevIds) {
      const arrived = [...currentIds].filter((id) => !prevIds.has(id));
      if (arrived.length > 0) {
        playChime();
        setNewRowIds(new Set(arrived));
      }
    }
    prevPendingIdsRef.current = currentIds;
  }, [pendingData, playChime]);

  useEffect(() => {
    if (newRowIds.size === 0) return;
    const timer = setTimeout(() => setNewRowIds(new Set()), NEW_ROW_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [newRowIds]);

  const columns: ColumnDef<PendingActivationDTO>[] = [
    {
      id: "subscription",
      header: t("activator.requests.table.subscription"),
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.subscriptionLabel}</span>
      ),
    },
    {
      id: "key",
      header: t("activator.requests.table.key"),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.keyMasked}</span>,
    },
    {
      id: "waiting",
      header: t("activator.requests.table.waiting"),
      cell: ({ row }) => <LiveTimer since={row.original.requestedAt} mode="wait" />,
    },
    {
      id: "action",
      header: t("common.actions.action"),
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            size="sm"
            onClick={() => takeActivation.mutate(row.original.id)}
            disabled={slotsUsed >= ACTIVE_SLOTS_CAP || takeActivation.isPending}
          >
            <Zap className="mr-1 h-3.5 w-3.5" /> {t("common.actions.activate")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("activator.requests.title")}
        subtitle={t("activator.requests.subtitle")}
      />

      <section>
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div>
            <div className="text-sm text-muted-foreground">
              {t("activator.requests.activeSlots")}
            </div>
            <div className="text-xl font-extrabold text-foreground">
              {t("activator.requests.slotsUsed", { used: slotsUsed, cap: ACTIVE_SLOTS_CAP })}
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: ACTIVE_SLOTS_CAP }, (_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full ${i < slotsUsed ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {slotsUsed >= ACTIVE_SLOTS_CAP && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
            {t("activator.requests.slotsFullNotice")}
          </div>
        )}

        {isErrorActive ? (
          <NotFoundState
            icon={<AlertTriangle className="h-8 w-8" />}
            title={t("common.errors.crashTitle")}
            body={t("common.errors.crashBody")}
            action={<Button onClick={() => refetchActive()}>{t("common.actions.tryAgain")}</Button>}
          />
        ) : isLoadingActive ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <RequestCardSkeleton />
            <RequestCardSkeleton />
          </div>
        ) : active.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-8 w-8" />}
            title={t("activator.requests.emptyActive.title")}
            body={t("activator.requests.emptyActive.body")}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((req) => (
              <ActiveRequestCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("activator.requests.pendingTitle")}
          </h2>
          {pool.length > 0 && (
            <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
              {t("activator.requests.waitingCount", { count: pool.length })}
            </span>
          )}
        </div>

        {isErrorPending ? (
          <NotFoundState
            icon={<AlertTriangle className="h-8 w-8" />}
            title={t("common.errors.crashTitle")}
            body={t("common.errors.crashBody")}
            action={
              <Button onClick={() => refetchPending()}>{t("common.actions.tryAgain")}</Button>
            }
          />
        ) : isLoadingPending ? (
          <TableSkeleton rows={4} columns={4} />
        ) : (
          <DataTable
            columns={columns}
            data={pool}
            getRowKey={(p) => p.id}
            getRowClassName={(p) =>
              newRowIds.has(p.id)
                ? "bg-primary-light transition-colors duration-[3000ms]"
                : "transition-colors duration-[1000ms]"
            }
            renderMobileRow={(p) => (
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">{p.subscriptionLabel}</div>
                  <LiveTimer since={p.requestedAt} mode="wait" />
                </div>
                <div className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <KeyRound className="h-3 w-3" /> {p.keyMasked}
                </div>
                <Button
                  onClick={() => takeActivation.mutate(p.id)}
                  disabled={slotsUsed >= ACTIVE_SLOTS_CAP || takeActivation.isPending}
                  className="w-full"
                >
                  <Zap className="mr-1 h-4 w-4" /> {t("common.actions.activate")}
                </Button>
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
                      <span
                        key={i}
                        className="h-2 w-2 animate-pulse rounded-full bg-primary/50"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
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
