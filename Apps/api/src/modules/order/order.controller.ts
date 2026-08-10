import type { Request, Response, NextFunction } from 'express';
import type { IOrderService } from './order.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetOrdersQuery,
  CreateOrderCommand,
  OrderIdParams,
  TransitionOrderCommand,
} from '@my-app/contract';

export class OrderController {
  constructor(private readonly service: IOrderService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetOrdersQuery));
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as OrderIdParams;
      sendSuccess(res, await this.service.getById(id));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as CreateOrderCommand;
      sendSuccess(res, await this.service.create(cmd, req.user!.id), 201);
    } catch (err) {
      next(err);
    }
  };

  transition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as OrderIdParams;
      const cmd = req.validated.body as TransitionOrderCommand;
      sendSuccess(res, await this.service.transition(id, cmd, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as OrderIdParams;
      await this.service.delete(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
