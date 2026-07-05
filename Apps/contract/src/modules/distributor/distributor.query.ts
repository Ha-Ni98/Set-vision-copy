import { z } from 'zod';

export const GetDistributorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  wilayaId: z.uuid().optional(),
  communeId: z.uuid().optional(),
});
export type GetDistributorsQuery = z.infer<typeof GetDistributorsQuerySchema>;

export const DistributorIdParamsSchema = z.object({
  id: z.uuid(),
});
export type DistributorIdParams = z.infer<typeof DistributorIdParamsSchema>;
