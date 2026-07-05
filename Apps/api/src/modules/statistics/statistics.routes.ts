import { Router } from 'express';
import {
  STATISTICS_ROUTES,
  UserRole,
  StatisticsOverviewQuerySchema,
  WilayaHeatmapQuerySchema,
  WilayaDrilldownQuerySchema,
  WilayaIdParamsSchema,
} from '@my-app/contract';
import { prisma } from '@common/db/prisma';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';

const service = new StatisticsService(prisma);
const controller = new StatisticsController(service);

const adminOnly = requireAuth({ roles: [UserRole.ADMIN] });

export const statisticsRouter = Router();

statisticsRouter.get(STATISTICS_ROUTES.DASHBOARD, adminOnly, controller.dashboard);

statisticsRouter.get(STATISTICS_ROUTES.ACTIVATORS_SUMMARY, adminOnly, controller.activatorsSummary);

statisticsRouter.get(STATISTICS_ROUTES.DISTRIBUTORS_SUMMARY, adminOnly, controller.distributorsSummary);

statisticsRouter.get(STATISTICS_ROUTES.INVENTORY_SUMMARY, adminOnly, controller.inventorySummary);

statisticsRouter.get(STATISTICS_ROUTES.ORDERS_SUMMARY, adminOnly, controller.ordersSummary);

statisticsRouter.get(STATISTICS_ROUTES.ACTIVATIONS_SUMMARY, adminOnly, controller.activationsSummary);

statisticsRouter.get(
  STATISTICS_ROUTES.OVERVIEW,
  adminOnly,
  validateRequest({ query: StatisticsOverviewQuerySchema }),
  controller.overview,
);

// Static /wilaya-heatmap must be registered BEFORE the param route /wilaya/:wilayaId
statisticsRouter.get(
  STATISTICS_ROUTES.WILAYA_HEATMAP,
  adminOnly,
  validateRequest({ query: WilayaHeatmapQuerySchema }),
  controller.wilayaHeatmap,
);

statisticsRouter.get(
  STATISTICS_ROUTES.WILAYA_DRILLDOWN,
  adminOnly,
  validateRequest({ params: WilayaIdParamsSchema, query: WilayaDrilldownQuerySchema }),
  controller.wilayaDrilldown,
);
