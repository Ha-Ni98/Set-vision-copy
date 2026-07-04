import { WILAYA_GEOMETRY } from "./wilaya-geometry";

// The vendored SVG keys wilayas by name (no code exposed on the shapes themselves), while
// our DTOs carry `wilayaId` + `wilayaName` (plan.md §D3.5/E-5). Rather than a brittle
// hardcoded "lib spelling -> DB spelling" pairing table (which breaks the moment either
// side's diacritics/apostrophe/whitespace conventions differ), both sides are folded
// through the same normalization and matched on that — resilient to accent/case/whitespace
// drift, not just an exact-string join.
function normalizeWilayaName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (é, ï, â, ù, ...)
    .replace(/['ʼ’]/g, "") // fold apostrophe variants (M'Sila / M’Sila)
    .replace(/[-_]/g, " ") // hyphens/underscores read as spaces
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NORMALIZED_TO_LIB_NAME = new Map<string, string>(
  WILAYA_GEOMETRY.map((w) => [normalizeWilayaName(w.name), w.name]),
);

// Resolves an arbitrary wilaya name (e.g. a DTO's `wilayaName`) to the vendored SVG's own
// spelling, so heatmap data can be looked up by `WILAYA_GEOMETRY`'s `name` key regardless
// of minor spelling drift. Returns undefined if no plausible match exists.
export function resolveLibWilayaName(wilayaName: string): string | undefined {
  return NORMALIZED_TO_LIB_NAME.get(normalizeWilayaName(wilayaName));
}

export { normalizeWilayaName };
