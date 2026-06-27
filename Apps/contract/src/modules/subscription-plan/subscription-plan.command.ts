import { z } from 'zod';
import { SubscriptionDuration, SubscriptionType } from './subscription-plan.enums';

export const CreateSubscriptionPlanSchema = z.object({
  subscriptionType: z.enum(SubscriptionType),
  subscriptionDuration: z.enum(SubscriptionDuration),
});
export type CreateSubscriptionPlanCommand = z.infer<typeof CreateSubscriptionPlanSchema>;

export const UpdateCommissionSchema = z.object({
  subscriptionPlanId: z.uuid(),
  commissionDurationId: z.uuid(),
  commission: z.number().nonnegative().multipleOf(0.01),
});
export type UpdateCommissionCommand = z.infer<typeof UpdateCommissionSchema>;
