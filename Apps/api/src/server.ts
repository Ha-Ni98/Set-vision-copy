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
import {
  initNotifications,
  initTelegramWebhook,
  resolveTelegramPollerDeps,
  startTelegramPoller,
  stopTelegramPoller,
} from './common/notifications';

const httpServer = createServer(app);
const io = createSocketServer(httpServer);

io.of(NS.ACTIVATORS).use(authNamespace([UserRole.ACTIVATOR]));
io.of(NS.ADMIN).use(authNamespace([UserRole.ADMIN]));
io.of(NS.DISTRIBUTORS).use(authNamespace([UserRole.DISTRIBUTOR]));

initRealtimeGateway(io, prisma);
initNotifications();

async function main(): Promise<void> {
  await prisma.$connect();
  httpServer.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`);
    // Started AFTER the port is bound, and only in polling mode — the first long-running
    // background process in this app (Set 6 plan §7.1, §0.7).
    const pollerDeps = resolveTelegramPollerDeps();
    if (pollerDeps) startTelegramPoller(pollerDeps);
    // Webhook mode's counterpart — also only after the port is bound, so the endpoint exists
    // before Telegram is told about it. Fire-and-forget: never blocks or crashes boot.
    void initTelegramWebhook();
  });
}

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  // FIRST: abort the poller's in-flight long poll before closing anything else, so the
  // process does not sit for up to 30s waiting for getUpdates to return naturally.
  stopTelegramPoller();
  io.close();
  httpServer.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

void main();
