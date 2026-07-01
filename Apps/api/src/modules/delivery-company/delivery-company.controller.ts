import type { Request, Response, NextFunction } from 'express';
import type { IDeliveryCompanyService } from './delivery-company.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetDeliveryCompaniesQuery,
  CreateDeliveryCompanyCommand,
  UpdateDeliveryCompanyCommand,
  DeliveryCompanyIdParams,
} from '@my-app/contract';

export class DeliveryCompanyController {
  constructor(private service: IDeliveryCompanyService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetDeliveryCompaniesQuery;
      const result = await this.service.getAll(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cmd = req.validated.body as CreateDeliveryCompanyCommand;
      const result = await this.service.create(cmd);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as DeliveryCompanyIdParams;
      const cmd = req.validated.body as UpdateDeliveryCompanyCommand;
      const result = await this.service.update(id, cmd);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  toggle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as DeliveryCompanyIdParams;
      const result = await this.service.toggle(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
