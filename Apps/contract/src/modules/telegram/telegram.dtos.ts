import { z } from 'zod';
import { UserRole } from '../user/user.enums';

export const TelegramLinkStatusResponseSchema = z.object({
  role: z.enum(UserRole),
  profileId: z.uuid(),
  name: z.string(),
  isLinked: z.boolean(),
  linkedAt: z.iso.datetime().nullable(),
  hasPendingToken: z.boolean(),
  // https://t.me/<bot>?start=<token>, assembled server-side. Null when no token is pending.
  deepLink: z.string().nullable(),
});
export type TelegramLinkStatusDTO = z.infer<typeof TelegramLinkStatusResponseSchema>;
