import { z } from 'zod';
import { paginated } from '../../common/types';

// Settings-list row. `isDeleted`/`deletedAt` appear in no DTO — an internal flag
// (contract-rules §3.5), and every route already filters on it. `email` is `z.string()`, not
// `z.email()`: it is an echo of stored data, and a DTO that can fail `.parse()` on legacy data
// is a liability — validation belongs on the inbound command.
export const ActivationEmailResponseSchema = z.object({
  id: z.uuid(),
  subscriptionPlanId: z.uuid(),
  planLabel: z.string(),
  email: z.string(),
  nbOfActivation: z.number().int(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type ActivationEmailDTO = z.infer<typeof ActivationEmailResponseSchema>;

export const PaginatedActivationEmailsSchema = paginated(ActivationEmailResponseSchema);
export type PaginatedActivationEmails = z.infer<typeof PaginatedActivationEmailsSchema>;

// Picker option — no plan/deletion fields, this is already scoped to one plan and one status.
export const ActivationEmailOptionResponseSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  nbOfActivation: z.number().int(),
  lastUsedAt: z.iso.datetime().nullable(),
});
export type ActivationEmailOptionDTO = z.infer<typeof ActivationEmailOptionResponseSchema>;
