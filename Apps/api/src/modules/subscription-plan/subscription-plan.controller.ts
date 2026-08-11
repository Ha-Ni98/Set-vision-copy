import type { Request, Response, NextFunction } from 'express';
import type { ISubscriptionPlanService } from './subscription-plan.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetSubscriptionPlansQuery,
  CreateSubscriptionPlanCommand,
  SubscriptionPlanIdParams,
  UpdateCommissionCommand,
  UpdateSubscriptionPlanCostCommand,
} from '@my-app/contract';

export class SubscriptionPlanController {
  constructor(private service: ISubscriptionPlanService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetSubscriptionPlansQuery;
      const result = await this.service.getAll(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as CreateSubscriptionPlanCommand;
      const result = await this.service.create(cmd);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  toggle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as SubscriptionPlanIdParams;
      const result = await this.service.toggle(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getCommissionDurations = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCommissionDurations();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getCommissions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCommissions();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateCommission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as UpdateCommissionCommand;
      const actorId = req.user!.id;
      const result = await this.service.updateCommission(cmd, actorId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getCosts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCosts();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateCost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as UpdateSubscriptionPlanCostCommand;
      const actorId = req.user!.id;
      const result = await this.service.updateCost(cmd, actorId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
