import { z } from 'zod';
import { RevocationRequestStat } from './card-revocation-request.enums';

export const GetCardRevocationRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  distributorId: z.uuid().optional(),
  state: z.enum(RevocationRequestStat).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
});
export type GetCardRevocationRequestsQuery = z.infer<typeof GetCardRevocationRequestsQuerySchema>;

export const GetMyCardRevocationRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  state: z.enum(RevocationRequestStat).optional(),
});
export type GetMyCardRevocationRequestsQuery = z.infer<typeof GetMyCardRevocationRequestsQuerySchema>;

export const CardRevocationRequestIdParamsSchema = z.object({
  id: z.uuid(),
});
export type CardRevocationRequestIdParams = z.infer<typeof CardRevocationRequestIdParamsSchema>;
