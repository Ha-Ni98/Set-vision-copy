import { z } from 'zod';

export const DeliveryCompanyResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  registeredName: z.string(),
  isActive: z.boolean(),
});
export type DeliveryCompanyDTO = z.infer<typeof DeliveryCompanyResponseSchema>;
