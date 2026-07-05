import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, delay, HttpResponse } from "msw";
import { AUTH_ROUTES, KEY_ROUTES, ErrorCode, UserRole, type AuthTokensDTO } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { apiUrl } from "../../fixtures/msw/api-url";
import { ok, fail } from "../../fixtures/msw/envelope";
import { apiPath, withParams } from "@/lib/api-path";
import { api, setRedirect, refreshTokens } from "@/lib/axios";
import * as tokenStore from "@/lib/token-store";

const PROTECTED_URL = apiUrl("/__protected__");
const REFRESH_URL = apiUrl(AUTH_ROUTES.BASE, AUTH_ROUTES.REFRESH);
const LOGIN_URL = apiUrl(AUTH_ROUTES.BASE, AUTH_ROUTES.LOGIN);
const LOGIN_PATH = apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.LOGIN);
const KEY_STATUS_SEGMENT = withParams(KEY_ROUTES.STATUS, { activationId: "abc-123" });
const KEY_STATUS_URL = apiUrl(KEY_ROUTES.BASE, KEY_STATUS_SEGMENT);
const KEY_STATUS_PATH = apiPath(KEY_ROUTES.BASE, KEY_STATUS_SEGMENT);

const freshTokens: AuthTokensDTO = {
  accessToken: "fresh-access",
  refreshToken: "fresh-refresh",
  role: UserRole.ACTIVATOR,
};

beforeEach(() => {
  tokenStore.clear();
  setRedirect(vi.fn());
  window.history.pushState({}, "", "/dashboard");
});

describe("axios request interceptor", () => {
  it("attaches Authorization: Bearer when an access token is stored", async () => {
    tokenStore.setTokens({ accessToken: "stored-access", refreshToken: "r1" });
    let seenAuth: string | null = null;
    server.use(
      http.get(PROTECTED_URL, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return ok({ ok: true });
      }),
    );
    await api.get("/__protected__");
    expect(seenAuth).toBe("Bearer stored-access");
  });

  it("sends no Authorization header when no access token is stored", async () => {
    let seenAuth: string | null = "unset";
    server.use(
      http.get(PROTECTED_URL, ({ request }) => {
        seenAuth = request.headers.get("authorization");
        return ok({ ok: true });
      }),
    );
    await api.get("/__protected__");
    expect(seenAuth).toBeNull();
  });
});

