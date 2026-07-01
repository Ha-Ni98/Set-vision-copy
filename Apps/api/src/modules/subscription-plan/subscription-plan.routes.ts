import { Router } from 'express';
import {
  SUBSCRIPTION_PLAN_ROUTES,
  UserRole,
  GetSubscriptionPlansQuerySchema,
  CreateSubscriptionPlanSchema,
  SubscriptionPlanIdParamsSchema,
  UpdateCommissionSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlanController } from './subscription-plan.controller';

const service = new SubscriptionPlanService(prisma);
const controller = new SubscriptionPlanController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const subscriptionPlanRouter = Router();

// Static routes first (before /:id/toggle to avoid param collision)
subscriptionPlanRouter.get(
  SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSION_DURATIONS,
  adminOnly,
  controller.getCommissionDurations,
);
subscriptionPlanRouter.get(
  SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSIONS,
  adminOnly,
  controller.getCommissions,
);
subscriptionPlanRouter.patch(
  SUBSCRIPTION_PLAN_ROUTES.UPDATE_COMMISSION,
  adminOnly,
  validateRequest({ body: UpdateCommissionSchema }),
  controller.updateCommission,
);

// Collection routes
subscriptionPlanRouter.get(
  SUBSCRIPTION_PLAN_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetSubscriptionPlansQuerySchema }),
  controller.getAll,
);
subscriptionPlanRouter.post(
  SUBSCRIPTION_PLAN_ROUTES.CREATE,
  adminOnly,
  validateRequest({ body: CreateSubscriptionPlanSchema }),
  controller.create,
);

// Param routes last
subscriptionPlanRouter.post(
  SUBSCRIPTION_PLAN_ROUTES.TOGGLE,
  adminOnly,
  validateRequest({ params: SubscriptionPlanIdParamsSchema }),
  controller.toggle,
);
