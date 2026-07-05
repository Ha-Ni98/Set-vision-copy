import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/components/providers/LanguageProvider";

// "ar" is a real (if not yet selectable) member of Language — see lib/i18n.ts — so this
// still needs an entry for Record<Language, string> to index safely; the toggle itself only
// ever offers EN/FR (client-portal plan.md §B6, decision #1: no AR option yet).
const LABEL: Record<"en" | "fr" | "ar", string> = { en: "EN", fr: "FR", ar: "AR" };

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground">
          {LABEL[language]} <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setLanguage("en")}>English</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage("fr")}>Français</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
