import { Router } from 'express';
import {
  ACTIVATOR_ROUTES,
  UserRole,
  GetActivatorsQuerySchema,
  CreateActivatorSchema,
  UpdateActivatorSchema,
  ActivatorIdParamsSchema,
  ActivatorPerformanceQuerySchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { ActivatorService } from './activator.service';
import { ActivatorController } from './activator.controller';

const service = new ActivatorService(prisma);
const controller = new ActivatorController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });
const activatorOnly = requireAuth({ roles: [UserRole.ACTIVATOR] });

export const activatorRouter = Router();

// MY_STATS must be registered before /:id routes to prevent Express matching "me" as a UUID param
activatorRouter.get(ACTIVATOR_ROUTES.MY_STATS, activatorOnly, controller.myStats);

activatorRouter.get(ACTIVATOR_ROUTES.GET_ALL, adminOnly, validateRequest({ query: GetActivatorsQuerySchema }), controller.getAll);
activatorRouter.post(ACTIVATOR_ROUTES.CREATE, adminOnly, validateRequest({ body: CreateActivatorSchema }), controller.create);
activatorRouter.get(ACTIVATOR_ROUTES.GET_BY_ID, adminOnly, validateRequest({ params: ActivatorIdParamsSchema }), controller.getById);
activatorRouter.patch(ACTIVATOR_ROUTES.UPDATE, adminOnly, validateRequest({ params: ActivatorIdParamsSchema, body: UpdateActivatorSchema }), controller.update);
activatorRouter.post(ACTIVATOR_ROUTES.TOGGLE, adminOnly, validateRequest({ params: ActivatorIdParamsSchema }), controller.toggle);
activatorRouter.post(ACTIVATOR_ROUTES.RESET_PASSWORD, adminOnly, validateRequest({ params: ActivatorIdParamsSchema }), controller.resetPassword);
activatorRouter.delete(ACTIVATOR_ROUTES.DELETE, adminOnly, validateRequest({ params: ActivatorIdParamsSchema }), controller.delete);
activatorRouter.get(ACTIVATOR_ROUTES.PERFORMANCE, adminOnly, validateRequest({ params: ActivatorIdParamsSchema, query: ActivatorPerformanceQuerySchema }), controller.performance);
