import { z } from 'zod';
import { paginated } from '../../common/types';
import { LotStat } from './lot.enums';

export const LotResponseSchema = z.object({
  id: z.uuid(),
  lotNumber: z.string(),
  subscriptionPlanId: z.uuid(),
  subscriptionLabel: z.string(),
  lotStat: z.enum(LotStat),
  nbOfCards: z.number().int(),
  deliveredCardsCount: z.number().int(),
  isReturned: z.boolean(),
  createdAt: z.iso.datetime(),
  deliveryDate: z.iso.datetime().nullable(),
});
export type LotDTO = z.infer<typeof LotResponseSchema>;

export const PaginatedLotsSchema = paginated(LotResponseSchema);
export type PaginatedLots = z.infer<typeof PaginatedLotsSchema>;
