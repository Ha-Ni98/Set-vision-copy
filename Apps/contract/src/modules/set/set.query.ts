import { z } from 'zod';
import { SetStat } from './set.enums';

export const GetSetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  subscriptionPlanId: z.uuid().optional(),
  state: z.enum(SetStat).optional(),
});
export type GetSetsQuery = z.infer<typeof GetSetsQuerySchema>;

export const SetIdParamsSchema = z.object({
  id: z.uuid(),
});
export type SetIdParams = z.infer<typeof SetIdParamsSchema>;
