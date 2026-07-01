import type { Request, Response, NextFunction } from 'express';
import type { ISetService } from './set.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetSetsQuery,
  CreateSetCommand,
  SetIdParams,
  TransitionSetCommand,
} from '@my-app/contract';

export class SetController {
  constructor(private readonly service: ISetService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetSetsQuery));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await this.service.create(req.validated.body as CreateSetCommand, req.user!.id),
        201,
      );
    } catch (err) {
      next(err);
    }
  };

  transition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as SetIdParams;
      sendSuccess(res, await this.service.transition(id, req.validated.body as TransitionSetCommand));
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as SetIdParams;
      await this.service.delete(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
