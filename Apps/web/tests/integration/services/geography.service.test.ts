import { describe, it, expect } from "vitest";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { geographyUrls, geographyErrorHandlers } from "../../fixtures/msw/geography.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { mockWilayas, mockCommunes, mockWilaya } from "../../fixtures/data/geography.mock";
import * as geographyService from "@/services/geography.service";

describe("geography.service.getWilayas", () => {
  it("returns the unwrapped array", async () => {
    const result = await geographyService.getWilayas();
    expect(result).toEqual(mockWilayas);
  });

  it("throws on 500", async () => {
    server.use(geographyErrorHandlers.wilayasServerError());
    await expect(geographyService.getWilayas()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});

describe("geography.service.getCommunes", () => {
  it("returns the unwrapped array via the parameterized URL", async () => {
    let seenPath = "";
    server.use(
      http.get(geographyUrls.communes, ({ request }) => {
        seenPath = new URL(request.url).pathname;
        return ok(mockCommunes);
      }),
    );
    const result = await geographyService.getCommunes(mockWilaya.id);
    expect(result).toEqual(mockCommunes);
    expect(seenPath).toBe(`/api/v1/geography/wilayas/${mockWilaya.id}/communes`);
  });

  it("throws on 500", async () => {
    server.use(geographyErrorHandlers.communesServerError());
    await expect(geographyService.getCommunes(mockWilaya.id)).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
