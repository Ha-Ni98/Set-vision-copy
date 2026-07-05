import { Router } from 'express';
import { AUTH_ROUTES, LoginSchema, RefreshTokenSchema } from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { loginRateLimiter } from '@common/middlewares/rate-limit.middleware';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

const service = new AuthService(prisma);
const controller = new AuthController(service);

export const authRouter = Router();

authRouter.post(AUTH_ROUTES.LOGIN, loginRateLimiter, validateRequest({ body: LoginSchema }), controller.login);
authRouter.post(AUTH_ROUTES.REFRESH, validateRequest({ body: RefreshTokenSchema }), controller.refresh);
authRouter.post(AUTH_ROUTES.LOGOUT, requireAuth(), validateRequest({ body: RefreshTokenSchema }), controller.logout);
authRouter.get(AUTH_ROUTES.ME, requireAuth(), controller.me);
