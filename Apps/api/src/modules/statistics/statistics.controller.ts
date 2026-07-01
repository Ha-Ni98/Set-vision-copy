import type { Request, Response, NextFunction } from 'express';
import type { IStatisticsService } from './statistics.interface';
import { sendSuccess } from '@common/http/response';
import type {
  StatisticsOverviewQuery,
  WilayaHeatmapQuery,
  WilayaDrilldownQuery,
  WilayaIdParams,
} from '@my-app/contract';

export class StatisticsController {
  constructor(private service: IStatisticsService) {}

  dashboard = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.dashboard();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  activatorsSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.activatorsSummary();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  distributorsSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.distributorsSummary();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  inventorySummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.inventorySummary();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  ordersSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.ordersSummary();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  activationsSummary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.activationsSummary();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  overview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as StatisticsOverviewQuery;
      const result = await this.service.overview(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  wilayaHeatmap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as WilayaHeatmapQuery;
      const result = await this.service.wilayaHeatmap(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  wilayaDrilldown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { wilayaId } = req.validated.params as WilayaIdParams;
      const query = req.validated.query as WilayaDrilldownQuery;
      const result = await this.service.wilayaDrilldown(wilayaId, query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
