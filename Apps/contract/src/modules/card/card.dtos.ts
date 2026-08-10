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

// Distributor-facing. Built field-by-field from scratch — NOT derived from CardResponseSchema.
// That schema's `key` is a required z.string(); any .omit()/.extend() derivation still starts
// from the full entity shape, which is the pattern contract-rules §3.5 forbids ("build a DTO
// from the fields you want; never start from the full entity and try to remember what to strip").
//
// Deliberately absent versus CardDTO:
//   setNumber       — production data; a distributor has no relationship to a printing set
//   distributorName — always the viewer; redundant, and echoing scope back invites its use as a filter
//   isActive        — internal circulation flag with no distributor-facing meaning
export const DistributorCardResponseSchema = z.object({
  id: z.uuid(),
  // null OR a server-truncated prefix OR the full key, decided ONLY by CardMapper's key gate
  // (distributorVisibleKey — the single authority). Never masked, truncated or hidden anywhere
  // on the client.
  key: z.string().nullable(),
  subscriptionPlanId: z.uuid(),
  subscriptionLabel: z.string(),
  lotNumber: z.string().nullable(),
  cardStat: z.enum(CardStat),
  isDisabled: z.boolean(),
  isRevoked: z.boolean(),
  deliveredAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type DistributorCardDTO = z.infer<typeof DistributorCardResponseSchema>;

export const PaginatedDistributorCardsSchema = paginated(DistributorCardResponseSchema);
export type PaginatedDistributorCards = z.infer<typeof PaginatedDistributorCardsSchema>;
