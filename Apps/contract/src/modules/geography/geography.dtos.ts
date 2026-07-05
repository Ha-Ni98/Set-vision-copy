import { z } from 'zod';

export const WilayaResponseSchema = z.object({
  id: z.uuid(),
  wilayaCode: z.string(),
  frName: z.string(),
  arName: z.string(),
});
export type WilayaDTO = z.infer<typeof WilayaResponseSchema>;

export const CommuneResponseSchema = z.object({
  id: z.uuid(),
  communeCode: z.string(),
  wilayaId: z.uuid(),
  frName: z.string(),
  arName: z.string(),
});
export type CommuneDTO = z.infer<typeof CommuneResponseSchema>;
