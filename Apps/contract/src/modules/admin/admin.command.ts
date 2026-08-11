import { z } from 'zod';

export const CreateAdminSchema = z.object({
  fullName: z.string(),
  username: z.string(),
  phone: z.string(),
});
export type CreateAdminCommand = z.infer<typeof CreateAdminSchema>;

export const UpdateAdminSchema = z.object({
  fullName: z.string().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
  // Optional new password (Set 14). Omit it to leave the current password unchanged.
  password: z.string().min(8).optional(),
});
export type UpdateAdminCommand = z.infer<typeof UpdateAdminSchema>;
