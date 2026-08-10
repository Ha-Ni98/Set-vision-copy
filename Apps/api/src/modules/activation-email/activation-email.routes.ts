import { Router } from 'express';
import {
  ACTIVATION_EMAIL_ROUTES,
  UserRole,
  GetActivationEmailsQuerySchema,
  GetActivationEmailPoolQuerySchema,
  CreateActivationEmailSchema,
  ActivationEmailIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { ActivationEmailService } from './activation-email.service';
import { ActivationEmailController } from './activation-email.controller';

const service = new ActivationEmailService(prisma);
const controller = new ActivationEmailController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });
// The picker is used by the activator's own Activate flow and the admin's resolve-freeze
// flow. Pool addresses are operational data, not credentials — but this is the ONLY route on
// this module an activator may reach.
const adminOrActivator = requireAuth({ roles: [UserRole.ADMIN, UserRole.ACTIVATOR] });

export const activationEmailRouter = Router();

// Static routes first (before /:id to avoid param collision)
activationEmailRouter.get(
  ACTIVATION_EMAIL_ROUTES.GET_POOL,
  adminOrActivator,
  validateRequest({ query: GetActivationEmailPoolQuerySchema }),
  controller.getPool,
);

activationEmailRouter.get(
  ACTIVATION_EMAIL_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetActivationEmailsQuerySchema }),
  controller.getAll,
);

activationEmailRouter.post(
  ACTIVATION_EMAIL_ROUTES.CREATE,
  adminOnly,
  validateRequest({ body: CreateActivationEmailSchema }),
  controller.create,
);

// Param routes last
activationEmailRouter.delete(
  ACTIVATION_EMAIL_ROUTES.DELETE,
  adminOnly,
  validateRequest({ params: ActivationEmailIdParamsSchema }),
  controller.delete,
);
