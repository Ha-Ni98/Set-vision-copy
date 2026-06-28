import { z } from 'zod';

export const GetAdminsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});
export type GetAdminsQuery = z.infer<typeof GetAdminsQuerySchema>;

export const AdminIdParamsSchema = z.object({
  id: z.uuid(),
});
export type AdminIdParams = z.infer<typeof AdminIdParamsSchema>;
