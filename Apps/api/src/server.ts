import { app } from './app';
import { env } from './env';
import { prisma } from './common/db/prisma';
import { logger } from './common/config/logger';

// Sprint 5 replaces this body with http.createServer + Socket.IO attachment.

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT}`);
});

async function main(): Promise<void> {
  await prisma.$connect();
}

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

void main();
