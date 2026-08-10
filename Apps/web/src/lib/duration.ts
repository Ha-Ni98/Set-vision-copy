// Backend twin: Apps/api/src/common/utils/duration.utils.ts (Set 6 §6.3) — byte-for-byte port
// for use in Telegram message bodies. Keep both in sync; neither may drift from the other.

// U+2014 EM DASH — punctuation, not copy. Not a translation key.
export const DURATION_EMPTY = "—";

function pad(n: number, width = 2): string {
  return n.toString().padStart(width, "0");
}

// Fixed-width technical readout, byte-identical across languages — no Intl, no locale.
// < 60min -> mm:ss, < 24h -> hh:mm:ss, >= 24h -> dd:hh:mm:ss. `dd` widens past 2 digits and is
// never truncated or capped.
// Order of operations: reject non-finite -> clamp negatives to 0 -> round -> bucket -> pad.
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return DURATION_EMPTY;
  const total = Math.round(Math.max(0, seconds));

  const s = total % 60;
  const totalMinutes = Math.floor(total / 60);
  const m = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const h = totalHours % 24;
  const d = Math.floor(totalHours / 24);

  if (total < 3600) return `${pad(m)}:${pad(s)}`;
  if (total < 86400) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
}
