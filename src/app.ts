import express, { Application } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logging/logger';

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' }, error: null });
  });

  return app;
}
