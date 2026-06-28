import { z } from 'zod';
import { DeliveryType, OrderStat } from './order.enums';

export const CreateOrderSchema = z.object({
  distributorId: z.uuid(),
  lotIds: z.array(z.uuid()).nonempty(),
  receivedName: z.string(),
  receivedPhone: z.string(),
  wilayaId: z.uuid(),
  communeId: z.uuid(),
  deliveryCompanyId: z.uuid(),
  deliveryType: z.enum(DeliveryType),
  orderPrice: z.number().positive().multipleOf(0.01),
  deliverPrice: z.number().nonnegative().multipleOf(0.01),
});
export type CreateOrderCommand = z.infer<typeof CreateOrderSchema>;

export const TransitionOrderSchema = z.object({
  to: z.enum([OrderStat.IN_DELIVERY, OrderStat.DELIVERED, OrderStat.RETURNED]),
  deliveredCount: z.number().int().nonnegative().optional(),
});
export type TransitionOrderCommand = z.infer<typeof TransitionOrderSchema>;
