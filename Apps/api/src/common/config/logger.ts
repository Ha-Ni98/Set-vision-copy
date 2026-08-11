import pino from 'pino';
import { env } from '../../env';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
  redact: [
    'req.headers.authorization',
    'req.body.password',
    // Set 6: never let a bot token, a Telegram deep-link token, or the webhook secret header
    // reach a log line.
    'botToken',
    'telegramLinkToken',
    'token',
    'req.headers["x-telegram-bot-api-secret-token"]',
  ],
});
