import type { Request, Response, NextFunction } from 'express';
import type { IAdminService } from './admin.interface';
import { sendSuccess } from '@common/http/response';
import type {
  GetAdminsQuery,
  AdminIdParams,
  CreateAdminCommand,
  UpdateAdminCommand,
} from '@my-app/contract';

export class AdminController {
  constructor(private readonly service: IAdminService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getAll(req.validated.query as GetAdminsQuery);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = await this.service.create(
        req.validated.body as CreateAdminCommand,
        req.user!.id,
      );
      sendSuccess(res, dto, 201);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as AdminIdParams;
      const dto = await this.service.getById(id);
      sendSuccess(res, dto);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as AdminIdParams;
      const dto = await this.service.update(id, req.validated.body as UpdateAdminCommand, req.user!.id);
      sendSuccess(res, dto);
    } catch (err) {
      next(err);
    }
  };

  toggle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as AdminIdParams;
      const dto = await this.service.toggle(id, req.user!.id);
      sendSuccess(res, dto);
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as AdminIdParams;
      const dto = await this.service.resetPassword(id, req.user!.id);
      sendSuccess(res, dto);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as AdminIdParams;
      await this.service.delete(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
