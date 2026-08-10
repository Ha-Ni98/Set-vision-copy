import { z } from 'zod';
import { paginated } from '../../common/types';
import { RevocationRequestStat } from './card-revocation-request.enums';

export const CardRevocationRequestResponseSchema = z.object({
  id: z.uuid(),
  cardId: z.uuid(),
  cardKey: z.string(),
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
  cardKey: z.string(),
  subscriptionLabel: z.string(),
  activationId: z.uuid().nullable(),
  failedAt: z.iso.datetime().nullable(),
  clientFullName: z.string().nullable(),
});
export type RevocableCardDTO = z.infer<typeof RevocableCardResponseSchema>;

export const PaginatedCardRevocationRequestsSchema = paginated(CardRevocationRequestResponseSchema);
export type PaginatedCardRevocationRequests = z.infer<typeof PaginatedCardRevocationRequestsSchema>;
