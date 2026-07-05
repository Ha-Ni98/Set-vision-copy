import { z } from 'zod';
import { LogActionType } from './log.enums';
import { paginated } from '../../common/types';

export const LogResponseSchema = z.object({
  id: z.uuid(),
  actionType: z.enum(LogActionType),
  actionDescription: z.string(),
  userName: z.string(),
  createdAt: z.iso.datetime(),
});
export type LogDTO = z.infer<typeof LogResponseSchema>;

export const PaginatedLogsSchema = paginated(LogResponseSchema);
export type PaginatedLogs = z.infer<typeof PaginatedLogsSchema>;
