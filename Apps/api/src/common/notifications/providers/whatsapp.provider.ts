import { NotificationChannel } from '@my-app/contract';
import type { NotificationProvider } from '../notification.types';
import { logger } from '../../config/logger';

// Stub — see email.provider.ts for the full rationale. Same no-op, non-throwing contract.
export class WhatsAppProvider implements NotificationProvider {
  readonly channel = NotificationChannel.WHATSAPP;

  async send(address: string, _body: string): Promise<void> {
    logger.debug({ channel: this.channel, address }, 'WhatsApp provider is a stub — no message sent');
  }
}
