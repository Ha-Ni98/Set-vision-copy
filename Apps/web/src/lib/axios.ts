import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  AUTH_ROUTES,
  KEY_ROUTES,
  type ApiResponse,
  type AuthTokensDTO,
  type RefreshTokenCommand,
} from "@my-app/contract";
import { apiPath } from "./api-path";
import * as tokenStore from "./token-store";

// Exactly one axios instance (rules §3A). Bearer auth, not cookies — see plan.md D1: the
// Stage-02 API only reads `Authorization: Bearer` (no cookie-parser, no `Set-Cookie`).
// This file does no UI/toasts/domain transforms.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15_000,
});

// Bridges the 401 redirect to React Router without a hard reload mid-session. Registered
// once at app startup via the data router's own `navigate()` (see src/App.tsx); falls back
// to window.location if nothing has registered yet.
let redirect: ((path: string) => void) | null = null;
export function setRedirect(fn: (path: string) => void) {
  redirect = fn;
}

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// 401s on these paths must never trigger a refresh or redirect — the error belongs to the
// caller (a login form shows "invalid credentials"; a failed refresh call itself hits this
// same exclusion, which is what makes refreshTokens() below recursion-safe).
const TOKEN_ENDPOINTS = new Set(
  [AUTH_ROUTES.LOGIN, AUTH_ROUTES.REFRESH, AUTH_ROUTES.LOGOUT].map((segment) =>
    apiPath(AUTH_ROUTES.BASE, segment),
  ),
);

// The client-activation portal (SV-PAGE-001) is entirely public — no token is ever attached
// to a `/keys/*` request, so a 401 there is a business-logic response (an expired/invalid
// activation reference), never an expired-session signal. `UPDATE`/`ADDITIONAL`/`STATUS` are
// parameterized (`/:activationId/...`), so this is a prefix check, not the TOKEN_ENDPOINTS
// exact-match Set — every `/keys/*` request already shares that one base regardless of which
// segment or resolved id follows (client-portal plan.md §B3/E-4).
const PUBLIC_PATH_PREFIX = apiPath(KEY_ROUTES.BASE);
const isPublicEndpoint = (url: string): boolean => url.startsWith(PUBLIC_PATH_PREFIX);

// AuthProvider's useSession() calls this on every page load, public routes included (e.g. the
// client-activation landing page at "/") — a 401 here just means "no session," which is the
// normal case for an anonymous visitor, not an expired-session signal to bounce them to /login.
// The refresh attempt below still runs as normal (silently restores a session from a stale
// access token + valid refresh token); only the *redirect* on ultimate failure is skipped for
// this one endpoint. Actually-protected routes still redirect correctly on their own, via
// ProtectedRoute/AdminGuard reacting to isAuthenticated — this endpoint just stops forcing it.
const SESSION_ENDPOINT = apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.ME);

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Single-flight: concurrent 401s across independent requests share one refresh call
// instead of each firing its own. Lives here (not in auth.service.ts, built in Sprint 2)
// because services depend on lib/axios.ts, never the other way — and the realtime layer
// (Sprint 4) reuses this exact export so both transports share one refresh (plan.md §1.2).
let refreshInFlight: Promise<AuthTokensDTO> | null = null;

export function refreshTokens(): Promise<AuthTokensDTO> {
  if (!refreshInFlight) {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) {
      return Promise.reject(new Error("No refresh token available"));
    }
    const command: RefreshTokenCommand = { refreshToken };
    refreshInFlight = api
      .post<ApiResponse<AuthTokensDTO>>(apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.REFRESH), command)
      .then((res) => {
        if (!res.data.success) throw new Error(res.data.error.message); // defensive
        tokenStore.setTokens(res.data.data);
        return res.data.data;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function redirectToLogin(): void {
  const alreadyOnLogin = typeof window !== "undefined" && window.location.pathname === "/login";
  if (alreadyOnLogin) return;
  if (redirect) redirect("/login");
  else if (typeof window !== "undefined") window.location.href = "/login";
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // 1. Non-401 errors: reject, query-client owns feedback.
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const config = error.config as RetriableConfig | undefined;
    const requestUrl = config?.url ?? "";

    // 2. 401 on a token endpoint or a public client-portal endpoint: never refresh, never
    // redirect — same handling, two different reasons (token-endpoint recursion safety vs.
    // this request never carrying a token to begin with).
    if (TOKEN_ENDPOINTS.has(requestUrl) || isPublicEndpoint(requestUrl)) {
      return Promise.reject(error);
    }

    const isSessionCheck = requestUrl === SESSION_ENDPOINT;

    // 4. No request to replay, or already retried once (refresh succeeded but the replay
    // still 401'd) — treat as failure, no second refresh attempt.
    if (!config || config._retried) {
      tokenStore.clear();
      if (!isSessionCheck) redirectToLogin();
      return Promise.reject(error);
    }

    // 3. Single-flight refresh, then replay this request exactly once.
    try {
      await refreshTokens();
    } catch {
      // 4. Refresh failed / no refresh token.
      tokenStore.clear();
      if (!isSessionCheck) redirectToLogin();
      return Promise.reject(error);
    }

    config._retried = true;
    return api(config);
  },
);
