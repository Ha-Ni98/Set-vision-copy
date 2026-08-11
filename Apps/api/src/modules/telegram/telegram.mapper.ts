import { TelegramLinkStatusResponseSchema, type TelegramLinkStatusDTO, type UserRole } from '@my-app/contract';

export type TelegramProfileRow = {
  id: string;
  name: string;
  telegramChatId: string | null;
  telegramLinkToken: string | null;
  telegramLinkedAt: Date | null;
};

export class TelegramMapper {
  // botUsername is '' when TELEGRAM_BOT_USERNAME is unset (NOTIFICATIONS_ENABLED=false) —
  // deepLink degrades to null rather than emitting a broken https://t.me/?start=... link.
  static toDTO(role: UserRole, row: TelegramProfileRow, botUsername: string): TelegramLinkStatusDTO {
    const dto: TelegramLinkStatusDTO = {
      role,
      profileId: row.id,
      name: row.name,
      isLinked: row.telegramChatId !== null,
      linkedAt: row.telegramLinkedAt ? row.telegramLinkedAt.toISOString() : null,
      hasPendingToken: row.telegramLinkToken !== null,
      deepLink:
        row.telegramLinkToken && botUsername
          ? `https://t.me/${botUsername}?start=${row.telegramLinkToken}`
          : null,
    };
    return TelegramLinkStatusResponseSchema.parse(dto);
  }
}
