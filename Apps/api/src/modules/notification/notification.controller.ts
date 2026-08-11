import type { Request, Response, NextFunction } from 'express';
import type { GetNotificationsQuery, NotificationIdParams } from '@my-app/contract';
import { sendSuccess } from '@common/http/response';
import type { INotificationListService } from './notification.interface';

export class NotificationController {
  constructor(private readonly service: INotificationListService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetNotificationsQuery));
    } catch (err) {
      next(err);
    }
  };

  resend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as NotificationIdParams;
      sendSuccess(res, await this.service.resend(id));
    } catch (err) {
      next(err);
    }
  };
}
