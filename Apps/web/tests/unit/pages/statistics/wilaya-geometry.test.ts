import { describe, it, expect } from "vitest";
import { WILAYA_GEOMETRY } from "@/pages/admin/statistics/components/wilaya-geometry";

// The heatmap join is only as good as this map covering every wilaya. A silent drop here
// means a wilaya with real DTO data would render with no color/tooltip on the map with no
// error surfaced anywhere.
describe("WILAYA_GEOMETRY", () => {
  it("has exactly 69 entries with unique, contiguous 2-digit wilayaCodes", () => {
    expect(WILAYA_GEOMETRY).toHaveLength(69);

    const codes = WILAYA_GEOMETRY.map((w) => w.wilayaCode);
    expect(new Set(codes).size).toBe(69);

    for (const code of codes) {
      expect(code).toMatch(/^\d{2}$/);
    }

    const expected = Array.from({ length: 69 }, (_, i) => String(i + 1).padStart(2, "0"));
    expect([...codes].sort()).toEqual(expected);
  });

  it("gives every entry a non-empty label and coords", () => {
    for (const w of WILAYA_GEOMETRY) {
      expect(w.label.length).toBeGreaterThan(0);
      expect(w.coords.length).toBeGreaterThan(0);
    }
  });
});
