const WARN_AT_MINUTES = { elapsed: 5, wait: 5 } as const;
const DANGER_AT_MINUTES = { elapsed: 10, wait: 15 } as const;

export function toneClass(minutes: number, mode: "elapsed" | "wait" = "elapsed"): string {
  return minutes < WARN_AT_MINUTES[mode]
    ? "text-success"
    : minutes < DANGER_AT_MINUTES[mode]
      ? "text-warning"
      : "text-destructive";
}

// For a *static* precomputed duration (e.g. an activator's average activation time) that
// wants the same green/amber/red thresholds as LiveTimer's live-ticking display, without
// counting up from a "since" timestamp.
export function durationToneClass(
  seconds: number | null,
  mode: "elapsed" | "wait" = "elapsed",
): string {
  if (seconds === null) return "text-muted-foreground";
  return toneClass(seconds / 60, mode);
}
