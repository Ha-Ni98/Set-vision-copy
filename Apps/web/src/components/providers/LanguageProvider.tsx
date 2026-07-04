import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { dirForLanguage, type Language } from "@/lib/i18n";

const Ctx = createContext<{
  language: Language;
  dir: "ltr" | "rtl";
  setLanguage: (l: Language) => void;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const dir = dirForLanguage(language);

  useEffect(() => {
    const saved = (typeof window !== "undefined" &&
      localStorage.getItem("sv_lang")) as Language | null;
    if (saved === "en" || saved === "fr") setLanguageState(saved);
  }, []);

  // Client-portal RTL-readiness (plan.md §B6, decision #1) — resolves "ltr" today since
  // nothing yet sets language to "ar"; this is the one line that needs to change to activate
  // Arabic later, everything else in the portal is already logical-CSS-safe by then.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.dir = dir;
  }, [dir]);

  const setLanguage = (l: Language) => {
    setLanguageState(l);
    if (typeof window !== "undefined") localStorage.setItem("sv_lang", l);
  };

  return <Ctx.Provider value={{ language, dir, setLanguage }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLanguage outside provider");
  return c;
}
