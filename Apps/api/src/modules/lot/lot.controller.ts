import type { Request, Response, NextFunction } from 'express';
import type { ILotService } from './lot.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetLotsQuery,
  GetAvailableLotsQuery,
  CreateLotCommand,
  LotIdParams,
} from '@my-app/contract';

export class LotController {
  constructor(private readonly service: ILotService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetLotsQuery));
    } catch (err) {
      next(err);
    }
  };

  getAvailableForOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAvailableForOrder(req.validated.query as GetAvailableLotsQuery));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await this.service.create(req.validated.body as CreateLotCommand, req.user!.id),
        201,
      );
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as LotIdParams;
      await this.service.delete(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
