import {
  AUTH_ROUTES,
  type ApiResponse,
  type LoginCommand,
  type AuthTokensDTO,
  type SessionUserDTO,
  type RefreshTokenCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath } from "@/lib/api-path";
import * as tokenStore from "@/lib/token-store";

export async function login(command: LoginCommand): Promise<AuthTokensDTO> {
  const res = await api.post<ApiResponse<AuthTokensDTO>>(
    apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.LOGIN),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  tokenStore.setTokens(res.data.data);
  return res.data.data;
}

// AUTH_ROUTES.LOGOUT requires a RefreshTokenCommand body, but reads it from the token
// store rather than taking a parameter — the only caller today (AuthProvider) invokes this
// as a zero-argument mutation, mirroring the same "read the store, don't ask the caller"
// pattern axios.ts's refreshTokens() already uses. Local logout always happens (tokens
// clear in `finally`) even if the API call itself throws.
export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    tokenStore.clear();
    return;
  }
  const command: RefreshTokenCommand = { refreshToken };
  try {
    await api.post(apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.LOGOUT), command);
  } finally {
    tokenStore.clear();
  }
}

export async function me(): Promise<SessionUserDTO> {
  const res = await api.get<ApiResponse<SessionUserDTO>>(apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.ME));
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// AUTH_ROUTES.REFRESH's real implementation is axios.ts's own single-flight
// refreshTokens() — re-exported here only so every contract route maps to a service
// function (plan.md D2). No dedicated hook: calling this outside the 401 interceptor
// would risk racing a second refresh against the interceptor's own in-flight one.
export { refreshTokens as refresh } from "@/lib/axios";
