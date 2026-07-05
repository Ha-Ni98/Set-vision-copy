import { z } from 'zod';

export const CreateActivatorSchema = z.object({
  fullName: z.string(),
  username: z.string(),
  phone: z.string(),
  initialCredits: z.number().optional(),
  // Optional admin-chosen password (Stage-04-fix). Omit it to let the server generate one.
  // Enforced server-side too since routes validate the body against this schema.
  password: z.string().min(8).optional(),
});
export type CreateActivatorCommand = z.infer<typeof CreateActivatorSchema>;

export const UpdateActivatorSchema = z.object({
  fullName: z.string().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
  // Optional new password (Stage-04-fix). Omit it to leave the current password unchanged.
  password: z.string().min(8).optional(),
});
export type UpdateActivatorCommand = z.infer<typeof UpdateActivatorSchema>;
