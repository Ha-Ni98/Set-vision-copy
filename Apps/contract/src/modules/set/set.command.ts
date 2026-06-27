import { z } from 'zod';
import { SetStat } from './set.enums';

export const CreateSetSchema = z.object({
  numberOfKeys: z.number().int().positive(),
  subscriptionPlanId: z.uuid(),
});
export type CreateSetCommand = z.infer<typeof CreateSetSchema>;

export const TransitionSetSchema = z.object({
  to: z.enum([SetStat.PENDING_PRINTING, SetStat.PRINTED]),
});
export type TransitionSetCommand = z.infer<typeof TransitionSetSchema>;
