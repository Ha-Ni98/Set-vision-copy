import { z } from 'zod';
import { paginated } from '../../common/types';
import { LotStat } from '../lot/lot.enums';
import { DeliveryType, OrderStat } from './order.enums';

export const OrderResponseSchema = z.object({
  id: z.uuid(),
  orderNumber: z.string(),
  distributorId: z.uuid(),
  distributorName: z.string(),
  receivedName: z.string(),
  receivedPhone: z.string(),
  wilayaId: z.uuid(),
  wilayaName: z.string(),
  communeId: z.uuid(),
  communeName: z.string(),
  deliveryCompanyId: z.uuid(),
  deliveryCompanyName: z.string(),
  deliveryType: z.enum(DeliveryType),
  lotNumbers: z.array(z.string()),
  cardsCount: z.number().int(),
  orderPrice: z.number(),
  deliverPrice: z.number(),
  cardsDeliveredCount: z.number().int(),
  orderStat: z.enum(OrderStat),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});
export type OrderDTO = z.infer<typeof OrderResponseSchema>;

export const OrderDetailResponseSchema = OrderResponseSchema.extend({
  lots: z.array(
    z.object({
      lotId: z.uuid(),
      lotNumber: z.string(),
      subscriptionLabel: z.string(),
      cardsCount: z.number().int(),
      lotStat: z.enum(LotStat),
    }),
  ),
});
export type OrderDetailDTO = z.infer<typeof OrderDetailResponseSchema>;

export const PaginatedOrdersSchema = paginated(OrderResponseSchema);
export type PaginatedOrders = z.infer<typeof PaginatedOrdersSchema>;
