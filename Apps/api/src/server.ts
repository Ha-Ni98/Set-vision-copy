import { createServer } from 'node:http';
import { app } from './app';
import { env } from './env';
import { prisma } from './common/db/prisma';
import { logger } from './common/config/logger';
import { createSocketServer } from './common/realtime/socket';
import { authNamespace } from './common/realtime/socket-auth';
import { initRealtimeGateway } from './common/realtime/realtime-gateway';
import { NS } from './common/realtime/rooms';
import { UserRole } from '@my-app/contract';

const httpServer = createServer(app);
const io = createSocketServer(httpServer);

io.of(NS.ACTIVATORS).use(authNamespace([UserRole.ACTIVATOR]));
io.of(NS.ADMIN).use(authNamespace([UserRole.ADMIN]));

initRealtimeGateway(io);

async function main(): Promise<void> {
  await prisma.$connect();
  httpServer.listen(env.PORT, () => logger.info(`API listening on port ${env.PORT}`));
}

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  io.close();
  httpServer.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

void main();
