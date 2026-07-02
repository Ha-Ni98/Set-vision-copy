import translations from "@/config/translations.json";

export type Language = "en" | "fr";

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
export function translate(key: string, lang: Language, vars?: Record<string, string | number>): string {
  const entry = values[key];
  if (!entry) return key;
  return interpolate(entry[lang], vars);
}
