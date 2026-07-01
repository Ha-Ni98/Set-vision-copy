import { Router } from 'express';
import {
  PAYMENT_ROUTES,
  UserRole,
  GetPaymentsQuerySchema,
  RecordPaymentSchema,
  PaymentIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

const service = new PaymentService(prisma);
const controller = new PaymentController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const paymentRouter = Router();

paymentRouter.get(
  PAYMENT_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetPaymentsQuerySchema }),
  controller.getAll,
);

paymentRouter.post(
  PAYMENT_ROUTES.CREATE,
  adminOnly,
  validateRequest({ body: RecordPaymentSchema }),
  controller.create,
);

paymentRouter.delete(
  PAYMENT_ROUTES.DELETE,
  adminOnly,
  validateRequest({ params: PaymentIdParamsSchema }),
  controller.delete,
);
