import { z } from 'zod';

export const GetSubscriptionPlansQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
});
export type GetSubscriptionPlansQuery = z.infer<typeof GetSubscriptionPlansQuerySchema>;

export const SubscriptionPlanIdParamsSchema = z.object({
  id: z.uuid(),
});
export type SubscriptionPlanIdParams = z.infer<typeof SubscriptionPlanIdParamsSchema>;
