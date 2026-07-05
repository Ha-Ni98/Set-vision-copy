import { z } from 'zod';

export const CreateLotSchema = z.object({
  subscriptionPlanId: z.uuid(),
  cardIds: z.array(z.uuid()).nonempty(),
});
export type CreateLotCommand = z.infer<typeof CreateLotSchema>;
