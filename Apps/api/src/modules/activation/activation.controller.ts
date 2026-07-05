import type { Request, Response, NextFunction } from 'express';
import type { IActivationService } from './activation.interface';
import { sendSuccess } from '@common/http/response';
import type {
  VerifyKeyCommand,
  SubmitActivationCommand,
  UpdateActivationCommand,
  SubmitAdditionalInfoCommand,
  ActivationIdParams,
  ActivationActionParams,
  FlagWrongInfoCommand,
  RequestAdditionalInfoCommand,
  FreezeRequestCommand,
  SetActivatorPriceCommand,
  GetActivatorHistoryQuery,
  GetActivationsQuery,
  ActivateActivationCommand,
} from '@my-app/contract';

export class ActivationController {
  constructor(private readonly service: IActivationService) {}

  // ─── Client ───────────────────────────────────────────────────────────────

  verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.verify(req.validated.body as VerifyKeyCommand));
    } catch (err) {
      next(err);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.submit(req.validated.body as SubmitActivationCommand), 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activationId } = req.validated.params as ActivationIdParams;
      sendSuccess(
        res,
        await this.service.update(activationId, req.validated.body as UpdateActivationCommand),
      );
    } catch (err) {
      next(err);
    }
  };

  additional = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activationId } = req.validated.params as ActivationIdParams;
      sendSuccess(
        res,
        await this.service.additional(activationId, req.validated.body as SubmitAdditionalInfoCommand),
      );
    } catch (err) {
      next(err);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activationId } = req.validated.params as ActivationIdParams;
      sendSuccess(res, await this.service.status(activationId));
    } catch (err) {
      next(err);
    }
  };

  // ─── Activator ─────────────────────────────────────────────────────────────

  getPending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getPending());
    } catch (err) {
      next(err);
    }
  };

  getActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getActive(req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  take = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(res, await this.service.take(id, req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  flagWrong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(
        res,
        await this.service.flagWrong(id, req.user!.id, req.validated.body as FlagWrongInfoCommand),
      );
    } catch (err) {
      next(err);
    }
  };

  requestAdditional = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(
        res,
        await this.service.requestAdditional(
          id,
          req.user!.id,
          req.validated.body as RequestAdditionalInfoCommand,
        ),
      );
    } catch (err) {
      next(err);
    }
  };

  activate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(
        res,
        await this.service.activate(id, req.user!.id, req.validated.body as ActivateActivationCommand),
      );
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      await this.service.cancel(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  release = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      await this.service.release(id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  freeze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(
        res,
        await this.service.freeze(id, req.user!.id, req.validated.body as FreezeRequestCommand),
      );
    } catch (err) {
      next(err);
    }
  };

  getMyHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(
        res,
        await this.service.getMyHistory(req.user!.id, req.validated.query as GetActivatorHistoryQuery),
      );
    } catch (err) {
      next(err);
    }
  };

  getRecent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getRecent());
    } catch (err) {
      next(err);
    }
  };

  // ─── Admin ─────────────────────────────────────────────────────────────────

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.getAll(req.validated.query as GetActivationsQuery));
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(res, await this.service.getById(id));
    } catch (err) {
      next(err);
    }
  };

  activateByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(
        res,
        await this.service.activateByAdmin(id, req.validated.body as ActivateActivationCommand),
      );
    } catch (err) {
      next(err);
    }
  };

  cancelByAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(res, await this.service.cancelByAdmin(id));
    } catch (err) {
      next(err);
    }
  };

  setPrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as ActivationActionParams;
      sendSuccess(
        res,
        await this.service.setPrice(id, req.validated.body as SetActivatorPriceCommand, req.user!.id),
      );
    } catch (err) {
      next(err);
    }
  };
}
