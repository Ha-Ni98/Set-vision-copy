import { MessageCircle, Phone } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { SUPPORT_CONTACT } from "@/config/social-links";

// Shown once a valid card key is accepted, on every step except Finish (set-12-plan §2).
// Static block, never fixed/sticky — it can never overlap an input at any width. Copy is
// Darija (RTL) + French, both naming the call number and the (different) WhatsApp number
// explicitly, stored in translations.json with the SAME string under en/fr (§2.2 predicate
// lives in LandingPage; this component owns rendering only).
export function SupportBanner() {
  const { t } = useTranslation();
  const vars = {
    phone: SUPPORT_CONTACT.callDisplay.replaceAll(" ", "\u00A0"),
    whatsappPhone: SUPPORT_CONTACT.whatsappDisplay.replaceAll(" ", "\u00A0"),
  };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="space-y-1.5 break-words">
        <p dir="rtl" lang="ar" className="text-sm text-foreground">
          {t("public.landing.support.lineDarija", vars)}
        </p>
        <p dir="ltr" lang="fr" className="text-sm text-muted-foreground">
          {t("public.landing.support.lineFrench", vars)}
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <a
          href={SUPPORT_CONTACT.callHref}
          aria-label={t("public.landing.support.callAria", vars)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent sm:w-auto"
        >
          <Phone className="h-4 w-4 shrink-0" />
          {t("public.landing.support.callAction", vars)}
        </a>
        <a
          href={SUPPORT_CONTACT.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("public.landing.support.whatsappAria", vars)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-light px-4 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground sm:w-auto"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          {t("common.social.whatsapp")} · {t("public.landing.support.whatsappAction", vars)}
        </a>
      </div>
    </div>
  );
}
