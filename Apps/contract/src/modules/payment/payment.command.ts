import { z } from 'zod';

export const RecordPaymentSchema = z.object({
  activatorId: z.uuid(),
  amount: z.number().positive().multipleOf(0.01),
  date: z.iso.datetime().optional(),
});
export type RecordPaymentCommand = z.infer<typeof RecordPaymentSchema>;
