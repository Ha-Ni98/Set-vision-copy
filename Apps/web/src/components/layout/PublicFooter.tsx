import { Logo } from "@/components/shared/Logo";
import { Facebook, Instagram, MessageCircle } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <Logo size={28} />
          <p className="text-xs text-muted-foreground">Marketing And Digital Services</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="#" aria-label="Facebook" className="rounded-full bg-primary-light p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"><Facebook className="h-4 w-4" /></a>
          <a href="#" aria-label="Instagram" className="rounded-full bg-primary-light p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"><Instagram className="h-4 w-4" /></a>
          <a href="#" aria-label="WhatsApp" className="rounded-full bg-primary-light p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"><MessageCircle className="h-4 w-4" /></a>
        </div>
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground sm:items-end">
          <div className="flex gap-3">
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
          </div>
          <span>© 2026 Setvision. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
