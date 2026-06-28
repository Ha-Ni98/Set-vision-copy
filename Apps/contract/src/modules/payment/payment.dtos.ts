import { z } from 'zod';
import { paginated } from '../../common/types';

export const PaymentResponseSchema = z.object({
  id: z.uuid(),
  activatorId: z.uuid(),
  amount: z.number(),
  previousCredits: z.number(),
  paymentDate: z.iso.datetime(),
  recordedByName: z.string(),
  isDeleted: z.boolean(),
});
export type PaymentDTO = z.infer<typeof PaymentResponseSchema>;

export const PaginatedPaymentsSchema = paginated(PaymentResponseSchema);
export type PaginatedPayments = z.infer<typeof PaginatedPaymentsSchema>;
