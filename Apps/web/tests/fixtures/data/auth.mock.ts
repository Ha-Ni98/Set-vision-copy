import {
  AuthTokensResponseSchema,
  SessionUserResponseSchema,
  UserRole,
  type AuthTokensDTO,
  type SessionUserDTO,
} from "@my-app/contract";

export const mockAuthTokens: AuthTokensDTO = AuthTokensResponseSchema.parse({
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  role: UserRole.ACTIVATOR,
});

export const mockActivatorSession: SessionUserDTO = SessionUserResponseSchema.parse({
  id: "8400b859-fc6c-4a1a-9c1e-1a2b3c4d5e6f",
  username: "amine.b",
  role: UserRole.ACTIVATOR,
  fullName: "Amine Belkacem",
});

export const mockAdminSession: SessionUserDTO = SessionUserResponseSchema.parse({
  id: "8400b859-fc6c-4a1a-9c1e-2b3c4d5e6f70",
  username: "sara.h",
  role: UserRole.ADMIN,
  fullName: "Sara Haddad",
});
