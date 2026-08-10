import { z } from 'zod';
import { OrderRequestStat } from './card-order-request.enums';

export const OrderRequestCreatedPayloadSchema = z.object({
  requestId: z.uuid(),
  distributorId: z.uuid(), // Distributor.id — the room key, not User.id
  distributorName: z.string(),
  subscriptionLabel: z.string(),
  nbOfCards: z.number().int(),
  timestamp: z.iso.datetime(),
});
export type OrderRequestCreatedPayload = z.infer<typeof OrderRequestCreatedPayloadSchema>;

export const OrderRequestStatusChangedPayloadSchema = z.object({
  requestId: z.uuid(),
  distributorId: z.uuid(),
  stat: z.enum(OrderRequestStat),
  previousStat: z.enum(OrderRequestStat),
  orderId: z.uuid().nullable(),
  timestamp: z.iso.datetime(),
});
export type OrderRequestStatusChangedPayload = z.infer<typeof OrderRequestStatusChangedPayloadSchema>;

export type CardOrderRequestEvents = {
  'order-request:created': OrderRequestCreatedPayload;
  'order-request:status-changed': OrderRequestStatusChangedPayload;
};
