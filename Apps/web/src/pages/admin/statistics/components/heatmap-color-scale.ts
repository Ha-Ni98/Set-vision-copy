// Split out of WilayaHeatmap.tsx — mixing a component export with plain-function/type
// exports in the same file triggers a react-refresh/only-export-components lint warning
// (breaks Fast Refresh granularity), same fix as Part-1's lib/duration-tone.ts extraction.

export type HeatmapColorMode = "distributors" | "activations" | "cancellations" | "avgTime";

// Light→dark purple gradient (spec) in the same oklch hue/chroma family.
const LIGHT_L = 0.95;
const LIGHT_C = 0.02;
const DARK_L = 0.35;
const DARK_C = 0.16;
const PURPLE_HUE = 300;

export function purpleShade(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const l = LIGHT_L + (DARK_L - LIGHT_L) * clamped;
  const c = LIGHT_C + (DARK_C - LIGHT_C) * clamped;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${PURPLE_HUE})`;
}
