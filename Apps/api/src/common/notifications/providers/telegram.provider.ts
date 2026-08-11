import { NotificationChannel } from '@my-app/contract';
import type { NotificationProvider } from '../notification.types';

// Plain fetch — no dependency (CLAUDE.md: no new library without asking).
//
// `parse_mode` is DELIBERATELY OMITTED — plain text only. This is a correctness
// requirement, not a style choice: message bodies can carry the client's Snapchat PASSWORD,
// which may contain every MarkdownV2 metacharacter (`_ * [ ] ( ) ~ \` > # + - = | { } . !`).
// With parse_mode set, an unescaped metacharacter either 400s ("can't parse entities") or
// silently drops characters — i.e. delivers a WRONG password to the activator. Formatting is
// newlines and plain labels only. NEVER add a parse_mode to this provider.
export class TelegramProvider implements NotificationProvider {
  readonly channel = NotificationChannel.TELEGRAM;

  constructor(private readonly botToken: string | null) {}

  async send(chatId: string, body: string): Promise<void> {
    if (!this.botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    // Never log this URL — it embeds the bot token.
    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: body, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Telegram sendMessage ${res.status}: ${detail.slice(0, 200)}`);
    }
  }
}
