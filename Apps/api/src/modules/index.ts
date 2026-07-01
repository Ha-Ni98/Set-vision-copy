import { Router } from 'express';
import {
  AUTH_ROUTES, ADMIN_ROUTES, ACTIVATOR_ROUTES, SET_ROUTES,
  LOT_ROUTES, ORDER_ROUTES, CARD_ROUTES, KEY_ROUTES, ACTIVATION_ROUTES,
  GEOGRAPHY_ROUTES,
  DELIVERY_COMPANY_ROUTES,
  LOG_ROUTES,
  SUBSCRIPTION_PLAN_ROUTES,
} from '@my-app/contract';
import { authRouter } from './auth/auth.routes';
import { adminRouter } from './admin/admin.routes';
import { activatorRouter } from './activator/activator.routes';
import { setRouter } from './set/set.routes';
import { lotRouter } from './lot/lot.routes';
import { orderRouter } from './order/order.routes';
import { cardRouter } from './card/card.routes';
import { keyRouter, activationRouter } from './activation/activation.routes';
import { geographyRouter } from './geography/geography.routes';
import { deliveryCompanyRouter } from './delivery-company/delivery-company.routes';
import { logRouter } from './log/log.routes';
import { subscriptionPlanRouter } from './subscription-plan/subscription-plan.routes';

export const moduleRouter = Router();

moduleRouter.use(AUTH_ROUTES.BASE, authRouter);
moduleRouter.use(ADMIN_ROUTES.BASE, adminRouter);
moduleRouter.use(ACTIVATOR_ROUTES.BASE, activatorRouter);
moduleRouter.use(SET_ROUTES.BASE, setRouter);
moduleRouter.use(LOT_ROUTES.BASE, lotRouter);
moduleRouter.use(ORDER_ROUTES.BASE, orderRouter);
moduleRouter.use(CARD_ROUTES.BASE, cardRouter);
moduleRouter.use(KEY_ROUTES.BASE, keyRouter);
moduleRouter.use(ACTIVATION_ROUTES.BASE, activationRouter);
moduleRouter.use(GEOGRAPHY_ROUTES.BASE, geographyRouter);
moduleRouter.use(DELIVERY_COMPANY_ROUTES.BASE, deliveryCompanyRouter);
moduleRouter.use(LOG_ROUTES.BASE, logRouter);
moduleRouter.use(SUBSCRIPTION_PLAN_ROUTES.BASE, subscriptionPlanRouter);
