import { z } from 'zod';
import { OrderRequestStat } from './card-order-request.enums';

export const GetCardOrderRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  distributorId: z.uuid().optional(),
  subscriptionPlanId: z.uuid().optional(),
  state: z.enum(OrderRequestStat).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
});
export type GetCardOrderRequestsQuery = z.infer<typeof GetCardOrderRequestsQuerySchema>;

export const GetMyCardOrderRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  state: z.enum(OrderRequestStat).optional(),
});
export type GetMyCardOrderRequestsQuery = z.infer<typeof GetMyCardOrderRequestsQuerySchema>;

export const CardOrderRequestIdParamsSchema = z.object({
  id: z.uuid(),
});
export type CardOrderRequestIdParams = z.infer<typeof CardOrderRequestIdParamsSchema>;
