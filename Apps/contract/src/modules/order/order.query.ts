import { z } from 'zod';
import { OrderStat } from './order.enums';

export const GetOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  distributorId: z.uuid().optional(),
  wilayaId: z.uuid().optional(),
  deliveryCompanyId: z.uuid().optional(),
  state: z.enum(OrderStat).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
});
export type GetOrdersQuery = z.infer<typeof GetOrdersQuerySchema>;

export const OrderIdParamsSchema = z.object({
  id: z.uuid(),
});
export type OrderIdParams = z.infer<typeof OrderIdParamsSchema>;
