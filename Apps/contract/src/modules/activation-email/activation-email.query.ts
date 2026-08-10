import { z } from 'zod';

export const GetActivationEmailsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  subscriptionPlanId: z.uuid().optional(),
  search: z.string().optional(),
});
export type GetActivationEmailsQuery = z.infer<typeof GetActivationEmailsQuerySchema>;

export const GetActivationEmailPoolQuerySchema = z.object({
  subscriptionPlanId: z.uuid(),
});
export type GetActivationEmailPoolQuery = z.infer<typeof GetActivationEmailPoolQuerySchema>;

export const ActivationEmailIdParamsSchema = z.object({
  id: z.uuid(),
});
export type ActivationEmailIdParams = z.infer<typeof ActivationEmailIdParamsSchema>;
