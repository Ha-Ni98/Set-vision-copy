import { useEffect, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ActiveRequestDTO, PendingActivationDTO } from "@my-app/contract";
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

// Matches index.css's .animate-row-glow duration (3s) so the class is dropped right as the
// one-shot fade finishes, not a beat after.
const NEW_ROW_HIGHLIGHT_MS = 3000;
// Slightly longer than index.css's fade-out-up duration (0.35s) so the CSS animation always
// finishes before the card actually unmounts.
const CARD_EXIT_MS = 400;
// A stable (never-reallocated) fallback — `activeData ?? []` would otherwise hand
// useExitingActiveList's effect a brand-new array reference on every render whenever
// activeData is undefined (e.g. isError), and since that effect calls setState, a fresh
// dependency every render becomes an infinite render loop.
const EMPTY_ACTIVE: ActiveRequestDTO[] = [];

// A card leaving `active` (Activate/Cancel succeeded) still renders — with the exit class —
// for CARD_EXIT_MS after the query no longer contains it, so `.animate-fade-out` gets a chance
// to play instead of the card just vanishing the instant the list re-renders (plan.md Sprint 4
// risk: "coordinate so a removed card animates out cleanly"). No animation library added — the
// plan's own audit states "no new libraries" — this is plain state tracking.
function useExitingActiveList(active: ActiveRequestDTO[]) {
  const [displayed, setDisplayed] = useState<ActiveRequestDTO[]>(active);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDisplayed((prevDisplayed) => {
      const currentIds = new Set(active.map((r) => r.id));
      // Sourced from `active` (the fresh query data), not `prevDisplayed` — a card that's
      // still present must always show its latest fields. Filtering `prevDisplayed` instead
      // (matching only by id) silently kept every still-present card frozen on whatever data
      // it had at its last arrival: a client's correction, a new OTP, anything, never showed
      // up until the card left and re-entered this list, or a full page reload reseeded this
      // state from scratch (the exact "need a refresh to see updates" bug report).
      const stillThere = active.filter((r) => prevDisplayed.some((p) => p.id === r.id));
      const removed = prevDisplayed.filter((r) => !currentIds.has(r.id));
      const arrived = active.filter((r) => !prevDisplayed.some((p) => p.id === r.id));

      if (removed.length > 0) {
        setExitingIds((prev) => new Set([...prev, ...removed.map((r) => r.id)]));
        removed.forEach((r) => {
          setTimeout(() => {
            setDisplayed((cur) => cur.filter((c) => c.id !== r.id));
            setExitingIds((prev) => {
              const next = new Set(prev);
              next.delete(r.id);
              return next;
            });
          }, CARD_EXIT_MS);
        });
      }
      return [...stillThere, ...removed, ...arrived];
    });
  }, [active]);

  return { displayed, isExiting: (id: string) => exitingIds.has(id) };
}

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

  const active = activeData ?? EMPTY_ACTIVE;
  const pool = pendingData ?? [];
  const slotsUsed = active.length;
  const { displayed: displayedActive, isExiting } = useExitingActiveList(active);

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
        ) : displayedActive.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-8 w-8" />}
            title={t("activator.requests.emptyActive.title")}
            body={t("activator.requests.emptyActive.body")}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {displayedActive.map((req) => (
              <ActiveRequestCard key={req.id} req={req} exiting={isExiting(req.id)} />
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
            getRowClassName={(p) => (newRowIds.has(p.id) ? "animate-row-glow" : undefined)}
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
                  className="h-11 w-full"
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
