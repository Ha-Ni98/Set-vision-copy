import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "@/lib/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "M:SS" isn't locale-sensitive (unlike a formatted number), so this stays plain.
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const NUMBER_LOCALE: Record<Language, string> = { en: "en-US", fr: "fr-FR" };

export function formatDZD(amount: number, language: Language = "en"): string {
  return `${new Intl.NumberFormat(NUMBER_LOCALE[language]).format(amount)} DZD`;
}
