import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { TelegramLinkParams } from '@my-app/contract';
import { sendSuccess } from '@common/http/response';
import { handleTelegramUpdate } from '../../common/notifications/telegram.intake';
import type { NotificationService } from '../../common/notifications/notification.service';
import type { ITelegramService } from './telegram.interface';

export class TelegramController {
  constructor(
    private readonly service: ITelegramService,
    private readonly prisma: PrismaClient,
    private readonly notificationService: NotificationService,
    private readonly botToken: string | undefined,
  ) {}

  // Always answers 200 — a non-2xx makes Telegram retry-loop and eventually disable the
  // webhook. handleTelegramUpdate never throws (Set 6 plan §3.1), so the only error this
  // route can produce is requireWebhookSecret's 401.
  webhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (this.botToken) {
        await handleTelegramUpdate(this.prisma, this.notificationService, this.botToken, req.body);
      }
      sendSuccess(res, { received: true });
    } catch (err) {
      next(err);
    }
  };

  getLinkStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role, profileId } = req.validated.params as TelegramLinkParams;
      sendSuccess(res, await this.service.getLinkStatus(role, profileId));
    } catch (err) {
      next(err);
    }
  };

  generateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role, profileId } = req.validated.params as TelegramLinkParams;
      sendSuccess(res, await this.service.generateToken(role, profileId, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  unlink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role, profileId } = req.validated.params as TelegramLinkParams;
      sendSuccess(res, await this.service.unlink(role, profileId, req.user!.id));
    } catch (err) {
      next(err);
    }
  };
}
