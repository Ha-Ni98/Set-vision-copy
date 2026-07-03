// Split out of WilayaHeatmap.tsx — mixing a component export with plain-function/type
// exports in the same file triggers a react-refresh/only-export-components lint warning
// (breaks Fast Refresh granularity), same fix as Part-1's lib/duration-tone.ts extraction.

export type HeatmapColorMode = "distributors" | "activations" | "cancellations" | "avgTime";

const PURPLE_HUE = 300;

// Low end blends toward the theme's own surface lightness, high end is the vivid purple that
// pops against it — same "low blends in, high pops" relationship in both themes, just
// mirrored, since light theme surfaces are near-white (--card: 1 0 0) and dark theme surfaces
// are near-black (--card: 0.2 0.05 280, index.css). Without this the light theme's near-white
// "low" endpoint (L 0.95) would read as a jarring bright patch on a dark background.
const LIGHT_THEME = { lowL: 0.95, lowC: 0.02, highL: 0.35, highC: 0.16 };
const DARK_THEME = { lowL: 0.28, lowC: 0.04, highL: 0.78, highC: 0.18 };

export function purpleShade(t: number, isDark = false): string {
  const clamped = Math.max(0, Math.min(1, t));
  const { lowL, lowC, highL, highC } = isDark ? DARK_THEME : LIGHT_THEME;
  const l = lowL + (highL - lowL) * clamped;
  const c = lowC + (highC - lowC) * clamped;
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${PURPLE_HUE})`;
}
