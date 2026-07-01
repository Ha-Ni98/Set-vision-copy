import { Router } from 'express';
import {
  CARD_ROUTES,
  UserRole,
  GetCardsQuerySchema,
  GetAvailableCardsQuerySchema,
  CardIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { CardService } from './card.service';
import { CardController } from './card.controller';

const service = new CardService(prisma);
const controller = new CardController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const cardRouter = Router();

cardRouter.get(
  CARD_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetCardsQuerySchema }),
  controller.getAll,
);

// Static segment must be registered before the /:id param route
cardRouter.get(
  CARD_ROUTES.GET_AVAILABLE_FOR_LOT,
  adminOnly,
  validateRequest({ query: GetAvailableCardsQuerySchema }),
  controller.getAvailableForLot,
);

cardRouter.get(
  CARD_ROUTES.GET_BY_ID,
  adminOnly,
  validateRequest({ params: CardIdParamsSchema }),
  controller.getById,
);

cardRouter.delete(
  CARD_ROUTES.DELETE,
  adminOnly,
  validateRequest({ params: CardIdParamsSchema }),
  controller.delete,
);

cardRouter.post(
  CARD_ROUTES.DISABLE,
  adminOnly,
  validateRequest({ params: CardIdParamsSchema }),
  controller.disable,
);

cardRouter.post(
  CARD_ROUTES.ENABLE,
  adminOnly,
  validateRequest({ params: CardIdParamsSchema }),
  controller.enable,
);

cardRouter.post(
  CARD_ROUTES.REVOKE,
  adminOnly,
  validateRequest({ params: CardIdParamsSchema }),
  controller.revoke,
);
