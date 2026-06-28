import { z } from 'zod';

export const GetPaymentsQuerySchema = z.object({
  activatorId: z.uuid().optional(),
  includeDeleted: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type GetPaymentsQuery = z.infer<typeof GetPaymentsQuerySchema>;

export const PaymentIdParamsSchema = z.object({
  id: z.uuid(),
});
export type PaymentIdParams = z.infer<typeof PaymentIdParamsSchema>;
