import { z } from 'zod';

export const CreateDistributorSchema = z.object({
  fullName: z.string(),
  storeName: z.string(),
  phone: z.string(),
  wilayaId: z.uuid(),
  communeId: z.uuid(),
});
export type CreateDistributorCommand = z.infer<typeof CreateDistributorSchema>;

export const UpdateDistributorSchema = z.object({
  fullName: z.string().optional(),
  storeName: z.string().optional(),
  phone: z.string().optional(),
  wilayaId: z.uuid().optional(),
  communeId: z.uuid().optional(),
});
export type UpdateDistributorCommand = z.infer<typeof UpdateDistributorSchema>;

export const CreateDistributorAccountSchema = z.object({
  username: z.string(),
  // Optional admin-chosen password, exactly as CreateActivatorSchema:
  // omit it to let the server generate one and return it once.
  password: z.string().min(8).optional(),
});
export type CreateDistributorAccountCommand = z.infer<typeof CreateDistributorAccountSchema>;
