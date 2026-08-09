import { z } from 'zod';
import { paginated } from '../../common/types';

export const DistributorResponseSchema = z.object({
  id: z.uuid(),
  // Account fields: null/false for inventory-only distributors (D2).
  hasAccount: z.boolean(),
  username: z.string().nullable(),
  fullName: z.string(),
  storeName: z.string(),
  phone: z.string(),
  wilayaId: z.uuid(),
  wilayaName: z.string(),
  communeId: z.uuid(),
  communeName: z.string(),
  isEnabled: z.boolean(),
  nbOfActiveCards: z.number().int(),
  nbOfActivation: z.number().int(),
  deliveredOrdersCount: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type DistributorDTO = z.infer<typeof DistributorResponseSchema>;

export const DistributorDetailResponseSchema = DistributorResponseSchema.extend({
  soldKeys: z.number().int(),
  ordersCount: z.number().int(),
});
export type DistributorDetailDTO = z.infer<typeof DistributorDetailResponseSchema>;

export const PaginatedDistributorsSchema = paginated(DistributorResponseSchema);
export type PaginatedDistributors = z.infer<typeof PaginatedDistributorsSchema>;

// Sanctioned §0.1.1 exception: one-time create-account response.
// Byte-for-byte the shape of ActivatorWithCredentialsResponseSchema.
export const DistributorWithCredentialsResponseSchema = z.object({
  distributor: DistributorResponseSchema,
  generatedPassword: z.string(),
});
export type DistributorWithCredentialsDTO = z.infer<typeof DistributorWithCredentialsResponseSchema>;
