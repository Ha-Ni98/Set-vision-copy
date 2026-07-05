import { z } from 'zod';
import { SetStat } from './set.enums';

// Card key format: 8 uppercase alphanumeric characters, A-Z and 0-9 (e.g. "A1B2C3D4") —
// matches the server's and client's generators (8 random bytes mapped onto the 36-symbol
// alphabet). Shared so the client generator, the client form schema, and this command all
// validate the same shape (Stage-04-fix).
export const CARD_KEY_PATTERN = /^[A-Z0-9]{8}$/;
export const MAX_KEYS_PER_SET = 1000;

// A set is now created from an explicit, admin-editable list of keys (Stage-04-fix) rather
// than a bare count. The server derives numberOfKeys from keys.length and rejects any key
// that already exists.
export const CreateSetSchema = z.object({
  subscriptionPlanId: z.uuid(),
  keys: z
    .array(z.string().regex(CARD_KEY_PATTERN))
    .min(1)
    .max(MAX_KEYS_PER_SET)
    .refine((keys) => new Set(keys).size === keys.length, {
      message: 'Duplicate keys are not allowed',
    }),
});
export type CreateSetCommand = z.infer<typeof CreateSetSchema>;

export const TransitionSetSchema = z.object({
  to: z.enum([SetStat.PENDING_PRINTING, SetStat.PRINTED]),
});
export type TransitionSetCommand = z.infer<typeof TransitionSetSchema>;
