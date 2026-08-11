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

// `page`/`limit` page over SETS, not cards — a page carries every eligible card of every set on
// it (set-8-plan §2.5/§3.1), so `limit` is capped low: it is a payload bound, not a UI preference.
export const GetAvailableCardsQuerySchema = z.object({
  subscriptionPlanId: z.uuid(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5).optional(),
});
export type GetAvailableCardsQuery = z.infer<typeof GetAvailableCardsQuerySchema>;

export const CardIdParamsSchema = z.object({
  id: z.uuid(),
});
export type CardIdParams = z.infer<typeof CardIdParamsSchema>;

// Distributor-scoped list — deliberately no distributorId field. Scope is always the signed-in
// principal (resolved server-side from the JWT), never a query parameter.
export const GetDistributorCardsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  cardStat: z.enum(CardStat).optional(),
  subscriptionPlanId: z.uuid().optional(),
  flag: z.enum(CardFlag).optional(),
});
export type GetDistributorCardsQuery = z.infer<typeof GetDistributorCardsQuerySchema>;
