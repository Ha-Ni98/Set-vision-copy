import { z } from 'zod';

export const GetActivatorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});
export type GetActivatorsQuery = z.infer<typeof GetActivatorsQuerySchema>;

export const ActivatorIdParamsSchema = z.object({
  id: z.uuid(),
});
export type ActivatorIdParams = z.infer<typeof ActivatorIdParamsSchema>;

export const ActivatorPerformanceQuerySchema = z.object({
  days: z.coerce.number().int().min(1).default(30),
});
export type ActivatorPerformanceQuery = z.infer<typeof ActivatorPerformanceQuerySchema>;
