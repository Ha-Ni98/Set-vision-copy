import type { Request, Response, NextFunction } from 'express';
import type { IActivationEmailService } from './activation-email.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetActivationEmailsQuery,
  GetActivationEmailPoolQuery,
  CreateActivationEmailCommand,
  ActivationEmailIdParams,
} from '@my-app/contract';

export class ActivationEmailController {
  constructor(private readonly service: IActivationEmailService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetActivationEmailsQuery;
      const result = await this.service.getAll(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPool = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetActivationEmailPoolQuery;
      const result = await this.service.getPool(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as CreateActivationEmailCommand;
      const result = await this.service.create(cmd, req.user!.id);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationEmailIdParams;
      await this.service.delete(id, req.user!.id);
      sendSuccess(res, null);
    } catch (error) {
      next(error);
    }
  };
}
