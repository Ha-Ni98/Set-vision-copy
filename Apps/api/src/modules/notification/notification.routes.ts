import { Router } from 'express';
import {
  NOTIFICATION_ROUTES,
  UserRole,
  GetNotificationsQuerySchema,
  NotificationIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { notificationService } from '../../common/notifications';
import { NotificationListService } from './notification.service';
import { NotificationController } from './notification.controller';

const service = new NotificationListService(prisma, notificationService);
const controller = new NotificationController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const notificationRouter = Router();

notificationRouter.get(
  NOTIFICATION_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetNotificationsQuerySchema }),
  controller.getAll,
);

notificationRouter.post(
  NOTIFICATION_ROUTES.RESEND,
  adminOnly,
  validateRequest({ params: NotificationIdParamsSchema }),
  controller.resend,
);
