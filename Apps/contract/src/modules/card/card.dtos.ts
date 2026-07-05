import { z } from 'zod';
import { paginated } from '../../common/types';
import { CardStat } from './card.enums';

export const CardResponseSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  subscriptionPlanId: z.uuid(),
  subscriptionLabel: z.string(),
  setNumber: z.string(),
  lotNumber: z.string().nullable(),
  distributorName: z.string().nullable(),
  cardStat: z.enum(CardStat),
  isActive: z.boolean(),
  isDisabled: z.boolean(),
  isRevoked: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type CardDTO = z.infer<typeof CardResponseSchema>;

export const CardDetailResponseSchema = CardResponseSchema.extend({
  distributionTimeline: z.array(
    z.object({
      stat: z.enum(CardStat),
      at: z.iso.datetime(),
    }),
  ),
});
export type CardDetailDTO = z.infer<typeof CardDetailResponseSchema>;

export const AvailableCardResponseSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  subscriptionLabel: z.string(),
});
export type AvailableCardDTO = z.infer<typeof AvailableCardResponseSchema>;

export const PaginatedCardsSchema = paginated(CardResponseSchema);
export type PaginatedCards = z.infer<typeof PaginatedCardsSchema>;
