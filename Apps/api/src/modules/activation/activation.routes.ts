import { Router } from 'express';
import {
  KEY_ROUTES,
  ACTIVATION_ROUTES,
  UserRole,
  ActivationIdParamsSchema,
  ActivationActionParamsSchema,
  VerifyKeySchema,
  SubmitActivationSchema,
  UpdateActivationSchema,
  SubmitAdditionalInfoSchema,
  FlagWrongInfoSchema,
  RequestAdditionalInfoSchema,
  FreezeRequestSchema,
  SetActivatorPriceSchema,
  GetActivationsQuerySchema,
  GetActivatorHistoryQuerySchema,
  ActivateActivationSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { ActivationService } from './activation.service';
import { ActivationController } from './activation.controller';

const service = new ActivationService(prisma);
const controller = new ActivationController(service);

const activatorOnly = requireAuth({ roles: [UserRole.ACTIVATOR] });
const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });
// The global pending pool and global recent feed carry no per-activator scoping (their
// service methods take no viewer id), so the admin dashboard reads them too — not just the
// activator portal. Widened from activatorOnly to fix the admin dashboard 403 (Stage-04-fix).
const activatorOrAdmin = requireAuth({ roles: [UserRole.ACTIVATOR, UserRole.ADMIN] });

// ─── Key Router (public — no auth) ───────────────────────────────────────────

export const keyRouter = Router();

keyRouter.post(
  KEY_ROUTES.VERIFY,
  validateRequest({ body: VerifyKeySchema }),
  controller.verify,
);

keyRouter.post(
  KEY_ROUTES.SUBMIT,
  validateRequest({ body: SubmitActivationSchema }),
  controller.submit,
);

keyRouter.post(
  KEY_ROUTES.UPDATE,
  validateRequest({ params: ActivationIdParamsSchema, body: UpdateActivationSchema }),
  controller.update,
);

keyRouter.post(
  KEY_ROUTES.ADDITIONAL,
  validateRequest({ params: ActivationIdParamsSchema, body: SubmitAdditionalInfoSchema }),
  controller.additional,
);

keyRouter.get(
  KEY_ROUTES.STATUS,
  validateRequest({ params: ActivationIdParamsSchema }),
  controller.getStatus,
);

// ─── Activation Router (authed) ───────────────────────────────────────────────

export const activationRouter = Router();

// Static GET routes registered before /:id to avoid param-shadow
activationRouter.get(ACTIVATION_ROUTES.GET_PENDING, activatorOrAdmin, controller.getPending);

activationRouter.get(ACTIVATION_ROUTES.GET_ACTIVE, activatorOnly, controller.getActive);

activationRouter.get(
  ACTIVATION_ROUTES.GET_MY_HISTORY,
  activatorOnly,
  validateRequest({ query: GetActivatorHistoryQuerySchema }),
  controller.getMyHistory,
);

activationRouter.get(ACTIVATION_ROUTES.GET_RECENT, activatorOrAdmin, controller.getRecent);

activationRouter.get(
  ACTIVATION_ROUTES.GET_ALL,
  adminOnly,
  validateRequest({ query: GetActivationsQuerySchema }),
  controller.getAll,
);

// Param GET after statics
activationRouter.get(
  ACTIVATION_ROUTES.GET_BY_ID,
  adminOnly,
  validateRequest({ params: ActivationActionParamsSchema }),
  controller.getById,
);

// Activator action routes
activationRouter.post(
  ACTIVATION_ROUTES.TAKE,
  activatorOnly,
  validateRequest({ params: ActivationActionParamsSchema }),
  controller.take,
);

activationRouter.post(
  ACTIVATION_ROUTES.FLAG_WRONG,
  activatorOnly,
  validateRequest({ params: ActivationActionParamsSchema, body: FlagWrongInfoSchema }),
  controller.flagWrong,
);

activationRouter.post(
  ACTIVATION_ROUTES.REQUEST_ADDITIONAL,
  activatorOnly,
  validateRequest({ params: ActivationActionParamsSchema, body: RequestAdditionalInfoSchema }),
  controller.requestAdditional,
);

activationRouter.post(
  ACTIVATION_ROUTES.ACTIVATE,
  activatorOnly,
  validateRequest({ params: ActivationActionParamsSchema, body: ActivateActivationSchema }),
  controller.activate,
);

activationRouter.post(
  ACTIVATION_ROUTES.CANCEL,
  activatorOnly,
  validateRequest({ params: ActivationActionParamsSchema }),
  controller.cancel,
);

activationRouter.post(
  ACTIVATION_ROUTES.RELEASE,
  activatorOnly,
  validateRequest({ params: ActivationActionParamsSchema }),
  controller.release,
);

activationRouter.post(
  ACTIVATION_ROUTES.FREEZE,
  activatorOnly,
  validateRequest({ params: ActivationActionParamsSchema, body: FreezeRequestSchema }),
  controller.freeze,
);

// Admin action routes
activationRouter.post(
  ACTIVATION_ROUTES.ACTIVATE_BY_ADMIN,
  adminOnly,
  validateRequest({ params: ActivationActionParamsSchema, body: ActivateActivationSchema }),
  controller.activateByAdmin,
);

activationRouter.post(
  ACTIVATION_ROUTES.CANCEL_BY_ADMIN,
  adminOnly,
  validateRequest({ params: ActivationActionParamsSchema }),
  controller.cancelByAdmin,
);

activationRouter.post(
  ACTIVATION_ROUTES.SET_PRICE,
  adminOnly,
  validateRequest({ params: ActivationActionParamsSchema, body: SetActivatorPriceSchema }),
  controller.setPrice,
);
