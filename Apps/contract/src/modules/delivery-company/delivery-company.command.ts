import { z } from 'zod';

export const CreateDeliveryCompanySchema = z.object({
  name: z.string(),
  registeredName: z.string(),
});
export type CreateDeliveryCompanyCommand = z.infer<typeof CreateDeliveryCompanySchema>;

export const UpdateDeliveryCompanySchema = z.object({
  name: z.string().optional(),
  registeredName: z.string().optional(),
});
export type UpdateDeliveryCompanyCommand = z.infer<typeof UpdateDeliveryCompanySchema>;
