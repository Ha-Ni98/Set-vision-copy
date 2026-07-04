import type { AuthTokensDTO } from "@my-app/contract";

// The only module that touches auth tokens (plan.md §1.3). Access token lives in a
// module-scoped variable only — never persisted, never readable by anything but this
// process's memory (narrows the XSS window, plan.md §8.1). Refresh token persists across
// reloads so a silent-refresh cold start can restore the session without a login screen.
const REFRESH_TOKEN_KEY = "sv_refresh_token";

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(dto: Pick<AuthTokensDTO, "accessToken" | "refreshToken">): void {
  accessToken = dto.accessToken;
  localStorage.setItem(REFRESH_TOKEN_KEY, dto.refreshToken);
}

export function clear(): void {
  accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
