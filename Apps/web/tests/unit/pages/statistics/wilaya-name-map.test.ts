import { describe, it, expect } from "vitest";
import { WILAYA_GEOMETRY } from "@/pages/admin/statistics/components/wilaya-geometry";
import { resolveLibWilayaName } from "@/pages/admin/statistics/components/wilaya-name-map";

// The §E-5 safety net: the heatmap join is only as good as this map covering every vendored
// wilaya. A silent drop here means a wilaya with real DTO data would render with no color/
// tooltip on the map with no error surfaced anywhere.
describe("resolveLibWilayaName", () => {
  it("resolves all 58 vendored wilaya names back to themselves — no drops", () => {
    expect(WILAYA_GEOMETRY).toHaveLength(58);
    for (const w of WILAYA_GEOMETRY) {
      expect(resolveLibWilayaName(w.name)).toBe(w.name);
    }
  });

  it("resolves realistic DB-spelling variants (diacritics, apostrophes, case) to the lib spelling", () => {
    expect(resolveLibWilayaName("Bejaia")).toBe("Béjaïa");
    expect(resolveLibWilayaName("BEJAIA")).toBe("Béjaïa");
    expect(resolveLibWilayaName("M’Sila")).toBe("M'Sila"); // curly vs straight apostrophe
    expect(resolveLibWilayaName("Msila")).toBe("M'Sila");
    expect(resolveLibWilayaName("Sidi Bel Abbes")).toBe("Sidi Bel Abbès");
    expect(resolveLibWilayaName("tebessa")).toBe("Tébessa");
    expect(resolveLibWilayaName("  Alger  ")).toBe("Alger"); // stray whitespace
  });

  it("returns undefined for a name that matches no wilaya", () => {
    expect(resolveLibWilayaName("Not A Real Wilaya")).toBeUndefined();
  });
});
