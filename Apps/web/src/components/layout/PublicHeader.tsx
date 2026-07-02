import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Instagram, MessageCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTranslation } from "@/hooks/useTranslation";

export function PublicHeader() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo size={36} />
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>
          <a href="#" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="WhatsApp"><MessageCircle className="h-5 w-5" /></a>
          <span className="mx-2 h-6 w-px bg-border" />
          <a href="#" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">{t("common.legal.terms")}</a>
          <a href="#" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">{t("common.legal.privacy")}</a>
          <LanguageToggle />
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-8 flex flex-col gap-2">
                <a href="#" className="flex items-center gap-3 rounded-md p-3 hover:bg-accent"><Instagram className="h-5 w-5" /> Instagram</a>
                <a href="#" className="flex items-center gap-3 rounded-md p-3 hover:bg-accent"><MessageCircle className="h-5 w-5" /> WhatsApp</a>
                <a href="#" className="rounded-md p-3 hover:bg-accent">{t("common.legal.terms")}</a>
                <a href="#" className="rounded-md p-3 hover:bg-accent">{t("common.legal.privacy")}</a>
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
