import { UserRole, type LoginCommand, type AuthTokensDTO, type SessionUserDTO } from "@my-app/contract";

// TODO(Sub-02): api.post(apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.LOGIN), command) — unwrap ApiResponse<AuthTokensDTO>
export async function login(_command: LoginCommand): Promise<AuthTokensDTO> {
  return { accessToken: "", refreshToken: "", role: UserRole.ACTIVATOR };
}

// TODO(Sub-02): api.post(apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.LOGOUT)) — unwrap ApiResponse<null>
export async function logout(): Promise<void> {
  return;
}

// TODO(Sub-02): api.get(apiPath(AUTH_ROUTES.BASE, AUTH_ROUTES.ME)) — unwrap ApiResponse<SessionUserDTO>.
// Stubbed null: there is no real session to report yet (AuthProvider bridges this — see its comment).
export async function me(): Promise<SessionUserDTO | null> {
  return null;
}
