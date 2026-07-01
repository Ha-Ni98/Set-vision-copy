import type { Request, Response, NextFunction } from 'express';
import type { IActivatorService } from './activator.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetActivatorsQuery,
  ActivatorIdParams,
  CreateActivatorCommand,
  UpdateActivatorCommand,
  ActivatorPerformanceQuery,
} from '@my-app/contract';

export class ActivatorController {
  constructor(private readonly service: IActivatorService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetActivatorsQuery));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await this.service.create(req.validated.body as CreateActivatorCommand, req.user!.id),
        201,
      );
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivatorIdParams;
      sendSuccess(res, await this.service.getById(id));
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivatorIdParams;
      sendSuccess(
        res,
        await this.service.update(id, req.validated.body as UpdateActivatorCommand, req.user!.id),
      );
    } catch (err) {
      next(err);
    }
  };

  toggle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivatorIdParams;
      sendSuccess(res, await this.service.toggle(id, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivatorIdParams;
      sendSuccess(res, await this.service.resetPassword(id, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivatorIdParams;
      await this.service.delete(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  performance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivatorIdParams;
      sendSuccess(
        res,
        await this.service.performance(id, req.validated.query as ActivatorPerformanceQuery),
      );
    } catch (err) {
      next(err);
    }
  };

  myStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.myStats(req.user!.id));
    } catch (err) {
      next(err);
    }
  };
}
