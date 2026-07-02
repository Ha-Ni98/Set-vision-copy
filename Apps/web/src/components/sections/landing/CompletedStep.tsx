import { Check, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function CompletedStep({ username }: { username?: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-success animate-pop-in">
        <Check className="h-14 w-14 text-success-foreground" strokeWidth={3} />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-foreground">{t("public.landing.completed.title")}</h3>
        <p className="mt-3 text-muted-foreground">{t("public.landing.completed.body")}</p>
      </div>
      {username && (
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-sm font-medium text-primary">
          {t("public.landing.completed.account", { username })}
        </div>
      )}
      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-left text-sm text-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <span>{t("public.landing.completed.securityNotice")}</span>
      </div>
    </div>
  );
}
