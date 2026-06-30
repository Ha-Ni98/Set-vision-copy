import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

type Schemas = { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType };

export const validateRequest =
  (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.validated = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
