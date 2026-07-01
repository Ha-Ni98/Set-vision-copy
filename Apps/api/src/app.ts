import express from 'express';
import pinoHttp from 'pino-http';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './env';
import { logger } from './common/config/logger';
import { sendSuccess } from './common/http/response';
import { globalErrorHandler } from './common/middlewares/error.middleware';
import { moduleRouter } from './modules/index';

export const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  sendSuccess(res, { status: 'ok' });
});

app.use(env.API_PREFIX, moduleRouter);

app.use(globalErrorHandler);
