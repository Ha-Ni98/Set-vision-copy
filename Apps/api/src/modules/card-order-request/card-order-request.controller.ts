import type { Request, Response, NextFunction } from 'express';
import type { ICardOrderRequestService } from './card-order-request.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetCardOrderRequestsQuery,
  GetMyCardOrderRequestsQuery,
  CardOrderRequestIdParams,
  CreateCardOrderRequestCommand,
  ReviewCardOrderRequestCommand,
} from '@my-app/contract';

export class CardOrderRequestController {
  constructor(private readonly service: ICardOrderRequestService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetCardOrderRequestsQuery));
    } catch (err) {
      next(err);
    }
  };

  getMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetMyCardOrderRequestsQuery;
      sendSuccess(res, await this.service.getMine(req.user!.id, query));
    } catch (err) {
      next(err);
    }
  };

  getLinkable = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getLinkable());
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardOrderRequestIdParams;
      sendSuccess(res, await this.service.getById(id));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as CreateCardOrderRequestCommand;
      sendSuccess(res, await this.service.create(req.user!.id, cmd), 201);
    } catch (err) {
      next(err);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardOrderRequestIdParams;
      const cmd = req.validated.body as ReviewCardOrderRequestCommand;
      sendSuccess(res, await this.service.approve(id, cmd, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardOrderRequestIdParams;
      const cmd = req.validated.body as ReviewCardOrderRequestCommand;
      sendSuccess(res, await this.service.reject(id, cmd, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardOrderRequestIdParams;
      sendSuccess(res, await this.service.cancel(id, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  unlink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardOrderRequestIdParams;
      sendSuccess(res, await this.service.unlink(id, req.user!.id));
    } catch (err) {
      next(err);
    }
  };
}
