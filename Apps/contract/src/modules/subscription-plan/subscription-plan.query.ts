import { z } from 'zod';
import { BooleanQuerySchema } from '../../common/types';

export const GetSubscriptionPlansQuerySchema = z.object({
  active: BooleanQuerySchema.optional(),
});
export type GetSubscriptionPlansQuery = z.infer<typeof GetSubscriptionPlansQuerySchema>;

export const SubscriptionPlanIdParamsSchema = z.object({
  id: z.uuid(),
});
export type SubscriptionPlanIdParams = z.infer<typeof SubscriptionPlanIdParamsSchema>;
