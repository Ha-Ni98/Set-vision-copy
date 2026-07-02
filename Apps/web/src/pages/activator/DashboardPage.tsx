import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { MOCK_DASHBOARD, formatDZD, formatTime } from "@/lib/mock-data";
import { ArrowUp, CheckCircle2, Clock, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { useTranslation } from "@/hooks/useTranslation";

export default function DashboardPage() {
  const { t } = useTranslation();
  const max = Math.max(...MOCK_DASHBOARD.weekly.map((d) => d.count));
  const avgGreen = (MOCK_DASHBOARD.avgActivationTimeSeconds ?? 0) < 300;
  return (
    <div className="space-y-6">
      <PageHeader title={t("activator.dashboard.title")} subtitle={t("activator.dashboard.subtitle")} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label={t("activator.dashboard.totalEarnings")}
          value={formatDZD(MOCK_DASHBOARD.totalEarnings)}
          trend={
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
              <ArrowUp className="h-3 w-3" /> {t("activator.dashboard.earningsTrend", { percent: MOCK_DASHBOARD.earningsTrendPercent })}
            </span>
          }
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label={t("activator.dashboard.totalActivations")}
          value={MOCK_DASHBOARD.totalActivations.toString()}
          trend={<span className="text-xs text-muted-foreground">{t("activator.dashboard.activationsToday", { count: MOCK_DASHBOARD.activationsToday })}</span>}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label={t("activator.dashboard.avgTime")}
          value={MOCK_DASHBOARD.avgActivationTimeSeconds !== null ? formatTime(MOCK_DASHBOARD.avgActivationTimeSeconds) : "—"}
          trend={<span className={`text-xs font-medium ${avgGreen ? "text-success" : "text-warning"}`}>{avgGreen ? t("activator.dashboard.pacExcellent") : t("activator.dashboard.paceAboveTarget")}</span>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{t("activator.dashboard.weeklyChart")}</h2>
            <span className="text-xs text-muted-foreground">{t("activator.dashboard.last7Days")}</span>
          </div>
          <div className="flex h-48 items-end gap-3">
            {MOCK_DASHBOARD.weekly.map((d) => {
              const h = max > 0 ? (d.count / max) * 100 : 0;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary-hover transition-all hover:opacity-80"
                      style={{ height: `${h}%` }}
                      title={t("activator.dashboard.activationsCount", { count: d.count })}
                    />
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground">{d.count}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(parseISO(d.date), "EEE")}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-semibold text-foreground">{t("activator.dashboard.activeSlots")}</h2>
          <div className="mb-2 text-3xl font-extrabold text-foreground">
            {MOCK_DASHBOARD.activeSlotsUsed}<span className="text-muted-foreground">/3</span>
          </div>
          <div className="mb-5 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-full ${i < MOCK_DASHBOARD.activeSlotsUsed ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/requests">{t("activator.dashboard.goToRequests")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
