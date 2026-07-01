import type { Request, Response, NextFunction } from 'express';
import type { IGeographyService } from './geography.interface';
import { sendSuccess } from '@common/http/response';
import type { WilayaIdParams } from '@my-app/contract';

export class GeographyController {
  constructor(private service: IGeographyService) {}

  getWilayas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getWilayas();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getCommunes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { wilayaId } = req.validated.params as WilayaIdParams;
      const result = await this.service.getCommunes(wilayaId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
