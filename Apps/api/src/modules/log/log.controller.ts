import type { Request, Response, NextFunction } from 'express';
import type { ILogService } from './log.interface';
import { sendSuccess } from '@common/http/response';
import type { GetLogsQuery } from '@my-app/contract';

export class LogController {
  constructor(private service: ILogService) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.validated.query as GetLogsQuery;
      const result = await this.service.getAll(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}
