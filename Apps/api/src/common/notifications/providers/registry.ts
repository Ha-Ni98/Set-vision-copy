import { NotificationChannel } from '@my-app/contract';
import type { NotificationProvider } from '../notification.types';
import { TelegramProvider } from './telegram.provider';
import { EmailProvider } from './email.provider';
import { WhatsAppProvider } from './whatsapp.provider';

export type ProviderRegistry = Readonly<Record<NotificationChannel, NotificationProvider>>;

// Registration IS this exhaustive Record — adding a fourth channel to the enum fails tsc
// until a provider exists for it. Selection is `registry[channel]`, an object index on an
// enum, so it cannot miss and needs no `default:` branch or runtime throw.
//
// `botToken` is `string | null`: null only when NOTIFICATIONS_ENABLED=false (nothing is ever
// registered on the bus in that case, so no send is ever attempted). TelegramProvider.send
// still guards on a null token so a misconfiguration surfaces as a FAILED row with a clear
// message rather than a TypeError.
export const buildProviderRegistry = (botToken: string | null): ProviderRegistry =>
  Object.freeze({
    [NotificationChannel.TELEGRAM]: new TelegramProvider(botToken),
    [NotificationChannel.EMAIL]: new EmailProvider(),
    [NotificationChannel.WHATSAPP]: new WhatsAppProvider(),
  });
