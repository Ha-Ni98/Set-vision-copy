import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "@/lib/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "MM:SS" isn't locale-sensitive (unlike a formatted number), so this stays plain. Round to
// whole seconds first — the backend avg is a float (totalMs / n / 1000), so an un-rounded
// `seconds % 60` would render as e.g. "9.327…" instead of a zero-padded "09".
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const LOCALE_TAG: Record<Language, string> = { en: "en-US", fr: "fr-FR", ar: "ar-DZ" };

export function formatDZD(amount: number, language: Language = "en"): string {
  return `${new Intl.NumberFormat(LOCALE_TAG[language]).format(amount)} DZD`;
}

export function formatDateTime(iso: string, language: Language = "en"): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[language], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

// Browser-only file download (Blob + a throwaway anchor) — no server round-trip beyond
// whatever produced `blob` already, so this is just the local "save as" trigger.
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(filename: string, content: string): void {
  downloadBlob(filename, new Blob([content], { type: "text/plain;charset=utf-8" }));
}

// Stats with zero items are omitted from InventorySummaryDTO's arrays (contract comment) —
// consumers must treat a missing stat as 0, not undefined (plan.md §B3).
export function countOf<T extends string>(
  arr: { stat: T; count: number }[] | undefined,
  stat: T,
): number {
  return arr?.find((s) => s.stat === stat)?.count ?? 0;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

// "2 hours ago" — static (unlike LiveTimer, which ticks for a still-in-progress elapsed
// time); logs are an immutable past event, so re-rendering every second would be pointless.
export function formatRelativeTime(iso: string, language: Language = "en"): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAG[language], { numeric: "auto" });
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return rtf.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return rtf.format(Math.round(seconds), "second");
}
