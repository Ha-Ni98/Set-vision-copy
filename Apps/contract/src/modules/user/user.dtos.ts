import { z } from 'zod';
import { UserRole } from './user.enums';

export const UserIdentityResponseSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  role: z.enum(UserRole),
  isEnabled: z.boolean(),
  lastLoginAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type UserIdentityDTO = z.infer<typeof UserIdentityResponseSchema>;
