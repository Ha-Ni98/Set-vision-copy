import translations from "@/config/translations.json";

// "ar" is a real member of this union (not just a future TODO) so the client-portal's RTL
// plumbing (`dir = language === "ar" ? "rtl" : "ltr"`) type-checks today — but nothing yet
// sets `language` to "ar" (LanguageToggle only exposes EN/FR, `ar` copy stays `""`), so `dir`
// still resolves "ltr" in practice. Activating Arabic later is a copy-fill + toggle-expose
// step, not a type change (client-portal plan.md §B6, decision #1).
export type Language = "en" | "fr" | "ar";

export function dirForLanguage(language: Language): "ltr" | "rtl" {
  return language === "ar" ? "rtl" : "ltr";
}

type TranslationEntry = { en: string; fr: string; ar: string };
const values = translations as Record<string, TranslationEntry>;

const interpolate = (template: string, vars?: Record<string, string | number>): string => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
};

// Non-reactive — for non-component code only (e.g. toasts fired from lib/query-client.ts).
// Components must use the useTranslation hook so they re-render on language toggle.
export function translate(
  key: string,
  lang: Language,
  vars?: Record<string, string | number>,
): string {
  const entry = values[key];
  if (!entry) return key;
  return interpolate(entry[lang], vars);
}

// Reads the persisted language directly rather than via context — the non-reactive
// `translate()` escape hatch's companion, for the same non-component call sites
// (lib/query-client.ts, lib/realtime.ts).
export function getLanguage(): Language {
  const saved = typeof window !== "undefined" ? localStorage.getItem("sv_lang") : null;
  return saved === "fr" ? "fr" : "en";
}
