import { useEffect, useRef, useState } from "react";
import { Activity, Clock, Zap } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { useTranslation } from "@/hooks/useTranslation";

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

// StatsRow shows static marketing copy, not live data — there is no public statistics
// endpoint in the contract (codebase-map §8.Q1). The counters below are fixed, illustrative
// numbers; the count-up animation is kept as design.
export function StatsRow() {
  const { t } = useTranslation();
  const total = useCounter(247);
  const today = useCounter(15);
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="mb-6 text-center text-2xl font-bold text-foreground">{t("public.landing.stats.title")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard variant="centered" icon={<Activity className="h-6 w-6" />} value={`${total.val}+`} label={t("public.landing.stats.completed")} innerRef={total.ref} />
        <StatCard variant="centered" icon={<Zap className="h-6 w-6" />} value={today.val.toString()} label={t("public.landing.stats.today")} innerRef={today.ref} />
        <StatCard variant="centered" icon={<Clock className="h-6 w-6" />} value="3:24" label={t("public.landing.stats.avgTime")} />
      </div>
    </section>
  );
}
