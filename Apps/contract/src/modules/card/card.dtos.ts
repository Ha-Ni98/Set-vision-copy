import { z } from 'zod';
import { paginated, PaginationMetaSchema } from '../../common/types';
import { CardStat, CardUnavailableReason } from './card.enums';

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

// Built field-by-field, not derived from CardResponseSchema (contract-rules §3.5). The plan is
// fixed by the query, so no subscriptionLabel per card — the modal already knows it.
export const AvailableCardItemSchema = z.object({
  id: z.uuid(),
  key: z.string(),
});
export type AvailableCardItemDTO = z.infer<typeof AvailableCardItemSchema>;

export const AvailableCardSetGroupSchema = z.object({
  setId: z.uuid(),
  setNumber: z.string(),
  setCreatedAt: z.iso.datetime(),
  // Always === cards.length. Explicit so the UI never has to infer "is this group complete?" —
  // it always is (set-8-plan §3.1), and select-all-in-set depends on that being unambiguous.
  availableCount: z.number().int(),
  cards: z.array(AvailableCardItemSchema),
});
export type AvailableCardSetGroupDTO = z.infer<typeof AvailableCardSetGroupSchema>;

// NOT built with paginated() — that factory is { items, meta } and this response pages over
// groups while also reporting a card-level total, which the factory cannot express.
export const AvailableCardsBySetSchema = z.object({
  groups: z.array(AvailableCardSetGroupSchema),
  // meta.total / meta.totalPages count SETS. meta.limit is sets per page.
  meta: PaginationMetaSchema,
  // Every eligible card for this plan under the current search, across all pages. This is the
  // denominator of the selection counter (set-8-plan §4.3) — never groups.length or a page sum.
  totalAvailableCards: z.number().int(),
});
export type AvailableCardsBySetDTO = z.infer<typeof AvailableCardsBySetSchema>;

// The shape of ApiResponse.error.details on a 409 from LOT_ROUTES.CREATE. AppError.details is
// `unknown` by design, so this is the contract's description of one specific error body — the
// same job CreateSetModal's ad-hoc `{ takenKeys }` parse does today, typed instead of guessed.
export const UnavailableCardSchema = z.object({
  cardId: z.uuid(),
  // null ONLY for NOT_FOUND — there is no row to read a key from. Every other reason names it.
  key: z.string().nullable(),
  reason: z.enum(CardUnavailableReason),
});
export type UnavailableCardDTO = z.infer<typeof UnavailableCardSchema>;

export const LotCreationConflictDetailsSchema = z.object({
  unavailableCards: z.array(UnavailableCardSchema).nonempty(),
});
export type LotCreationConflictDetails = z.infer<typeof LotCreationConflictDetailsSchema>;

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
