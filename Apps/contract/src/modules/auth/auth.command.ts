import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginCommand = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshTokenCommand = z.infer<typeof RefreshTokenSchema>;
