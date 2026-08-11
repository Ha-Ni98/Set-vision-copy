import { z } from 'zod';
import { ActivationStat } from './activation.enums';
import { CardStat } from '../card/card.enums';

// Used by KEY_ROUTES UPDATE / ADDITIONAL / STATUS (segment: :activationId)
export const ActivationIdParamsSchema = z.object({
  activationId: z.uuid(),
});
export type ActivationIdParams = z.infer<typeof ActivationIdParamsSchema>;

// Used by ACTIVATION_ROUTES actions (segment: :id)
export const ActivationActionParamsSchema = z.object({
  id: z.uuid(),
});
export type ActivationActionParams = z.infer<typeof ActivationActionParamsSchema>;

export const GetActivationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  subscriptionPlanId: z.uuid().optional(),
  activatorId: z.uuid().optional(),
  state: z.enum(ActivationStat).optional(),
  distributorId: z.uuid().optional(),
  wilayaId: z.uuid().optional(),
  communeId: z.uuid().optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  key: z.string().optional(),
});
export type GetActivationsQuery = z.infer<typeof GetActivationsQuerySchema>;

export const GetActivatorHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  status: z.enum(ActivationStat).optional(),
  sortBy: z
    .enum(['requestedAt', 'completedAt', 'durationSeconds', 'activationPrice'])
    .optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  search: z.string().optional(),
});
export type GetActivatorHistoryQuery = z.infer<typeof GetActivatorHistoryQuerySchema>;

// Distributor-scoped list of activations against the principal's own cards. No distributorId,
// no activatorId — scope is always the signed-in principal, and activator identity is never
// visible on this path (Set 7 §4.1).
//
// Search is deliberately clientFullName/clientPhone ONLY — never the card key. A key search
// would let a distributor confirm a full key against an ACTIVATION_PROGRESS card, whose key
// they are only allowed to see the first 4 characters of, turning the search box into an
// oracle that defeats the key-visibility gate (card.mapper.ts's distributorVisibleKey).
//
// sortBy is a closed whitelist (never an arbitrary column) with a SEPARATE sortDir field, unlike
// GetActivatorHistoryQuery — that gap is what forced HistoryPage.tsx into a client-side sort;
// this schema is genuinely server-sortable. durationSeconds is intentionally absent: it is
// computed (completedAt - takenAt), not a column, and Prisma cannot orderBy a computed value.
export const GetDistributorActivationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  state: z.enum(ActivationStat).optional(),
  subscriptionPlanId: z.uuid().optional(),
  cardStat: z.enum(CardStat).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  sortBy: z.enum(['requestedAt', 'completedAt']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});
export type GetDistributorActivationsQuery = z.infer<typeof GetDistributorActivationsQuerySchema>;

export const DistributorActivationIdParamsSchema = z.object({
  id: z.uuid(),
});
export type DistributorActivationIdParams = z.infer<typeof DistributorActivationIdParamsSchema>;
