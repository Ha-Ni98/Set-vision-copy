import { z } from 'zod';
import { paginated } from '../../common/types';
import { SetStat } from './set.enums';

export const SetResponseSchema = z.object({
  id: z.uuid(),
  setNumber: z.string(),
  subscriptionPlanId: z.uuid(),
  subscriptionLabel: z.string(),
  numberOfKeys: z.number().int(),
  setStat: z.enum(SetStat),
  createdAt: z.iso.datetime(),
  printedAt: z.iso.datetime().nullable(),
});
export type SetDTO = z.infer<typeof SetResponseSchema>;

export const PaginatedSetsSchema = paginated(SetResponseSchema);
export type PaginatedSets = z.infer<typeof PaginatedSetsSchema>;
