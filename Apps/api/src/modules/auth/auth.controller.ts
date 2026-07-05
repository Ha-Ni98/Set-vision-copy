import type { Request, Response, NextFunction } from 'express';
import type { IAuthService } from './auth.interface';
import { sendSuccess } from '@common/http/response';
import type { LoginCommand, RefreshTokenCommand } from '@my-app/contract';

export class AuthController {
  constructor(private readonly service: IAuthService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = await this.service.login(req.validated.body as LoginCommand);
      sendSuccess(res, dto);
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = await this.service.refresh(req.validated.body as RefreshTokenCommand);
      sendSuccess(res, dto);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.logout(req.validated.body as RefreshTokenCommand);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = await this.service.me(req.user!);
      sendSuccess(res, dto);
    } catch (err) {
      next(err);
    }
  };
}
