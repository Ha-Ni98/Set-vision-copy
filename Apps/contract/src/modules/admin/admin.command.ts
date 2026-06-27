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
});
export type UpdateAdminCommand = z.infer<typeof UpdateAdminSchema>;
