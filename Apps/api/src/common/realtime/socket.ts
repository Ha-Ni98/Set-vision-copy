import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../../env';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './socket.types';

export type AppIOServer = IOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: AppIOServer | undefined;

export const createSocketServer = (httpServer: HttpServer): AppIOServer => {
  io = new IOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      path: env.WS_PATH,
      cors: { origin: env.CORS_ORIGIN },
      pingInterval: 25_000,
      pingTimeout: 20_000,
    },
  );
  return io;
};

export const getIO = (): AppIOServer => {
  if (!io) throw new Error('Socket server not initialized');
  return io;
};
