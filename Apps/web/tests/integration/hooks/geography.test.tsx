import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "../../fixtures/msw/server";
import { geographyUrls } from "../../fixtures/msw/geography.handlers";
import { ok } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockWilayas, mockCommunes } from "../../fixtures/data/geography.mock";
import { useWilayas, useCommunes } from "@/hooks/useGeography";

describe("useWilayas", () => {
  it("resolves with the unwrapped array", async () => {
    const { result } = renderHook(() => useWilayas(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockWilayas);
  });
});

describe("useCommunes (enabled-gated)", () => {
  it("issues no request until a wilaya is chosen", async () => {
    let called = false;
    server.use(
      http.get(geographyUrls.communes, () => {
        called = true;
        return ok(mockCommunes);
      }),
    );
    renderHook(() => useCommunes(undefined), { wrapper: createQueryWrapper() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(called).toBe(false);
  });

  it("fetches once a wilayaId is provided, substituting the param", async () => {
    let seenPath = "";
    server.use(
      http.get(geographyUrls.communes, ({ request }) => {
        seenPath = new URL(request.url).pathname;
        return ok(mockCommunes);
      }),
    );
    const { result } = renderHook(() => useCommunes("some-wilaya-id"), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCommunes);
    expect(seenPath).toBe("/api/v1/geography/wilayas/some-wilaya-id/communes");
  });
});
