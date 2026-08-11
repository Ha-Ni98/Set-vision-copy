import { Router } from 'express';
import { TELEGRAM_ROUTES, UserRole, TelegramLinkParamsSchema } from '@my-app/contract';
import { env } from '../../env';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { notificationService } from '../../common/notifications';
import { requireWebhookSecret, webhookRateLimiter } from './telegram.middleware';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';

const service = new TelegramService(prisma, env.TELEGRAM_BOT_USERNAME ?? '');
const controller = new TelegramController(service, prisma, notificationService, env.TELEGRAM_BOT_TOKEN);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const telegramRouter = Router();

// Static route first (before /link/:role/:profileId), matching the existing
// static-before-param precedence convention (card.routes.ts, subscription-plan.routes.ts).
//
// Mounted ONLY when the mode is actually webhook — in polling mode the path does not exist
// to be probed (Set 6 plan §4.1). Unauthenticated by JWT; requireWebhookSecret is the
// substitute guard, and it is the only unauthenticated write endpoint in the API.
if (env.NOTIFICATIONS_ENABLED && env.TELEGRAM_MODE === 'webhook') {
  telegramRouter.post(
    TELEGRAM_ROUTES.WEBHOOK,
    webhookRateLimiter,
    requireWebhookSecret,
    controller.webhook,
  );
}

telegramRouter.get(
  TELEGRAM_ROUTES.LINK_STATUS,
  adminOnly,
  validateRequest({ params: TelegramLinkParamsSchema }),
  controller.getLinkStatus,
);

telegramRouter.post(
  TELEGRAM_ROUTES.GENERATE_TOKEN,
  adminOnly,
  validateRequest({ params: TelegramLinkParamsSchema }),
  controller.generateToken,
);

telegramRouter.delete(
  TELEGRAM_ROUTES.UNLINK,
  adminOnly,
  validateRequest({ params: TelegramLinkParamsSchema }),
  controller.unlink,
);
