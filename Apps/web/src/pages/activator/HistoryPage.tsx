import { useMemo, useState } from "react";
import {
  MOCK_GLOBAL_RECENT, MOCK_PERSONAL_HISTORY, formatDZD, formatTime, HistoryStatus, PersonalHistoryRow,
} from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Phone, KeyRound, Clock as ClockIcon, Coins } from "lucide-react";

const STATUS_LABEL: Record<HistoryStatus, string> = {
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  INFORMATION_ERROR: "Information Error",
  ACTIVATION_ERROR: "Activation Error",
};

function StatusBadge({ s }: { s: HistoryStatus }) {
  const cls =
    s === "COMPLETED" ? "bg-success/15 text-success" :
    s === "CANCELLED" ? "bg-muted text-muted-foreground" :
    s === "INFORMATION_ERROR" ? "bg-destructive/15 text-destructive" :
    "bg-warning/20 text-warning-foreground";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>● {STATUS_LABEL[s]}</span>;
}

export default function HistoryPage() {
  const [status, setStatus] = useState<"ALL" | HistoryStatus>("ALL");
  const [sort, setSort] = useState<"NEW" | "OLD" | "EARN">("NEW");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    let arr: PersonalHistoryRow[] = [...MOCK_PERSONAL_HISTORY];
    if (status !== "ALL") arr = arr.filter((r) => r.status === status);
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter((r) =>
        r.client.toLowerCase().includes(s) ||
        r.key.toLowerCase().includes(s) ||
        r.phone.includes(s) ||
        r.subscription.toLowerCase().includes(s)
      );
    }
    if (sort === "NEW") {/* keep insertion */}
    else if (sort === "OLD") arr = arr.reverse();
    else if (sort === "EARN") arr = arr.sort((a, b) => b.earning - a.earning);
    return arr;
  }, [status, sort, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Recent Team Activations</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Activator</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_GLOBAL_RECENT.map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium text-foreground">{r.activator}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.subscription}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.key}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-border md:hidden">
            {MOCK_GLOBAL_RECENT.map((r, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-foreground">{r.activator}</div>
                  <div className="text-xs text-muted-foreground">{r.subscription}</div>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-mono text-foreground">{r.key}</span>
                  <span className="text-muted-foreground">{r.email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">My Activation History</h2>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search client, key, phone..." className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v: any) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="INFORMATION_ERROR">Information Error</SelectItem>
              <SelectItem value="ACTIVATION_ERROR">Activation Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">Newest First</SelectItem>
              <SelectItem value="OLD">Oldest First</SelectItem>
              <SelectItem value="EARN">Highest Earning</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3 text-right">Earning</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.key} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3 text-foreground">{r.subscription}</td>
                    <td className="px-4 py-3 font-medium">{r.client}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.key}</td>
                    <td className="px-4 py-3"><StatusBadge s={r.status} /></td>
                    <td className="px-4 py-3 font-mono">{r.time ? formatTime(r.time) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{r.earning ? formatDZD(r.earning) : "—"}</td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No records match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {pageRows.map((r) => (
              <div key={r.key} className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">{r.subscription}</div>
                  <StatusBadge s={r.status} />
                </div>
                <div className="text-sm">{r.client}</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</div>
                  <div className="inline-flex items-center gap-1 font-mono"><KeyRound className="h-3 w-3" /> {r.key.slice(-9)}</div>
                  <div className="inline-flex items-center gap-1"><ClockIcon className="h-3 w-3" /> {r.time ? formatTime(r.time) : "—"}</div>
                  <div className="inline-flex items-center gap-1 font-semibold text-foreground"><Coins className="h-3 w-3" /> {r.earning ? formatDZD(r.earning) : "—"}</div>
                </div>
              </div>
            ))}
            {pageRows.length === 0 && <div className="p-8 text-center text-muted-foreground">No records match your filters.</div>}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 && "s"}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
