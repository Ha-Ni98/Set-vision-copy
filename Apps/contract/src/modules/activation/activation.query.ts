import { z } from 'zod';
import { ActivationStat } from './activation.enums';

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
