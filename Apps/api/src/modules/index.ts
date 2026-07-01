import { Router } from 'express';
import { AUTH_ROUTES, ADMIN_ROUTES, ACTIVATOR_ROUTES, SET_ROUTES, LOT_ROUTES, ORDER_ROUTES } from '@my-app/contract';
import { authRouter } from './auth/auth.routes';
import { adminRouter } from './admin/admin.routes';
import { activatorRouter } from './activator/activator.routes';
import { setRouter } from './set/set.routes';
import { lotRouter } from './lot/lot.routes';
import { orderRouter } from './order/order.routes';

export const moduleRouter = Router();

moduleRouter.use(AUTH_ROUTES.BASE, authRouter);
moduleRouter.use(ADMIN_ROUTES.BASE, adminRouter);
moduleRouter.use(ACTIVATOR_ROUTES.BASE, activatorRouter);
moduleRouter.use(SET_ROUTES.BASE, setRouter);
moduleRouter.use(LOT_ROUTES.BASE, lotRouter);
moduleRouter.use(ORDER_ROUTES.BASE, orderRouter);
