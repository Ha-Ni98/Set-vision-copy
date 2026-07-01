import { useState } from "react";
import { MOCK_ACTIVE_REQUESTS, MOCK_PENDING_POOL, ActiveRequest, PendingRequest } from "@/lib/mock-data";
import { ActiveRequestCard } from "@/components/sections/activator/ActiveRequestCard";
import { LiveTimer } from "@/components/shared/LiveTimer";
import { Button } from "@/components/ui/button";
import { Zap, Inbox, KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function RequestsPage() {
  const [active, setActive] = useState<ActiveRequest[]>(MOCK_ACTIVE_REQUESTS);
  const [pool, setPool] = useState<PendingRequest[]>(MOCK_PENDING_POOL);
  const [empty, setEmpty] = useState(false);

  const slotsUsed = active.length;
  const visiblePool = empty ? [] : pool;

  const removeActive = (id: string) => setActive((a) => a.filter((x) => x.id !== id));
  const takeRequest = (id: string) => {
    toast.success("Request taken!");
    setPool((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="relative space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Active Requests</h1>
        <p className="text-sm text-muted-foreground">Manage your in-progress activations.</p>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <div>
            <div className="text-sm text-muted-foreground">Active Slots</div>
            <div className="text-xl font-extrabold text-foreground">{slotsUsed} / 3 Used</div>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-3 w-3 rounded-full ${i < slotsUsed ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {active.length === 0 ? (
          <EmptyBox icon={<Zap className="h-8 w-8" />} title="No active requests" body="Take one from the pending pool below." />
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
          <h2 className="text-lg font-semibold text-foreground">Pending Requests</h2>
          {visiblePool.length > 0 && (
            <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">{visiblePool.length} waiting</span>
          )}
        </div>

        {visiblePool.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-[var(--shadow-card)]">
            <div className="text-5xl">📭</div>
            <h3 className="mt-3 font-semibold text-foreground">No pending requests right now.</h3>
            <p className="mt-1 text-sm text-muted-foreground">We'll notify you when one comes in!</p>
            <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-primary/50" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Key</th>
                    <th className="px-4 py-3">Waiting</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePool.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium text-foreground">{p.subscription}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.key_masked}</td>
                      <td className="px-4 py-3"><LiveTimer since={p.created_at} mode="wait" /></td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => takeRequest(p.id)} disabled={slotsUsed >= 3}>
                          <Zap className="mr-1 h-3.5 w-3.5" /> Activate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {visiblePool.map((p) => (
                <div key={p.id} className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground">{p.subscription}</div>
                    <LiveTimer since={p.created_at} mode="wait" />
                  </div>
                  <div className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"><KeyRound className="h-3 w-3" /> {p.key_masked}</div>
                  <Button onClick={() => takeRequest(p.id)} disabled={slotsUsed >= 3} className="w-full"><Zap className="mr-1 h-4 w-4" /> Activate</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <button
        onClick={() => setEmpty((e) => !e)}
        className="fixed bottom-4 left-4 z-40 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg opacity-70 hover:opacity-100"
      >
        {empty ? "Show Pending Pool" : "Toggle Empty State"}
      </button>
    </div>
  );
}

function EmptyBox({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">{icon}</div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
