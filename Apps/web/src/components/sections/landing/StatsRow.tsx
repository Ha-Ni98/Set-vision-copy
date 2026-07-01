import { useEffect, useRef, useState } from "react";
import { Activity, Clock, Zap } from "lucide-react";

function useCounter(target: number, durationMs = 1200) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current || started.current) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / durationMs);
            setVal(Math.floor(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(tick);
            else setVal(target);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, durationMs]);
  return { val, ref };
}

export function StatsRow() {
  const total = useCounter(247);
  const today = useCounter(15);
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="mb-6 text-center text-2xl font-bold text-foreground">Recent Activity</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card icon={<Activity className="h-6 w-6" />} value={`${total.val}+`} label="Activations Completed" innerRef={total.ref} />
        <Card icon={<Zap className="h-6 w-6" />} value={today.val.toString()} label="Activations Today" innerRef={today.ref} />
        <Card icon={<Clock className="h-6 w-6" />} value="3:24" label="Average Activation Time" />
      </div>
    </section>
  );
}

function Card({ icon, value, label, innerRef }: { icon: React.ReactNode; value: string; label: string; innerRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={innerRef} className="rounded-xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">{icon}</div>
      <div className="text-3xl font-extrabold text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
