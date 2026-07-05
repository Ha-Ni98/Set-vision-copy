import { z } from 'zod';

export const WilayaIdParamsSchema = z.object({
  wilayaId: z.uuid(),
});
export type WilayaIdParams = z.infer<typeof WilayaIdParamsSchema>;
