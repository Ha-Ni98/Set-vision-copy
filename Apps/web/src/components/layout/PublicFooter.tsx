import { Logo } from "@/components/shared/Logo";
import { Facebook, Instagram, MessageCircle, Phone } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { SOCIAL_LINKS, LEGAL_LINKS } from "@/config/social-links";

export function PublicFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <Logo size={28} />
          <p className="text-xs text-muted-foreground">{t("common.brand.tagline")}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={SOCIAL_LINKS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("common.social.facebook")}
            className="rounded-full bg-primary-light p-3.5 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href={SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("common.social.instagram")}
            className="rounded-full bg-primary-light p-3.5 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href={SOCIAL_LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("common.social.whatsapp")}
            className="rounded-full bg-primary-light p-3.5 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <a
            href={SOCIAL_LINKS.callcenter}
            aria-label={t("common.social.callcenter")}
            className="rounded-full bg-primary-light p-3.5 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Phone className="h-4 w-4" />
          </a>
        </div>
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground sm:items-end">
          <div className="flex gap-3">
            <a href={LEGAL_LINKS.terms} className="hover:text-foreground">
              {t("common.legal.terms")}
            </a>
            <a href={LEGAL_LINKS.privacy} className="hover:text-foreground">
              {t("common.legal.privacy")}
            </a>
          </div>
          <span>{t("common.legal.copyright", { year: new Date().getFullYear() })}</span>
        </div>
      </div>
    </footer>
  );
}
