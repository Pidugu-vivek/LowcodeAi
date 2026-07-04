import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
  res.locals.traceId = traceId;
  res.setHeader('x-trace-id', traceId);

  const start = Date.now();
  logger.info({ traceId, method: req.method, path: req.path }, 'Request received');

  res.on('finish', () => {
    logger.info(
      {
        traceId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      'Request completed',
    );
  });

  next();
}
