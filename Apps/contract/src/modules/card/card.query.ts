import { z } from 'zod';
import { CardFlag, CardStat } from './card.enums';

export const GetCardsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  state: z.enum(CardStat).optional(),
  setNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  distributorId: z.uuid().optional(),
  subscriptionPlanId: z.uuid().optional(),
  flag: z.enum(CardFlag).optional(),
});
export type GetCardsQuery = z.infer<typeof GetCardsQuerySchema>;

export const GetAvailableCardsQuerySchema = z.object({
  subscriptionPlanId: z.uuid(),
});
export type GetAvailableCardsQuery = z.infer<typeof GetAvailableCardsQuerySchema>;

export const CardIdParamsSchema = z.object({
  id: z.uuid(),
});
export type CardIdParams = z.infer<typeof CardIdParamsSchema>;
