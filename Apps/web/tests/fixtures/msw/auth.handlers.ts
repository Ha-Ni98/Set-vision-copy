import { http } from "msw";
import { AUTH_ROUTES, ErrorCode } from "@my-app/contract";
import { apiUrl } from "./api-url";
import { ok, fail, noContent } from "./envelope";
import { mockAuthTokens, mockActivatorSession } from "../data/auth.mock";

export const authUrls = {
  login: apiUrl(AUTH_ROUTES.BASE, AUTH_ROUTES.LOGIN),
  refresh: apiUrl(AUTH_ROUTES.BASE, AUTH_ROUTES.REFRESH),
  logout: apiUrl(AUTH_ROUTES.BASE, AUTH_ROUTES.LOGOUT),
  me: apiUrl(AUTH_ROUTES.BASE, AUTH_ROUTES.ME),
};

// Happy-path defaults — always registered. Individual tests override with `server.use()`
// for 4xx/5xx variants (test-rules §3).
export const authHandlers = [
  http.post(authUrls.login, () => ok(mockAuthTokens)),
  http.post(authUrls.refresh, () => ok(mockAuthTokens)),
  http.post(authUrls.logout, () => noContent()),
  http.get(authUrls.me, () => ok(mockActivatorSession)),
];

export const authErrorHandlers = {
  loginInvalidCredentials: () =>
    http.post(authUrls.login, () =>
      fail(ErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid username or password", 401),
    ),
  meUnauthorized: () =>
    http.get(authUrls.me, () => fail(ErrorCode.AUTH_UNAUTHORIZED, "Not authenticated", 401)),
  logoutServerError: () =>
    http.post(authUrls.logout, () => fail(ErrorCode.INTERNAL_SERVER_ERROR, "boom", 500)),
  refreshUnauthorized: () =>
    http.post(authUrls.refresh, () =>
      fail(ErrorCode.AUTH_UNAUTHORIZED, "Invalid refresh token", 401),
    ),
};
