import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Language } from "@/lib/i18n";

const Ctx = createContext<{ language: Language; setLanguage: (l: Language) => void } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("sv_lang")) as Language | null;
    if (saved === "en" || saved === "fr") setLanguageState(saved);
  }, []);

  const setLanguage = (l: Language) => {
    setLanguageState(l);
    if (typeof window !== "undefined") localStorage.setItem("sv_lang", l);
  };

  return <Ctx.Provider value={{ language, setLanguage }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLanguage outside provider");
  return c;
}
