import type { Request, Response, NextFunction } from 'express';
import type { ICardRevocationRequestService } from './card-revocation-request.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetCardRevocationRequestsQuery,
  GetMyCardRevocationRequestsQuery,
  CardRevocationRequestIdParams,
  CreateCardRevocationRequestCommand,
  ReviewCardRevocationRequestCommand,
} from '@my-app/contract';

export class CardRevocationRequestController {
  constructor(private readonly service: ICardRevocationRequestService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetCardRevocationRequestsQuery));
    } catch (err) {
      next(err);
    }
  };

  getMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetMyCardRevocationRequestsQuery;
      sendSuccess(res, await this.service.getMine(req.user!.id, query));
    } catch (err) {
      next(err);
    }
  };

  getEligible = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getEligible(req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardRevocationRequestIdParams;
      sendSuccess(res, await this.service.getById(id));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as CreateCardRevocationRequestCommand;
      sendSuccess(res, await this.service.create(req.user!.id, cmd), 201);
    } catch (err) {
      next(err);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardRevocationRequestIdParams;
      const cmd = req.validated.body as ReviewCardRevocationRequestCommand;
      sendSuccess(res, await this.service.approve(id, cmd, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardRevocationRequestIdParams;
      const cmd = req.validated.body as ReviewCardRevocationRequestCommand;
      sendSuccess(res, await this.service.reject(id, cmd, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as CardRevocationRequestIdParams;
      sendSuccess(res, await this.service.cancel(id, req.user!.id));
    } catch (err) {
      next(err);
    }
  };
}
