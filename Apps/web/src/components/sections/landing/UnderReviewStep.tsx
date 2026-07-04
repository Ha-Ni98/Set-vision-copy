import { Clock, MessageCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { SOCIAL_LINKS } from "@/config/social-links";

// Step 3's "B) Under review" view (client-portal plan.md D4) — the FREEZE-resolved status,
// read-only, live-updates when an admin resolves it (Sprint 4 wires the re-dispatch).
export function UnderReviewStep() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-warning/15 text-warning">
        <Clock className="h-14 w-14" strokeWidth={2} />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-foreground">{t("public.landing.review.title")}</h3>
        <p className="mt-3 text-muted-foreground">{t("public.landing.review.body")}</p>
      </div>
      <a
        href={SOCIAL_LINKS.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <MessageCircle className="h-4 w-4" /> {t("common.actions.contactWhatsapp")}
      </a>
    </div>
  );
}
