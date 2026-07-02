import { Zap, ShieldCheck, Headphones } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const FEATURES = [
  { icon: <Zap className="h-5 w-5" />, titleKey: "public.landing.whoWeAre.fast.title", bodyKey: "public.landing.whoWeAre.fast.body" },
  { icon: <ShieldCheck className="h-5 w-5" />, titleKey: "public.landing.whoWeAre.secure.title", bodyKey: "public.landing.whoWeAre.secure.body" },
  { icon: <Headphones className="h-5 w-5" />, titleKey: "public.landing.whoWeAre.support.title", bodyKey: "public.landing.whoWeAre.support.body" },
];

export function WhoWeAre() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{t("public.landing.whoWeAre.title")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("public.landing.whoWeAre.body")}</p>
        <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-primary">{t("common.brand.tagline")}</p>
      </div>
      <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.titleKey} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">{f.icon}</div>
            <h3 className="font-semibold text-foreground">{t(f.titleKey)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(f.bodyKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
