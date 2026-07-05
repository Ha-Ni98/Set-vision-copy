import { AlertCircle, MessageCircle, Phone } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { SOCIAL_LINKS } from "@/config/social-links";

// Split out of the old single CompletedStep (client-portal plan.md D4) — Activated and
// Failed are visually and semantically distinct completion-style cards, not one component
// branching internally.
export function FailedStep() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertCircle className="h-14 w-14" strokeWidth={2} />
      </div>
      <div>
        <h3 className="text-3xl font-bold text-foreground">{t("public.landing.failed.title")}</h3>
        <p className="mt-3 text-muted-foreground">{t("public.landing.failed.body")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={SOCIAL_LINKS.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <MessageCircle className="h-4 w-4" /> {t("common.actions.contactWhatsapp")}
        </a>
        <a
          href={SOCIAL_LINKS.callcenter}
          className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <Phone className="h-4 w-4" /> {t("common.actions.contactCallCenter")}
        </a>
      </div>
    </div>
  );
}
