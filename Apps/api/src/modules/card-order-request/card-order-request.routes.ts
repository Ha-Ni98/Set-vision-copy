import { Router } from 'express';
import {
  CARD_ORDER_REQUEST_ROUTES,
  UserRole,
  GetCardOrderRequestsQuerySchema,
  GetMyCardOrderRequestsQuerySchema,
  CardOrderRequestIdParamsSchema,
  CreateCardOrderRequestSchema,
  ReviewCardOrderRequestSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { CardOrderRequestService } from './card-order-request.service';
import { CardOrderRequestController } from './card-order-request.controller';

const service = new CardOrderRequestService(prisma);
const controller = new CardOrderRequestController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });
const distributorOnly = requireAuth({ roles: [UserRole.DISTRIBUTOR] });

export const cardOrderRequestRouter = Router();

// Static routes first (before /:id, matching card/subscription-plan precedence convention)
cardOrderRequestRouter.get(
  CARD_ORDER_REQUEST_ROUTES.GET_MINE,
  distributorOnly,
  validateRequest({ query: GetMyCardOrderRequestsQuerySchema }),
  controller.getMine,
);

cardOrderRequestRouter.get(
  CARD_ORDER_REQUEST_ROUTES.GET_LINKABLE,
  adminOnly,
  controller.getLinkable,
);

cardOrderRequestRouter.get(
  CARD_ORDER_REQUEST_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetCardOrderRequestsQuerySchema }),
  controller.getAll,
);

cardOrderRequestRouter.post(
  CARD_ORDER_REQUEST_ROUTES.CREATE,
  distributorOnly,
  validateRequest({ body: CreateCardOrderRequestSchema }),
  controller.create,
);

// Param routes last
cardOrderRequestRouter.get(
  CARD_ORDER_REQUEST_ROUTES.GET_BY_ID,
  adminOnly,
  validateRequest({ params: CardOrderRequestIdParamsSchema }),
  controller.getById,
);

cardOrderRequestRouter.post(
  CARD_ORDER_REQUEST_ROUTES.APPROVE,
  adminOnly,
  validateRequest({ params: CardOrderRequestIdParamsSchema, body: ReviewCardOrderRequestSchema }),
  controller.approve,
);

cardOrderRequestRouter.post(
  CARD_ORDER_REQUEST_ROUTES.REJECT,
  adminOnly,
  validateRequest({ params: CardOrderRequestIdParamsSchema, body: ReviewCardOrderRequestSchema }),
  controller.reject,
);

cardOrderRequestRouter.post(
  CARD_ORDER_REQUEST_ROUTES.CANCEL,
  distributorOnly,
  validateRequest({ params: CardOrderRequestIdParamsSchema }),
  controller.cancel,
);

cardOrderRequestRouter.post(
  CARD_ORDER_REQUEST_ROUTES.UNLINK,
  adminOnly,
  validateRequest({ params: CardOrderRequestIdParamsSchema }),
  controller.unlink,
);
