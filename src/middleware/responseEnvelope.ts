import { Response } from 'express';

export function sendSuccess(res: Response, data: unknown, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    traceId: res.locals.traceId,
    data,
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  res.status(statusCode).json({
    success: false,
    traceId: res.locals.traceId,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  });
}
