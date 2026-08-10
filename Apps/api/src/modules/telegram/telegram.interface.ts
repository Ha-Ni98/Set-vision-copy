import type { UserRole, TelegramLinkStatusDTO } from '@my-app/contract';

export interface ITelegramService {
  getLinkStatus(role: UserRole, profileId: string): Promise<TelegramLinkStatusDTO>;
  generateToken(role: UserRole, profileId: string, actorId: string): Promise<TelegramLinkStatusDTO>;
  unlink(role: UserRole, profileId: string, actorId: string): Promise<TelegramLinkStatusDTO>;
}
