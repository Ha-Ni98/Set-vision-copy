import jwt from 'jsonwebtoken';
import { env } from '../../env';
import { JWTPayloadSchema, UserRole } from '@my-app/contract';
import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './socket.types';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export const authNamespace =
  (roles: UserRole[]) =>
  (socket: AppSocket, next: (err?: Error) => void): void => {
    try {
      const token = socket.handshake.auth?.['token'] as string | undefined;
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = JWTPayloadSchema.parse(jwt.verify(token, env.JWT_SECRET));
      if (!roles.includes(payload.role)) return next(new Error('FORBIDDEN'));
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  };
