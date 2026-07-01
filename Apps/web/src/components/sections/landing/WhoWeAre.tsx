import { Zap, ShieldCheck, Headphones } from "lucide-react";

export function WhoWeAre() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Who We Are</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Setvision is a marketing and digital services company helping clients across Algeria activate premium digital subscriptions safely, quickly, and reliably.
        </p>
        <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-primary">Marketing And Digital Services</p>
      </div>
      <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
        {[
          { i: <Zap className="h-5 w-5" />, t: "Fast Activation", d: "Most activations done in under 5 minutes." },
          { i: <ShieldCheck className="h-5 w-5" />, t: "Secure", d: "Your data is never stored after activation." },
          { i: <Headphones className="h-5 w-5" />, t: "24/7 Support", d: "Reach us anytime via WhatsApp." },
        ].map((it) => (
          <div key={it.t} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">{it.i}</div>
            <h3 className="font-semibold text-foreground">{it.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
