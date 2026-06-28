import { z } from 'zod';

export const GetDeliveryCompaniesQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
});
export type GetDeliveryCompaniesQuery = z.infer<typeof GetDeliveryCompaniesQuerySchema>;

export const DeliveryCompanyIdParamsSchema = z.object({
  id: z.uuid(),
});
export type DeliveryCompanyIdParams = z.infer<typeof DeliveryCompanyIdParamsSchema>;
