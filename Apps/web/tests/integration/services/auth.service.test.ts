import { describe, it, expect, beforeEach, vi } from "vitest";
import { http } from "msw";
import { ErrorCode } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { authUrls, authErrorHandlers } from "../../fixtures/msw/auth.handlers";
import { ok, fail, noContent } from "../../fixtures/msw/envelope";
import { mockAuthTokens, mockActivatorSession } from "../../fixtures/data/auth.mock";
import * as authService from "@/services/auth.service";
import { refreshTokens, setRedirect } from "@/lib/axios";
import * as tokenStore from "@/lib/token-store";

beforeEach(() => {
  tokenStore.clear();
  // A 401 with no refresh token falls through to axios's real redirect path; stub it so
  // these tests don't trigger jsdom's unimplemented navigation (noisy, not a failure).
  setRedirect(vi.fn());
});

describe("auth.service.login", () => {
  it("returns the unwrapped DTO and stores the tokens", async () => {
    const result = await authService.login({ username: "amine.b", password: "secret" });
    expect(result).toEqual(mockAuthTokens);
    expect(tokenStore.getAccessToken()).toBe(mockAuthTokens.accessToken);
    expect(tokenStore.getRefreshToken()).toBe(mockAuthTokens.refreshToken);
  });

  it("throws on invalid credentials and stores nothing", async () => {
    server.use(authErrorHandlers.loginInvalidCredentials());
    await expect(
      authService.login({ username: "amine.b", password: "wrong" }),
    ).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("a subsequent request carries the token login just stored", async () => {
    await authService.login({ username: "amine.b", password: "secret" });
    let seenAuth: string | null = null;
    server.use(
      http.get(authUrls.me, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return ok(mockActivatorSession);
      }),
    );
    await authService.me();
    expect(seenAuth).toBe(`Bearer ${mockAuthTokens.accessToken}`);
  });
});

describe("auth.service.me", () => {
  it("returns the unwrapped session DTO", async () => {
    const result = await authService.me();
    expect(result).toEqual(mockActivatorSession);
  });

  it("throws when unauthorized", async () => {
    server.use(authErrorHandlers.meUnauthorized());
    await expect(authService.me()).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("cold start: a 401 with only a persisted refresh token silently refreshes and retries", async () => {
    // Simulates a page reload — the access token is memory-only and doesn't survive it,
    // but the refresh token was persisted to localStorage.
    localStorage.setItem("sv_refresh_token", "valid-refresh");

    let meCalls = 0;
    server.use(
      http.get(authUrls.me, ({ request }) => {
        meCalls += 1;
        const auth = request.headers.get("authorization");
        if (auth === "Bearer fresh-access") return ok(mockActivatorSession);
        return fail(ErrorCode.AUTH_UNAUTHORIZED, "expired", 401);
      }),
      http.post(authUrls.refresh, () => ok({ ...mockAuthTokens, accessToken: "fresh-access" })),
    );

    const session = await authService.me();
    expect(session).toEqual(mockActivatorSession);
    expect(meCalls).toBe(2); // first call misses (no access token yet), second carries the refreshed one
  });
});

describe("auth.service.logout", () => {
  it("succeeds and clears tokens on 204", async () => {
    tokenStore.setTokens(mockAuthTokens);
    await authService.logout();
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("clears tokens even when the API 500s, and still throws", async () => {
    tokenStore.setTokens(mockAuthTokens);
    server.use(authErrorHandlers.logoutServerError());
    await expect(authService.logout()).rejects.toMatchObject({ response: { status: 500 } });
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("clears locally without a network call when no refresh token is stored", async () => {
    let called = false;
    server.use(
      http.post(authUrls.logout, () => {
        called = true;
        return noContent();
      }),
    );
    await authService.logout();
    expect(called).toBe(false);
  });
});

describe("auth.service.refresh", () => {
  it("is a direct re-export of axios.ts's single-flight refreshTokens (route-coverage completeness)", () => {
    expect(authService.refresh).toBe(refreshTokens);
  });
});
