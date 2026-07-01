import type { Request, Response, NextFunction } from 'express';
import type { IPaymentService } from './payment.interface';
import { sendSuccess } from '@common/http/response';
import type { GetPaymentsQuery, RecordPaymentCommand, PaymentIdParams } from '@my-app/contract';

export class PaymentController {
  constructor(private service: IPaymentService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetPaymentsQuery;
      const result = await this.service.getAll(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as RecordPaymentCommand;
      const actorUserId = req.user!.id;
      const result = await this.service.create(cmd, actorUserId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as PaymentIdParams;
      const actorUserId = req.user!.id;
      await this.service.delete(id, actorUserId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
