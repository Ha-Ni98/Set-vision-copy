import { Router } from 'express';
import {
  LOT_ROUTES,
  UserRole,
  GetLotsQuerySchema,
  GetAvailableLotsQuerySchema,
  CreateLotSchema,
  LotIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { LotService } from './lot.service';
import { LotController } from './lot.controller';

const service = new LotService(prisma);
const controller = new LotController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const lotRouter = Router();

// Static segment must precede /:id to avoid Express matching "available-for-order" as a param
lotRouter.get(
  LOT_ROUTES.GET_AVAILABLE_FOR_ORDER,
  adminOnly,
  validateRequest({ query: GetAvailableLotsQuerySchema }),
  controller.getAvailableForOrder,
);

lotRouter.get(
  LOT_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetLotsQuerySchema }),
  controller.getAll,
);

lotRouter.post(
  LOT_ROUTES.CREATE,
  adminOnly,
  validateRequest({ body: CreateLotSchema }),
  controller.create,
);

lotRouter.delete(
  LOT_ROUTES.DELETE,
  adminOnly,
  validateRequest({ params: LotIdParamsSchema }),
  controller.delete,
);
