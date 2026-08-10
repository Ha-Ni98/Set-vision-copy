import { z } from 'zod';

export const CreateActivationEmailSchema = z.object({
  subscriptionPlanId: z.uuid(),
  email: z.email(),
});
export type CreateActivationEmailCommand = z.infer<typeof CreateActivationEmailSchema>;
