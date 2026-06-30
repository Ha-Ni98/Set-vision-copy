import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../env';
import { prisma } from '../db/prisma';
import { AuthError, ForbiddenError } from '../errors';
import { JWTPayloadSchema, UserRole } from '@my-app/contract';

export const requireAuth =
  (options: { roles?: UserRole[]; checkDB?: boolean } = {}) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) throw new AuthError('Missing token');

      const decoded = jwt.verify(header.slice(7), env.JWT_SECRET);
      const payload = JWTPayloadSchema.parse(decoded);

      if (options.checkDB) {
        const fresh = await prisma.user.findUnique({
          where: { id: payload.id },
          select: { role: true, isEnabled: true },
        });
        if (!fresh || !fresh.isEnabled) throw new AuthError('Account disabled');
        req.user = { ...payload, role: fresh.role as UserRole };
      } else {
        req.user = payload;
      }

      if (options.roles && !options.roles.includes(req.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (err) {
      next(err instanceof jwt.JsonWebTokenError ? new AuthError('Invalid token') : err);
    }
  };
