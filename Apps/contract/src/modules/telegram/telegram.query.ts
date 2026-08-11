import { z } from 'zod';
import { UserRole } from '../user/user.enums';

export const TelegramLinkParamsSchema = z.object({
  role: z.enum(UserRole),
  profileId: z.uuid(),
});
export type TelegramLinkParams = z.infer<typeof TelegramLinkParamsSchema>;
