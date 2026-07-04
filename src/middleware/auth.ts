import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthConfig } from '../domain/workflowConfig';
import { UnauthorizedError } from './errors';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

/** Guards the admin config API with a static API key. */
export function requireAdminApiKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'];
  if (key !== ADMIN_API_KEY) {
    throw new UnauthorizedError('Missing or invalid admin API key');
  }
  next();
}

/** Enforces a per-workflow auth policy (none / apiKey / jwt) on dynamically-registered endpoints. */
export function enforceWorkflowAuth(auth: AuthConfig | undefined, req: Request): void {
  if (!auth || auth.type === 'none') return;

  if (auth.type === 'apiKey') {
    const headerName = (auth.headerName || 'x-api-key').toLowerCase();
    const key = req.headers[headerName];
    if (!key || key !== ADMIN_API_KEY) {
      throw new UnauthorizedError(`Missing or invalid ${headerName} header`);
    }
    return;
  }

  if (auth.type === 'jwt') {
    const header = req.headers['authorization'];
    const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : undefined;
    if (!token) {
      throw new UnauthorizedError('Missing bearer token');
    }
    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
