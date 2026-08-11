import { Router } from 'express';
import {
  CARD_REVOCATION_REQUEST_ROUTES,
  UserRole,
  GetCardRevocationRequestsQuerySchema,
  GetMyCardRevocationRequestsQuerySchema,
  CardRevocationRequestIdParamsSchema,
  CreateCardRevocationRequestSchema,
  ReviewCardRevocationRequestSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { CardRevocationRequestService } from './card-revocation-request.service';
import { CardRevocationRequestController } from './card-revocation-request.controller';

const service = new CardRevocationRequestService(prisma);
const controller = new CardRevocationRequestController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });
const distributorOnly = requireAuth({ roles: [UserRole.DISTRIBUTOR] });

export const cardRevocationRequestRouter = Router();

// Static routes first (before /:id)
cardRevocationRequestRouter.get(
  CARD_REVOCATION_REQUEST_ROUTES.GET_MINE,
  distributorOnly,
  validateRequest({ query: GetMyCardRevocationRequestsQuerySchema }),
  controller.getMine,
);

cardRevocationRequestRouter.get(
  CARD_REVOCATION_REQUEST_ROUTES.GET_ELIGIBLE,
  distributorOnly,
  controller.getEligible,
);

cardRevocationRequestRouter.get(
  CARD_REVOCATION_REQUEST_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetCardRevocationRequestsQuerySchema }),
  controller.getAll,
);

cardRevocationRequestRouter.post(
  CARD_REVOCATION_REQUEST_ROUTES.CREATE,
  distributorOnly,
  validateRequest({ body: CreateCardRevocationRequestSchema }),
  controller.create,
);

// Param routes last
cardRevocationRequestRouter.get(
  CARD_REVOCATION_REQUEST_ROUTES.GET_BY_ID,
  adminOnly,
  validateRequest({ params: CardRevocationRequestIdParamsSchema }),
  controller.getById,
);

cardRevocationRequestRouter.post(
  CARD_REVOCATION_REQUEST_ROUTES.APPROVE,
  adminOnly,
  validateRequest({ params: CardRevocationRequestIdParamsSchema, body: ReviewCardRevocationRequestSchema }),
  controller.approve,
);

cardRevocationRequestRouter.post(
  CARD_REVOCATION_REQUEST_ROUTES.REJECT,
  adminOnly,
  validateRequest({ params: CardRevocationRequestIdParamsSchema, body: ReviewCardRevocationRequestSchema }),
  controller.reject,
);

cardRevocationRequestRouter.post(
  CARD_REVOCATION_REQUEST_ROUTES.CANCEL,
  distributorOnly,
  validateRequest({ params: CardRevocationRequestIdParamsSchema }),
  controller.cancel,
);
