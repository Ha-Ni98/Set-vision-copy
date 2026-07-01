import { Router } from 'express';
import { GEOGRAPHY_ROUTES, UserRole, WilayaIdParamsSchema } from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { GeographyService } from './geography.service';
import { GeographyController } from './geography.controller';

const service = new GeographyService(prisma);
const controller = new GeographyController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const geographyRouter = Router();

geographyRouter.get(GEOGRAPHY_ROUTES.GET_WILAYAS, adminOnly, controller.getWilayas);
geographyRouter.get(
  GEOGRAPHY_ROUTES.GET_COMMUNES,
  adminOnly,
  validateRequest({ params: WilayaIdParamsSchema }),
  controller.getCommunes,
);
