import { z } from 'zod';

export const CreateActivatorSchema = z.object({
  fullName: z.string(),
  username: z.string(),
  phone: z.string(),
  initialCredits: z.number().optional(),
});
export type CreateActivatorCommand = z.infer<typeof CreateActivatorSchema>;

export const UpdateActivatorSchema = z.object({
  fullName: z.string().optional(),
  username: z.string().optional(),
  phone: z.string().optional(),
});
export type UpdateActivatorCommand = z.infer<typeof UpdateActivatorSchema>;
