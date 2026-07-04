import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { formatDZD, formatTime } from "@/lib/utils";
import {
  ArrowUp,
  CheckCircle2,
  Clock,
  DollarSign,
  ArrowRight,
  AlertTriangle,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardSkeleton } from "@/components/shared/StatCardSkeleton";
import { ChartSkeleton } from "@/components/shared/ChartSkeleton";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyStats } from "@/hooks/useMyStats";
import { ACTIVE_SLOTS_CAP } from "@/config/constants";

export default function DashboardPage() {
  const { t, language } = useTranslation();
  const { data, isLoading, isError, refetch } = useMyStats();
  const max = data ? Math.max(...data.weekly.map((d) => d.count), 0) : 0;
  const avgGreen = (data?.avgActivationTimeSeconds ?? 0) < 300;
  const isNewActivator = data && data.totalActivations === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("activator.dashboard.title")}
        subtitle={t("activator.dashboard.subtitle")}
      />

      {isError ? (
        <NotFoundState
          icon={<AlertTriangle className="h-8 w-8" />}
          title={t("common.errors.crashTitle")}
          body={t("common.errors.crashBody")}
          action={<Button onClick={() => refetch()}>{t("common.actions.tryAgain")}</Button>}
        />
      ) : isLoading || !data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartSkeleton />
            <StatCardSkeleton />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label={t("activator.dashboard.totalEarnings")}
              value={formatDZD(data.totalEarnings, language)}
              trend={
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                  <ArrowUp className="h-3 w-3" />{" "}
                  {t("activator.dashboard.earningsTrend", { percent: data.earningsTrendPercent })}
                </span>
              }
            />
            <StatCard
              icon={<Wallet className="h-5 w-5" />}
              label={t("activator.dashboard.balanceOwed")}
              value={formatDZD(data.creditsBalance, language)}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label={t("activator.dashboard.totalActivations")}
              value={data.totalActivations.toString()}
              trend={
                <span className="text-xs text-muted-foreground">
                  {t("activator.dashboard.activationsToday", { count: data.activationsToday })}
                </span>
              }
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label={t("activator.dashboard.avgTime")}
              value={
                data.avgActivationTimeSeconds !== null
                  ? formatTime(data.avgActivationTimeSeconds)
                  : "—"
              }
              trend={
                <span
                  className={`text-xs font-medium ${avgGreen ? "text-success" : "text-warning"}`}
                >
                  {avgGreen
                    ? t("activator.dashboard.pacExcellent")
                    : t("activator.dashboard.paceAboveTarget")}
                </span>
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
              {isNewActivator ? (
                <EmptyState
                  icon={<Zap className="h-6 w-6" />}
                  title={t("activator.dashboard.emptyTitle")}
                  body={t("activator.dashboard.emptyBody")}
                  dashed={false}
                />
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">
                      {t("activator.dashboard.weeklyChart")}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {t("activator.dashboard.last7Days")}
                    </span>
                  </div>
                  <div className="flex h-48 items-end gap-3">
                    {data.weekly.map((d) => {
                      const h = max > 0 ? (d.count / max) * 100 : 0;
                      return (
                        <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                          <div className="relative flex w-full flex-1 items-end">
                            <div
                              className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary-hover transition-all hover:opacity-80"
                              style={{ height: `${h}%` }}
                              title={t("activator.dashboard.activationsCount", { count: d.count })}
                            />
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground">
                              {d.count}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(d.date), "EEE")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h2 className="mb-3 font-semibold text-foreground">
                {t("activator.dashboard.activeSlots")}
              </h2>
              <div className="mb-2 text-3xl font-extrabold text-foreground">
                {data.activeSlotsUsed}
                <span className="text-muted-foreground">/{ACTIVE_SLOTS_CAP}</span>
              </div>
              <div className="mb-5 flex gap-2">
                {Array.from({ length: ACTIVE_SLOTS_CAP }, (_, i) => (
                  <div
                    key={i}
                    className={`h-3 flex-1 rounded-full ${i < data.activeSlotsUsed ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
              {/* Emphasized (filled, not outline) for a brand-new activator with no activity yet
                  — plan.md D2's "emphasised quick action". */}
              <Button asChild variant={isNewActivator ? "default" : "outline"} className="w-full">
                <Link to="/requests">
                  {t("activator.dashboard.goToRequests")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
