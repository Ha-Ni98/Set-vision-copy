import { Router } from 'express';
import { AUTH_ROUTES } from '@my-app/contract';
import { authRouter } from './auth/auth.routes';

export const moduleRouter = Router();

moduleRouter.use(AUTH_ROUTES.BASE, authRouter);
