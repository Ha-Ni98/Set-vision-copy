import { describe, it, expect, beforeEach } from "vitest";
import * as tokenStore from "@/lib/token-store";

describe("token-store", () => {
  beforeEach(() => {
    tokenStore.clear();
    localStorage.clear();
  });

  it("stores and returns the access token in memory", () => {
    tokenStore.setTokens({ accessToken: "a1", refreshToken: "r1" });
    expect(tokenStore.getAccessToken()).toBe("a1");
  });

  it("persists the refresh token under sv_refresh_token in localStorage", () => {
    tokenStore.setTokens({ accessToken: "a1", refreshToken: "r1" });
    expect(localStorage.getItem("sv_refresh_token")).toBe("r1");
    expect(tokenStore.getRefreshToken()).toBe("r1");
  });

  it("never writes the access token to localStorage", () => {
    tokenStore.setTokens({ accessToken: "secret-access", refreshToken: "r1" });
    const persistedValues = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.getItem(localStorage.key(i) as string),
    );
    expect(persistedValues).not.toContain("secret-access");
  });

  it("returns null for both tokens before anything is set", () => {
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("clear() resets both the memory access token and the persisted refresh token", () => {
    tokenStore.setTokens({ accessToken: "a1", refreshToken: "r1" });
    tokenStore.clear();
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("tolerates a pre-existing, unexpected string value in storage without throwing", () => {
    localStorage.setItem("sv_refresh_token", "leftover-from-a-different-schema");
    expect(() => tokenStore.getRefreshToken()).not.toThrow();
    expect(tokenStore.getRefreshToken()).toBe("leftover-from-a-different-schema");
  });
});
