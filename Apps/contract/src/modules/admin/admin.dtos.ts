import { z } from 'zod';
import { paginated } from '../../common/types';

export const AdminResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  fullName: z.string(),
  username: z.string(),
  phone: z.string(),
  isEnabled: z.boolean(),
  lastLoginAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type AdminDTO = z.infer<typeof AdminResponseSchema>;

// Sanctioned §0.1.1 exception: one-time create response
export const AdminWithCredentialsResponseSchema = z.object({
  admin: AdminResponseSchema,
  generatedPassword: z.string(),
});
export type AdminWithCredentialsDTO = z.infer<typeof AdminWithCredentialsResponseSchema>;

// Sanctioned §0.1.1 exception: one-time reset-password response
export const AdminGeneratedPasswordResponseSchema = z.object({
  generatedPassword: z.string(),
});
export type AdminGeneratedPasswordDTO = z.infer<typeof AdminGeneratedPasswordResponseSchema>;

export const PaginatedAdminsSchema = paginated(AdminResponseSchema);
export type PaginatedAdmins = z.infer<typeof PaginatedAdminsSchema>;
