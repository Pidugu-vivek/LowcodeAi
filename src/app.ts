import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { requestLogger } from './middleware/requestLogger';
import { globalRateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { sendError, sendSuccess } from './middleware/responseEnvelope';
import { adminApiRouter } from './admin-api/routes';
import { mockVendorRouter } from './mock-vendors/routes';
import { dynamicRouter } from './dynamic-router/router';
import { openApiSpec } from './docs/openapi';
import { workflowRegistry } from './config-store/registry';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(requestLogger);
  app.use(globalRateLimiter);

  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'ok' });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use('/admin', adminApiRouter);
  app.use('/mock', mockVendorRouter);

  // Dynamically-registered workflow endpoints, then 404 for anything unmatched.
  app.use(dynamicRouter);
  app.use((_req: Request, res: Response) => {
    sendError(res, 404, 'NOT_FOUND', 'No route or workflow config matches this request');
  });

  app.use(errorHandler);

  workflowRegistry.load();

  return app;
}
