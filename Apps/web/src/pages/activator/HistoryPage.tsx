import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { ActivationStat } from "@my-app/contract";
import type {
  ActivatorHistoryItemDTO,
  RecentActivationDTO,
  GetActivatorHistoryQuery,
} from "@my-app/contract";
import { formatDZD, formatTime } from "@/lib/utils";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  KeyRound,
  Clock as ClockIcon,
  Coins,
  AlertTriangle,
  History as HistoryIcon,
  Zap,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyHistory } from "@/hooks/useMyHistory";
import { useRecentActivations } from "@/hooks/useRecentActivations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const STATUS_OPTIONS = Object.values(ActivationStat);
const PER_PAGE = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function HistoryPage() {
  const { t, language } = useTranslation();
  const [status, setStatus] = useState<"ALL" | ActivationStat>("ALL");
  const [sort, setSort] = useState<"NEW" | "OLD" | "EARN" | "FAST" | "SLOW">("NEW");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q);

  // Server-driven — page/limit/status/search/date-range go to the backend; sorting stays
  // client-side over whatever page comes back (§8.Q3) — GetActivatorHistoryQuery's `sortBy`
  // has no separate asc/desc direction field, only 4 column choices, so a client-side sort
  // over the current page is what's actually achievable against this contract shape.
  const query: GetActivatorHistoryQuery = useMemo(
    () => ({
      page,
      limit: PER_PAGE,
      status: status === "ALL" ? undefined : status,
      search: debouncedQ.trim() || undefined,
      dateFrom: toIsoDate(dateFrom),
      dateTo: toIsoDate(dateTo),
    }),
    [page, status, debouncedQ, dateFrom, dateTo],
  );

  const {
    data: recentData,
    isLoading: isLoadingRecent,
    isError: isErrorRecent,
    refetch: refetchRecent,
  } = useRecentActivations();
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    isError: isErrorHistory,
    refetch: refetchHistory,
  } = useMyHistory(query);

  const recentList = recentData ?? [];
  const meta = historyData?.meta ?? { page: 1, limit: PER_PAGE, total: 0, totalPages: 1 };

  const hasFilters =
    status !== "ALL" || q.trim().length > 0 || dateFrom.length > 0 || dateTo.length > 0;
  const clearFilters = () => {
    setStatus("ALL");
    setQ("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const sortedRows = useMemo(() => {
    const arr = [...(historyData?.items ?? [])];
    switch (sort) {
      case "OLD":
        return arr.reverse();
      case "EARN":
        return arr.sort((a, b) => (b.earning ?? 0) - (a.earning ?? 0));
      case "FAST":
        return arr.sort(
          (a, b) => (a.durationSeconds ?? Infinity) - (b.durationSeconds ?? Infinity),
        );
      case "SLOW":
        return arr.sort((a, b) => (b.durationSeconds ?? -1) - (a.durationSeconds ?? -1));
      default:
        return arr;
    }
  }, [historyData, sort]);

  const recentColumns: ColumnDef<RecentActivationDTO>[] = useMemo(
    () => [
      {
        id: "subscription",
        header: t("activator.history.recentTable.subscription"),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.subscriptionLabel}</span>
        ),
      },
      {
        id: "key",
        header: t("activator.history.recentTable.key"),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.keyMasked}</span>,
      },
      {
        id: "completed",
        header: t("activator.history.recentTable.completed"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(parseISO(row.original.completedAt), "MMM d, HH:mm")}
          </span>
        ),
      },
      {
        id: "status",
        header: t("activator.history.recentTable.status"),
        cell: ({ row }) => <StatusBadge status={row.original.state} />,
      },
    ],
    [t],
  );

  const historyColumns: ColumnDef<ActivatorHistoryItemDTO>[] = useMemo(
    () => [
      {
        id: "subscription",
        header: t("activator.history.myTable.subscription"),
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.subscriptionLabel}</span>
        ),
      },
      {
        id: "client",
        header: t("activator.history.myTable.client"),
        cell: ({ row }) => <span className="font-medium">{row.original.client.fullName}</span>,
      },
      {
        id: "phone",
        header: t("activator.history.myTable.phone"),
        cell: ({ row }) => (
          <a
            href={`tel:${row.original.client.phone}`}
            className="text-muted-foreground hover:text-primary hover:underline"
          >
            {row.original.client.phone}
          </a>
        ),
      },
      {
        id: "key",
        header: t("activator.history.myTable.key"),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.key}</span>,
      },
      {
        id: "status",
        header: t("activator.history.myTable.status"),
        cell: ({ row }) => <StatusBadge status={row.original.state} />,
      },
      {
        id: "time",
        header: t("activator.history.myTable.time"),
        cell: ({ row }) => (
          <span className="font-mono">
            {row.original.durationSeconds ? formatTime(row.original.durationSeconds) : "—"}
          </span>
        ),
      },
      {
        id: "earning",
        header: t("activator.history.myTable.earning"),
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.earning ? formatDZD(row.original.earning, language) : "—"}
          </span>
        ),
      },
    ],
    [t, language],
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          {t("activator.history.recentTitle")}
        </h2>
        {isErrorRecent ? (
          <NotFoundState
            icon={<AlertTriangle className="h-8 w-8" />}
            title={t("common.errors.crashTitle")}
            body={t("common.errors.crashBody")}
            action={<Button onClick={() => refetchRecent()}>{t("common.actions.tryAgain")}</Button>}
          />
        ) : isLoadingRecent ? (
          <TableSkeleton rows={5} columns={4} />
        ) : (
          <DataTable
            columns={recentColumns}
            data={recentList}
            getRowKey={(r) => r.id}
            renderMobileRow={(r) => (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-foreground">{r.subscriptionLabel}</div>
                  <StatusBadge status={r.state} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-mono text-foreground">{r.keyMasked}</span>
                  <span className="text-muted-foreground">
                    {format(parseISO(r.completedAt), "MMM d, HH:mm")}
                  </span>
                </div>
              </div>
            )}
            emptyState={
              <EmptyState
                icon={<HistoryIcon className="h-6 w-6" />}
                title={t("activator.history.recentEmpty")}
                body=""
              />
            }
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          {t("activator.history.myTitle")}
        </h2>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={t("activator.history.searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v: "ALL" | ActivationStat) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("activator.history.allStatus")}</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`enums.activationStat.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(v: "NEW" | "OLD" | "EARN" | "FAST" | "SLOW") => setSort(v)}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">{t("activator.history.sortNewest")}</SelectItem>
              <SelectItem value="OLD">{t("activator.history.sortOldest")}</SelectItem>
              <SelectItem value="EARN">{t("activator.history.sortEarning")}</SelectItem>
              <SelectItem value="FAST">{t("activator.history.sortFastest")}</SelectItem>
              <SelectItem value="SLOW">{t("activator.history.sortSlowest")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Input
              type="date"
              aria-label={t("activator.history.dateFrom")}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-0 min-w-0 flex-1 sm:w-40 sm:flex-none"
            />
            <span className="shrink-0 text-sm text-muted-foreground">
              {t("activator.history.dateTo")}
            </span>
            <Input
              type="date"
              aria-label={t("activator.history.dateTo")}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-0 min-w-0 flex-1 sm:w-40 sm:flex-none"
            />
          </div>
        </div>

        {isErrorHistory ? (
          <NotFoundState
            icon={<AlertTriangle className="h-8 w-8" />}
            title={t("common.errors.crashTitle")}
            body={t("common.errors.crashBody")}
            action={
              <Button onClick={() => refetchHistory()}>{t("common.actions.tryAgain")}</Button>
            }
          />
        ) : isLoadingHistory ? (
          <TableSkeleton rows={PER_PAGE} columns={7} />
        ) : (
          <DataTable
            columns={historyColumns}
            data={sortedRows}
            getRowKey={(r) => r.id}
            renderMobileRow={(r) => (
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">{r.subscriptionLabel}</div>
                  <StatusBadge status={r.state} />
                </div>
                <div className="text-sm">{r.client.fullName}</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {r.client.phone}
                  </div>
                  <div className="inline-flex items-center gap-1 font-mono">
                    <KeyRound className="h-3 w-3" /> {r.key.slice(-9)}
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />{" "}
                    {r.durationSeconds ? formatTime(r.durationSeconds) : "—"}
                  </div>
                  <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Coins className="h-3 w-3" /> {r.earning ? formatDZD(r.earning, language) : "—"}
                  </div>
                </div>
              </div>
            )}
            emptyState={
              hasFilters ? (
                <EmptyState
                  icon={<Search className="h-6 w-6" />}
                  title={t("activator.history.noMatch")}
                  body=""
                  decoration={
                    <Button variant="outline" onClick={clearFilters} className="mt-2">
                      {t("common.actions.clear")}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<Zap className="h-6 w-6" />}
                  title={t("activator.history.myEmpty")}
                  body=""
                  decoration={
                    <Button asChild variant="outline" className="mt-2">
                      <Link to="/requests">{t("activator.dashboard.goToRequests")}</Link>
                    </Button>
                  }
                />
              )
            }
          />
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("activator.history.recordCount", { count: meta.total })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> {t("common.actions.previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("activator.history.pageOf", { page: meta.page, total: meta.totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("common.actions.next")} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
