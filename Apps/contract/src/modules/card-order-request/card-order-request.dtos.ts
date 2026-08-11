import { z } from 'zod';
import { paginated } from '../../common/types';
import { OrderRequestStat } from './card-order-request.enums';

export const CardOrderRequestResponseSchema = z.object({
  id: z.uuid(),
  distributorId: z.uuid(),
  distributorName: z.string(),
  subscriptionPlanId: z.uuid(),
  subscriptionLabel: z.string(),
  nbOfCards: z.number().int(),
  note: z.string().nullable(),
  stat: z.enum(OrderRequestStat),
  adminNote: z.string().nullable(),
  reviewedByName: z.string().nullable(),
  orderId: z.uuid().nullable(),
  orderNumber: z.string().nullable(),
  createdAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
});
export type CardOrderRequestDTO = z.infer<typeof CardOrderRequestResponseSchema>;

export const LinkableCardOrderRequestResponseSchema = z.object({
  id: z.uuid(),
  distributorId: z.uuid(),
  distributorName: z.string(),
  subscriptionLabel: z.string(),
  nbOfCards: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type LinkableCardOrderRequestDTO = z.infer<typeof LinkableCardOrderRequestResponseSchema>;

export const PaginatedCardOrderRequestsSchema = paginated(CardOrderRequestResponseSchema);
export type PaginatedCardOrderRequests = z.infer<typeof PaginatedCardOrderRequestsSchema>;
