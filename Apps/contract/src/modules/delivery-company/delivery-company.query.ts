import { z } from 'zod';
import { BooleanQuerySchema } from '../../common/types';

export const GetDeliveryCompaniesQuerySchema = z.object({
  active: BooleanQuerySchema.optional(),
});
export type GetDeliveryCompaniesQuery = z.infer<typeof GetDeliveryCompaniesQuerySchema>;

export const DeliveryCompanyIdParamsSchema = z.object({
  id: z.uuid(),
});
export type DeliveryCompanyIdParams = z.infer<typeof DeliveryCompanyIdParamsSchema>;
