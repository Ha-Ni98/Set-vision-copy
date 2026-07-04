import { Link } from "react-router-dom";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Instagram, MessageCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/useTranslation";
import { useActivation } from "@/components/providers/ActivationProvider";
import { SOCIAL_LINKS, LEGAL_LINKS } from "@/config/social-links";

export function PublicHeader() {
  const { t } = useTranslation();
  const { reset } = useActivation();
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" onClick={reset} className="flex items-center">
          <Logo size={36} />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <a
            href={SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label={t("common.social.instagram")}
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href={SOCIAL_LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label={t("common.social.whatsapp")}
          >
            <MessageCircle className="h-5 w-5" />
          </a>
          <span className="mx-2 h-6 w-px bg-border" />
          <a
            href={LEGAL_LINKS.terms}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("common.legal.terms")}
          </a>
          <a
            href={LEGAL_LINKS.privacy}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("common.legal.privacy")}
          </a>
          <LanguageToggle />
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("public.landing.shell.openMenu")}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            {/* Sheet's `side` prop only supports physical left/right (components/ui/sheet.tsx
                hardcodes left-0/right-0), not logical start/end — retrofitting that shared
                primitive for RTL is out of this portal-only sprint's scope; "right" is
                correct for the LTR-only operation this codebase actually ships today. */}
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-2">
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md p-3 hover:bg-accent"
                >
                  <Instagram className="h-5 w-5" /> {t("common.social.instagram")}
                </a>
                <a
                  href={SOCIAL_LINKS.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md p-3 hover:bg-accent"
                >
                  <MessageCircle className="h-5 w-5" /> {t("common.social.whatsapp")}
                </a>
                <a href={LEGAL_LINKS.terms} className="rounded-md p-3 hover:bg-accent">
                  {t("common.legal.terms")}
                </a>
                <a href={LEGAL_LINKS.privacy} className="rounded-md p-3 hover:bg-accent">
                  {t("common.legal.privacy")}
                </a>
                <div className="p-3">
                  <LanguageToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
