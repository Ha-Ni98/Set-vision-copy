import { z } from 'zod';
import { LotStat } from './lot.enums';

export const GetLotsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  subscriptionPlanId: z.uuid().optional(),
  state: z.enum(LotStat).optional(),
});
export type GetLotsQuery = z.infer<typeof GetLotsQuerySchema>;

export const GetAvailableLotsQuerySchema = z.object({
  subscriptionPlanId: z.uuid().optional(),
});
export type GetAvailableLotsQuery = z.infer<typeof GetAvailableLotsQuerySchema>;

export const LotIdParamsSchema = z.object({
  id: z.uuid(),
});
export type LotIdParams = z.infer<typeof LotIdParamsSchema>;
