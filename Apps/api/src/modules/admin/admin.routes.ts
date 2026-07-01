import { Router } from 'express';
import {
  ADMIN_ROUTES,
  UserRole,
  GetAdminsQuerySchema,
  CreateAdminSchema,
  UpdateAdminSchema,
  AdminIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

const service = new AdminService(prisma);
const controller = new AdminController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const adminRouter = Router();

adminRouter.get(ADMIN_ROUTES.GET_ALL, adminOnly, validateRequest({ query: GetAdminsQuerySchema }), controller.getAll);
adminRouter.post(ADMIN_ROUTES.CREATE, adminOnly, validateRequest({ body: CreateAdminSchema }), controller.create);
adminRouter.get(ADMIN_ROUTES.GET_BY_ID, adminOnly, validateRequest({ params: AdminIdParamsSchema }), controller.getById);
adminRouter.patch(ADMIN_ROUTES.UPDATE, adminOnly, validateRequest({ params: AdminIdParamsSchema, body: UpdateAdminSchema }), controller.update);
adminRouter.post(ADMIN_ROUTES.TOGGLE, adminOnly, validateRequest({ params: AdminIdParamsSchema }), controller.toggle);
adminRouter.post(ADMIN_ROUTES.RESET_PASSWORD, adminOnly, validateRequest({ params: AdminIdParamsSchema }), controller.resetPassword);
adminRouter.delete(ADMIN_ROUTES.DELETE, adminOnly, validateRequest({ params: AdminIdParamsSchema }), controller.delete);
