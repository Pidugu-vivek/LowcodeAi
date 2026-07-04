import { NextFunction, Request, Response } from 'express';
import { AppError } from './errors';
import { sendError } from './responseEnvelope';
import { logger } from '../logging/logger';
import { StepExecutionError } from '../orchestrator/executor';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }
  if (err instanceof StepExecutionError) {
    logger.error({ traceId: res.locals.traceId, err: err.message }, 'Workflow step execution failed');
    sendError(res, 502, 'UPSTREAM_STEP_FAILED', err.message);
    return;
  }
  logger.error({ traceId: res.locals.traceId, err: (err as Error)?.stack || err }, 'Unhandled error');
  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}
