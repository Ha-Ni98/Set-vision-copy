import { z } from 'zod';

export const CreateLotSchema = z.object({
  subscriptionPlanId: z.uuid(),
  cardIds: z
    .array(z.uuid())
    .nonempty()
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Duplicate card IDs are not allowed',
    }),
});
export type CreateLotCommand = z.infer<typeof CreateLotSchema>;
