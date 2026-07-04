import { NextFunction, Request, Response, Router } from 'express';
import { workflowRegistry } from '../config-store/registry';
import { validateAgainstSchema } from '../validation/requestValidator';
import { createExecutionContext } from '../orchestrator/context';
import { executeWorkflow } from '../orchestrator/executor';
import { enforceWorkflowAuth } from '../middleware/auth';
import { ValidationAppError } from '../middleware/errors';
import { sendSuccess } from '../middleware/responseEnvelope';
import { logger } from '../logging/logger';

export const dynamicRouter = Router();

// Single catch-all: looks up a workflow config by method+path, runs it, or falls through to 404.
dynamicRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  const workflow = workflowRegistry.getByRoute(req.method, req.path);
  if (!workflow) {
    next();
    return;
  }

  try {
    enforceWorkflowAuth(workflow.auth, req);

    if (workflow.request?.schema) {
      const result = validateAgainstSchema(`request:${workflow.id}:v${workflow.version}`, workflow.request.schema, req.body);
      if (!result.valid) {
        throw new ValidationAppError('Request payload failed validation', result.errors);
      }
    }

    const context = createExecutionContext({
      traceId: res.locals.traceId,
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    });

    const { response, stepLogs } = await executeWorkflow(workflow, context);
    logger.info({ traceId: context.traceId, workflowId: workflow.id, stepLogs }, 'Workflow executed');
    sendSuccess(res, response);
  } catch (err) {
    next(err);
  }
});
