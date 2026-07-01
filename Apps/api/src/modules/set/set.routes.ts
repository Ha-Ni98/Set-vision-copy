import { Router } from 'express';
import {
  SET_ROUTES,
  UserRole,
  GetSetsQuerySchema,
  CreateSetSchema,
  SetIdParamsSchema,
  TransitionSetSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { SetService } from './set.service';
import { SetController } from './set.controller';

const service = new SetService(prisma);
const controller = new SetController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const setRouter = Router();

setRouter.get(
  SET_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetSetsQuerySchema }),
  controller.getAll,
);

setRouter.post(
  SET_ROUTES.CREATE,
  adminOnly,
  validateRequest({ body: CreateSetSchema }),
  controller.create,
);

setRouter.post(
  SET_ROUTES.TRANSITION,
  adminOnly,
  validateRequest({ params: SetIdParamsSchema, body: TransitionSetSchema }),
  controller.transition,
);

setRouter.delete(
  SET_ROUTES.DELETE,
  adminOnly,
  validateRequest({ params: SetIdParamsSchema }),
  controller.delete,
);
