import type { Request, Response, NextFunction } from 'express';
import type { ICardService } from './card.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetCardsQuery,
  GetAvailableCardsQuery,
  GetDistributorCardsQuery,
  CardIdParams,
} from '@my-app/contract';

export class CardController {
  constructor(private readonly service: ICardService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetCardsQuery));
    } catch (err) {
      next(err);
    }
  };

  getAvailableForLot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAvailableForLot(req.validated.query as GetAvailableCardsQuery));
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardIdParams;
      sendSuccess(res, await this.service.getById(id));
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardIdParams;
      await this.service.delete(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  disable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardIdParams;
      sendSuccess(res, await this.service.disable(id));
    } catch (err) {
      next(err);
    }
  };

  enable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardIdParams;
      sendSuccess(res, await this.service.enable(id));
    } catch (err) {
      next(err);
    }
  };

  revoke = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardIdParams;
      sendSuccess(res, await this.service.revoke(id, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  getMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetDistributorCardsQuery;
      sendSuccess(res, await this.service.getMine(req.user!.id, query));
    } catch (err) {
      next(err);
    }
  };

  getMineById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardIdParams;
      sendSuccess(res, await this.service.getMineById(req.user!.id, id));
    } catch (err) {
      next(err);
    }
  };
}
