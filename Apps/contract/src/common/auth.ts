import { z } from 'zod';
import { UserRole } from '../modules/user/user.enums';

export const JWTPayloadSchema = z.object({
  id: z.uuid(),
  role: z.enum(UserRole),
});
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
