import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "msw";
import type { ReactNode } from "react";
import { ErrorCode } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { authUrls } from "../../fixtures/msw/auth.handlers";
import { ok, fail } from "../../fixtures/msw/envelope";
import { createQueryWrapper } from "../../fixtures/wrappers/createQueryWrapper";
import { mockActivatorSession } from "../../fixtures/data/auth.mock";
import { useLogin } from "@/hooks/useLogin";
import { useLogout } from "@/hooks/useLogout";
import { useSession } from "@/hooks/useSession";
import { qk } from "@/lib/query-keys";
import { setRedirect } from "@/lib/axios";
import * as tokenStore from "@/lib/token-store";

beforeEach(() => {
  // A 401 with no refresh token falls through to axios's real redirect path; stub it so
  // these tests don't trigger jsdom's unimplemented navigation (noisy, not a failure).
  setRedirect(vi.fn());
});

// A local wrapper (not the shared createQueryWrapper) so tests can reach into the same
// QueryClient instance both hooks share, for direct, public-API cache assertions
// (getQueryData) — not internals.
function makeWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { Wrapper, queryClient };
}

describe("useSession", () => {
  it("resolves with the session on success", async () => {
    const { result } = renderHook(() => useSession(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockActivatorSession);
  });

  it("surfaces an error when unauthorized", async () => {
    server.use(http.get(authUrls.me, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "expired", 401)));
    const { result } = renderHook(() => useSession(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useLogin", () => {
  it("exposes mutate/isPending and invalidates the session query on success", async () => {
    const wrapper = createQueryWrapper();
    let meCalls = 0;
    server.use(
      http.get(authUrls.me, () => {
        meCalls += 1;
        return ok(mockActivatorSession);
      }),
    );

    const { result: sessionResult } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(sessionResult.current.isSuccess).toBe(true));
    expect(meCalls).toBe(1);

    const { result: loginResult } = renderHook(() => useLogin(), { wrapper });
    expect(loginResult.current.isPending).toBe(false);
    loginResult.current.mutate({ username: "amine.b", password: "secret" });
    await waitFor(() => expect(loginResult.current.isSuccess).toBe(true));

    // Invalidation triggers a refetch of the still-mounted, active session query.
    await waitFor(() => expect(meCalls).toBe(2));
  });
});

describe("useLogout", () => {
  it("clears the entire query cache once the mutation settles", async () => {
    tokenStore.setTokens({ accessToken: "a", refreshToken: "r" });
    const { Wrapper, queryClient } = makeWrapperWithClient();

    const { result: sessionResult } = renderHook(() => useSession(), { wrapper: Wrapper });
    await waitFor(() => expect(sessionResult.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(qk.auth.me())).toEqual(mockActivatorSession);

    const { result: logoutResult } = renderHook(() => useLogout(), { wrapper: Wrapper });
    logoutResult.current.mutate();
    await waitFor(() => expect(logoutResult.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(qk.auth.me())).toBeUndefined();
  });

  it("still clears the cache when the logout API call itself fails", async () => {
    tokenStore.setTokens({ accessToken: "a", refreshToken: "r" });
    server.use(
      http.post(authUrls.logout, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
    );
    const { Wrapper, queryClient } = makeWrapperWithClient();

    const { result: sessionResult } = renderHook(() => useSession(), { wrapper: Wrapper });
    await waitFor(() => expect(sessionResult.current.isSuccess).toBe(true));

    const { result: logoutResult } = renderHook(() => useLogout(), { wrapper: Wrapper });
    logoutResult.current.mutate();
    await waitFor(() => expect(logoutResult.current.isError).toBe(true));

    expect(queryClient.getQueryData(qk.auth.me())).toBeUndefined();
  });
});
