import { NotificationChannel } from '@my-app/contract';
import type { NotificationProvider } from '../notification.types';
import { logger } from '../../config/logger';

// Stub. Satisfies the interface so the provider registry (registry.ts) is exhaustive and a
// future email channel is a one-file change. Does NOT throw — a throwing stub would
// manufacture FAILED rows if it were ever reached — and it is not selectable in practice:
// nothing in this codebase ever sets channel to EMAIL (registry.ts). Logs the address only,
// at debug level, so an accidental call is visible in dev without generating production
// noise — NEVER the body, which can hold the client's password.
export class EmailProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;

  async send(address: string, _body: string): Promise<void> {
    logger.debug({ channel: this.channel, address }, 'Email provider is a stub — no email sent');
  }
}
