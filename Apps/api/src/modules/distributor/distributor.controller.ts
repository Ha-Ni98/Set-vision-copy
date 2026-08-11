import type { Request, Response, NextFunction } from 'express';
import type { IDistributorService } from './distributor.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetDistributorsQuery,
  CreateDistributorCommand,
  UpdateDistributorCommand,
  CreateDistributorAccountCommand,
  DistributorIdParams,
} from '@my-app/contract';

export class DistributorController {
  constructor(private service: IDistributorService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetDistributorsQuery;
      const result = await this.service.getAll(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as CreateDistributorCommand;
      const actorId = req.user!.id;
      const result = await this.service.create(cmd, actorId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as DistributorIdParams;
      const result = await this.service.getById(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as DistributorIdParams;
      const cmd = req.validated.body as UpdateDistributorCommand;
      const actorId = req.user!.id;
      const result = await this.service.update(id, cmd, actorId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  toggle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as DistributorIdParams;
      const actorId = req.user!.id;
      const result = await this.service.toggle(id, actorId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as DistributorIdParams;
      const actorId = req.user!.id;
      await this.service.delete(id, actorId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as DistributorIdParams;
      const cmd = req.validated.body as CreateDistributorAccountCommand;
      const actorId = req.user!.id;
      const result = await this.service.createAccount(id, cmd, actorId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  unlinkAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as DistributorIdParams;
      const actorId = req.user!.id;
      const result = await this.service.unlinkAccount(id, actorId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  myDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.myDashboard(req.user!.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
