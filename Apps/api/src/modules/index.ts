import { Router } from 'express';
import { AUTH_ROUTES, ADMIN_ROUTES } from '@my-app/contract';
import { authRouter } from './auth/auth.routes';
import { adminRouter } from './admin/admin.routes';

export const moduleRouter = Router();

moduleRouter.use(AUTH_ROUTES.BASE, authRouter);
moduleRouter.use(ADMIN_ROUTES.BASE, adminRouter);
