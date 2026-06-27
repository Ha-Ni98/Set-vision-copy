import { z } from 'zod';
import { UserRole } from '../user/user.enums';

// Sanctioned §0.1.3 exception: raw access + refresh tokens returned to their owner at login/refresh
export const AuthTokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  role: z.enum(UserRole),
});
export type AuthTokensDTO = z.infer<typeof AuthTokensResponseSchema>;

export const SessionUserResponseSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  role: z.enum(UserRole),
  fullName: z.string(),
});
export type SessionUserDTO = z.infer<typeof SessionUserResponseSchema>;
