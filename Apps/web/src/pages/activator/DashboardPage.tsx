import { Link } from "react-router-dom";
import { MOCK_STATS, formatDZD, formatTime } from "@/lib/mock-data";
import { ArrowUp, CheckCircle2, Clock, DollarSign, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const max = Math.max(...MOCK_STATS.weekly_chart.map((d) => d.count));
  const avgGreen = MOCK_STATS.avg_activation_time < 300;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your activator performance at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Earnings"
          value={formatDZD(MOCK_STATS.total_earnings)}
          trend={
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
              <ArrowUp className="h-3 w-3" /> {MOCK_STATS.earnings_trend}% this week
            </span>
          }
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Total Activations"
          value={MOCK_STATS.total_activations.toString()}
          trend={<span className="text-xs text-muted-foreground">+{MOCK_STATS.activations_today} today</span>}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg. Activation Time"
          value={formatTime(MOCK_STATS.avg_activation_time)}
          trend={<span className={`text-xs font-medium ${avgGreen ? "text-success" : "text-warning"}`}>{avgGreen ? "Excellent pace" : "Above target"}</span>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Weekly Activations</h2>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <div className="flex h-48 items-end gap-3">
            {MOCK_STATS.weekly_chart.map((d) => {
              const h = (d.count / max) * 100;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary-hover transition-all hover:opacity-80"
                      style={{ height: `${h}%` }}
                      title={`${d.count} activations`}
                    />
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground">{d.count}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-semibold text-foreground">Active Slots</h2>
          <div className="mb-2 text-3xl font-extrabold text-foreground">
            {MOCK_STATS.active_slots_used}<span className="text-muted-foreground">/3</span>
          </div>
          <div className="mb-5 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-full ${i < MOCK_STATS.active_slots_used ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/requests">Go to Active Requests <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">{icon}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-foreground">{value}</div>
      <div className="mt-2">{trend}</div>
    </div>
  );
}