describe("axios response interceptor — 401 refresh-retry state machine", () => {
  it("refreshes once and replays the original request on a single 401", async () => {
    tokenStore.setTokens({ accessToken: "stale-access", refreshToken: "valid-refresh" });

    let refreshCalls = 0;
    server.use(
      http.post(REFRESH_URL, async ({ request }) => {
        refreshCalls += 1;
        const body = (await request.json()) as { refreshToken: string };
        expect(body.refreshToken).toBe("valid-refresh");
        return ok(freshTokens);
      }),
      http.get(PROTECTED_URL, ({ request }) => {
        const auth = request.headers.get("authorization");
        if (auth === "Bearer fresh-access") return ok({ ok: true });
        return fail(ErrorCode.AUTH_UNAUTHORIZED, "expired", 401);
      }),
    );

    const res = await api.get("/__protected__");

    expect(res.data).toEqual({ success: true, data: { ok: true } });
    expect(refreshCalls).toBe(1);
    expect(tokenStore.getAccessToken()).toBe("fresh-access");
  });

  it("shares one refresh call across concurrent 401s (single-flight)", async () => {
    tokenStore.setTokens({ accessToken: "stale-access", refreshToken: "valid-refresh" });

    let refreshCalls = 0;
    server.use(
      http.post(REFRESH_URL, async () => {
        refreshCalls += 1;
        await delay(20); // widen the race window so both requests land inside it
        return ok(freshTokens);
      }),
      http.get(PROTECTED_URL, ({ request }) => {
        const auth = request.headers.get("authorization");
        if (auth === "Bearer fresh-access") return ok({ ok: true });
        return fail(ErrorCode.AUTH_UNAUTHORIZED, "expired", 401);
      }),
    );

    const [a, b] = await Promise.all([api.get("/__protected__"), api.get("/__protected__")]);

    expect(a.data).toEqual({ success: true, data: { ok: true } });
    expect(b.data).toEqual({ success: true, data: { ok: true } });
    expect(refreshCalls).toBe(1);
  });

  it("clears tokens and redirects exactly once when refresh itself fails", async () => {
    tokenStore.setTokens({ accessToken: "stale-access", refreshToken: "revoked-refresh" });
    const redirectSpy = vi.fn();
    setRedirect(redirectSpy);

    server.use(
      http.post(REFRESH_URL, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "revoked", 401)),
      http.get(PROTECTED_URL, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "expired", 401)),
    );

    await expect(api.get("/__protected__")).rejects.toMatchObject({ response: { status: 401 } });

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledWith("/login");
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
  });

  it("does not redirect a second time if the replayed request 401s again", async () => {
    tokenStore.setTokens({ accessToken: "stale-access", refreshToken: "valid-refresh" });
    const redirectSpy = vi.fn();
    setRedirect(redirectSpy);

    server.use(
      http.post(REFRESH_URL, () => ok(freshTokens)),
      // Always 401, even after replay with the "fresh" token — simulates a server that
      // considers the session dead regardless.
      http.get(PROTECTED_URL, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "still expired", 401)),
    );

    await expect(api.get("/__protected__")).rejects.toMatchObject({ response: { status: 401 } });

    expect(redirectSpy).toHaveBeenCalledTimes(1);
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  it("never refreshes or redirects on a 401 from the LOGIN endpoint itself", async () => {
    const redirectSpy = vi.fn();
    setRedirect(redirectSpy);
    let refreshCalls = 0;

    server.use(
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return ok(freshTokens);
      }),
      http.post(LOGIN_URL, () => fail(ErrorCode.AUTH_INVALID_CREDENTIALS, "bad credentials", 401)),
    );

    await expect(api.post(LOGIN_PATH, { username: "x", password: "y" })).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshCalls).toBe(0);
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("never refreshes or redirects on a 401 from a public client-portal /keys/* endpoint (client-portal E-4)", async () => {
    const redirectSpy = vi.fn();
    setRedirect(redirectSpy);
    let refreshCalls = 0;

    server.use(
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return ok(freshTokens);
      }),
      // A parameterized route (`/:activationId/status`) — proves the prefix check works
      // against the *resolved* URL, not just the unparameterized TOKEN_ENDPOINTS routes.
      http.get(KEY_STATUS_URL, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "expired", 401)),
    );

    await expect(api.get(KEY_STATUS_PATH)).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshCalls).toBe(0);
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("redirects straight away with no refresh attempt when no refresh token is stored", async () => {
    // tokenStore already clear()'d in beforeEach — no access token, no refresh token.
    const redirectSpy = vi.fn();
    setRedirect(redirectSpy);
    let refreshCalls = 0;

    server.use(
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return ok(freshTokens);
      }),
      http.get(PROTECTED_URL, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "expired", 401)),
    );

    await expect(api.get("/__protected__")).rejects.toMatchObject({ response: { status: 401 } });

    expect(refreshCalls).toBe(0);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
  });

  it("clears tokens but does not redirect when already on /login (loop prevention)", async () => {
    window.history.pushState({}, "", "/login");
    tokenStore.setTokens({ accessToken: "stale-access", refreshToken: "revoked-refresh" });
    const redirectSpy = vi.fn();
    setRedirect(redirectSpy);

    server.use(
      http.post(REFRESH_URL, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "revoked", 401)),
      http.get(PROTECTED_URL, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "expired", 401)),
    );

    await expect(api.get("/__protected__")).rejects.toMatchObject({ response: { status: 401 } });

    expect(redirectSpy).not.toHaveBeenCalled();
    expect(tokenStore.getAccessToken()).toBeNull();
  });
});

describe("refreshTokens() single-flight export", () => {
  it("rejects immediately with no network call when there is no stored refresh token", async () => {
    let called = false;
    server.use(
      http.post(REFRESH_URL, () => {
        called = true;
        return ok(freshTokens);
      }),
    );
    await expect(refreshTokens()).rejects.toThrow();
    expect(called).toBe(false);
  });
});

describe("axios non-auth behavior", () => {
  it("passes non-401 errors straight through untransformed", async () => {
    server.use(http.get(PROTECTED_URL, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)));
    await expect(api.get("/__protected__")).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("enforces the configured timeout on a request that never resolves", async () => {
    // Two environment-only workarounds, confirmed by direct diagnosis, neither of which
    // changes what ships: (1) fake timers deadlock MSW's real event-loop-driven
    // interception instead of fast-forwarding it, so this uses a short per-call timeout
    // override at real speed instead of faking the instance's 15_000ms default: same
    // axios timeout code path, just parameterized to run fast. (2) jsdom's XHR shim
    // doesn't enforce `.timeout` when MSW intercepts underneath it at the ClientRequest
    // layer (real browsers do enforce `xhr.timeout` — this is a test-environment gap, not
    // a production one), so the request is forced onto axios's `http` adapter, which MSW
    // and the timeout mechanism both handle correctly.
    server.use(
      http.get(PROTECTED_URL, async () => {
        await delay("infinite");
      }),
    );
    await expect(api.get("/__protected__", { timeout: 50, adapter: "http" })).rejects.toMatchObject(
      {
        code: "ECONNABORTED",
      },
    );
  });

  it("propagates a network error (no response) untransformed", async () => {
    server.use(http.get(PROTECTED_URL, () => HttpResponse.error()));
    await expect(api.get("/__protected__")).rejects.toMatchObject({ message: expect.any(String) });
  });
});
