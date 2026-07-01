import { Router } from 'express';
import {
  DELIVERY_COMPANY_ROUTES,
  UserRole,
  GetDeliveryCompaniesQuerySchema,
  CreateDeliveryCompanySchema,
  UpdateDeliveryCompanySchema,
  DeliveryCompanyIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { DeliveryCompanyService } from './delivery-company.service';
import { DeliveryCompanyController } from './delivery-company.controller';

const service = new DeliveryCompanyService(prisma);
const controller = new DeliveryCompanyController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const deliveryCompanyRouter = Router();

deliveryCompanyRouter.get(
  DELIVERY_COMPANY_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetDeliveryCompaniesQuerySchema }),
  controller.getAll,
);
deliveryCompanyRouter.post(
  DELIVERY_COMPANY_ROUTES.CREATE,
  adminOnly,
  validateRequest({ body: CreateDeliveryCompanySchema }),
  controller.create,
);
deliveryCompanyRouter.patch(
  DELIVERY_COMPANY_ROUTES.UPDATE,
  adminOnly,
  validateRequest({ params: DeliveryCompanyIdParamsSchema, body: UpdateDeliveryCompanySchema }),
  controller.update,
);
deliveryCompanyRouter.post(
  DELIVERY_COMPANY_ROUTES.TOGGLE,
  adminOnly,
  validateRequest({ params: DeliveryCompanyIdParamsSchema }),
  controller.toggle,
);
