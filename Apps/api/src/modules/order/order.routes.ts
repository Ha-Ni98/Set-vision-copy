import { Router } from 'express';
import {
  ORDER_ROUTES,
  UserRole,
  GetOrdersQuerySchema,
  GetMyOrdersQuerySchema,
  CreateOrderSchema,
  OrderIdParamsSchema,
  TransitionOrderSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

const service = new OrderService(prisma);
const controller = new OrderController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });
const distributorOnly = requireAuth({ roles: [UserRole.DISTRIBUTOR] });

export const orderRouter = Router();

orderRouter.get(
  ORDER_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetOrdersQuerySchema }),
  controller.getAll,
);

// Static segments must be registered before the /:id param route
orderRouter.get(
  ORDER_ROUTES.GET_MINE,
  distributorOnly,
  validateRequest({ query: GetMyOrdersQuerySchema }),
  controller.getMine,
);

orderRouter.get(
  ORDER_ROUTES.GET_MINE_BY_ID,
  distributorOnly,
  validateRequest({ params: OrderIdParamsSchema }),
  controller.getMineById,
);

orderRouter.get(
  ORDER_ROUTES.GET_BY_ID,
  adminOnly,
  validateRequest({ params: OrderIdParamsSchema }),
  controller.getById,
);

orderRouter.post(
  ORDER_ROUTES.CREATE,
  adminOnly,
  validateRequest({ body: CreateOrderSchema }),
  controller.create,
);

orderRouter.post(
  ORDER_ROUTES.TRANSITION,
  adminOnly,
  validateRequest({ params: OrderIdParamsSchema, body: TransitionOrderSchema }),
  controller.transition,
);

orderRouter.delete(
  ORDER_ROUTES.DELETE,
  adminOnly,
  validateRequest({ params: OrderIdParamsSchema }),
  controller.delete,
);
