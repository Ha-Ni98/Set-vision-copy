import { z } from 'zod';
import { paginated } from '../../common/types';
import { RevocationRequestStat } from './card-revocation-request.enums';

export const CardRevocationRequestResponseSchema = z.object({
  id: z.uuid(),
  cardId: z.uuid(),
  // nullable: the DISTRIBUTOR path gates this through distributorVisibleKey(), so an approved
  // revocation (card back at AT_DISTRIBUTOR and re-sellable, Set 7 §0.6) stops publishing a live
  // key. The ADMIN path is unchanged and always receives the full key (toDTO vs toMineDTO).
  cardKey: z.string().nullable(),
  activationId: z.uuid().nullable(),
  distributorId: z.uuid(),
  distributorName: z.string(),
  subscriptionLabel: z.string(),
  reason: z.string(),
  stat: z.enum(RevocationRequestStat),
  adminNote: z.string().nullable(),
  reviewedByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
});
export type CardRevocationRequestDTO = z.infer<typeof CardRevocationRequestResponseSchema>;

export const RevocableCardResponseSchema = z.object({
  cardId: z.uuid(),
  // Full key, and that is correct under the Set 7 policy: this query returns
  // ACTIVATION_FAILED cards only, which distributorVisibleKey() puts in the full tier. If this
  // query's cardStat predicate ever widens, route this field through distributorVisibleKey().
  cardKey: z.string(),
  subscriptionLabel: z.string(),
  activationId: z.uuid().nullable(),
  failedAt: z.iso.datetime().nullable(),
  clientFullName: z.string().nullable(),
});
export type RevocableCardDTO = z.infer<typeof RevocableCardResponseSchema>;

export const PaginatedCardRevocationRequestsSchema = paginated(CardRevocationRequestResponseSchema);
export type PaginatedCardRevocationRequests = z.infer<typeof PaginatedCardRevocationRequestsSchema>;
