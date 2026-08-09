import { Router } from 'express';
import {
  DISTRIBUTOR_ROUTES,
  UserRole,
  GetDistributorsQuerySchema,
  CreateDistributorSchema,
  UpdateDistributorSchema,
  CreateDistributorAccountSchema,
  DistributorIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { DistributorService } from './distributor.service';
import { DistributorController } from './distributor.controller';

const service = new DistributorService(prisma);
const controller = new DistributorController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const distributorRouter = Router();

distributorRouter.get(
  DISTRIBUTOR_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetDistributorsQuerySchema }),
  controller.getAll,
);

distributorRouter.post(
  DISTRIBUTOR_ROUTES.CREATE,
  adminOnly,
  validateRequest({ body: CreateDistributorSchema }),
  controller.create,
);

distributorRouter.get(
  DISTRIBUTOR_ROUTES.GET_BY_ID,
  adminOnly,
  validateRequest({ params: DistributorIdParamsSchema }),
  controller.getById,
);

distributorRouter.patch(
  DISTRIBUTOR_ROUTES.UPDATE,
  adminOnly,
  validateRequest({ params: DistributorIdParamsSchema, body: UpdateDistributorSchema }),
  controller.update,
);

distributorRouter.post(
  DISTRIBUTOR_ROUTES.TOGGLE,
  adminOnly,
  validateRequest({ params: DistributorIdParamsSchema }),
  controller.toggle,
);

distributorRouter.post(
  DISTRIBUTOR_ROUTES.CREATE_ACCOUNT,
  adminOnly,
  validateRequest({ params: DistributorIdParamsSchema, body: CreateDistributorAccountSchema }),
  controller.createAccount,
);

distributorRouter.delete(
  DISTRIBUTOR_ROUTES.UNLINK_ACCOUNT,
  adminOnly,
  validateRequest({ params: DistributorIdParamsSchema }),
  controller.unlinkAccount,
);

distributorRouter.delete(
  DISTRIBUTOR_ROUTES.DELETE,
  adminOnly,
  validateRequest({ params: DistributorIdParamsSchema }),
  controller.delete,
);
