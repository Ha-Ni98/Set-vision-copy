import type { User } from '@prisma/client';
import {
  AuthTokensResponseSchema,
  SessionUserResponseSchema,
  type AuthTokensDTO,
  type SessionUserDTO,
  UserRole,
} from '@my-app/contract';

export class AuthMapper {
  static toAuthTokensDTO(
    accessToken: string,
    refreshToken: string,
    role: UserRole,
  ): AuthTokensDTO {
    return AuthTokensResponseSchema.parse({ accessToken, refreshToken, role });
  }

  static toSessionUserDTO(
    user: User,
    profile: { fullName: string },
  ): SessionUserDTO {
    return SessionUserResponseSchema.parse({
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      fullName: profile.fullName,
    });
  }
}
