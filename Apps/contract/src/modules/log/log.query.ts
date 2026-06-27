import { z } from 'zod';
import { LogActionType } from './log.enums';

export const GetLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  userId: z.uuid().optional(),
  actionType: z.enum(LogActionType).optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  search: z.string().optional(),
});
export type GetLogsQuery = z.infer<typeof GetLogsQuerySchema>;
