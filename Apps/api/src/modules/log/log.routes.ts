import { Router } from 'express';
import { LOG_ROUTES, UserRole, GetLogsQuerySchema } from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { LogService } from './log.service';
import { LogController } from './log.controller';

const service = new LogService(prisma);
const controller = new LogController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const logRouter = Router();

logRouter.get(LOG_ROUTES.GET_ALL, adminOnly, validateRequest({ query: GetLogsQuerySchema }), controller.getAll);
