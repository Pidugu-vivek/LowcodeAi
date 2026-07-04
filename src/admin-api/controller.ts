import { NextFunction, Request, Response } from 'express';
import { WorkflowConfig } from '../domain/workflowConfig';
import { workflowRegistry } from '../config-store/registry';
import { validateWorkflowConfig } from '../validation/workflowConfigValidator';
import { NotFoundError, ValidationAppError } from '../middleware/errors';
import { sendSuccess } from '../middleware/responseEnvelope';
import { createExecutionContext } from '../orchestrator/context';
import { executeWorkflow } from '../orchestrator/executor';

export function listWorkflows(_req: Request, res: Response): void {
  sendSuccess(res, workflowRegistry.list());
}

export function getWorkflow(req: Request, res: Response): void {
  const workflow = workflowRegistry.getById(req.params.id);
  if (!workflow) throw new NotFoundError(`No workflow config with id "${req.params.id}"`);
  sendSuccess(res, workflow);
}

function assertRouteNotTaken(config: WorkflowConfig): void {
  const existingAtRoute = workflowRegistry.getByRoute(config.method, config.path);
  if (existingAtRoute && existingAtRoute.id !== config.id) {
    throw new ValidationAppError(
      `Route ${config.method} ${config.path} is already used by workflow "${existingAtRoute.id}"`,
    );
  }
}

export function createWorkflow(req: Request, res: Response): void {
  const result = validateWorkflowConfig(req.body);
  if (!result.valid) {
    throw new ValidationAppError('Invalid workflow configuration', result.errors);
  }
  const config = req.body as WorkflowConfig;
  if (workflowRegistry.getById(config.id)) {
    throw new ValidationAppError(`Workflow with id "${config.id}" already exists`);
  }
  assertRouteNotTaken(config);
  workflowRegistry.upsert(config);
  sendSuccess(res, config, 201);
}

export function updateWorkflow(req: Request, res: Response): void {
  const existing = workflowRegistry.getById(req.params.id);
  if (!existing) throw new NotFoundError(`No workflow config with id "${req.params.id}"`);

  const result = validateWorkflowConfig(req.body);
  if (!result.valid) {
    throw new ValidationAppError('Invalid workflow configuration', result.errors);
  }
  const config = req.body as WorkflowConfig;
  if (config.id !== req.params.id) {
    throw new ValidationAppError('Workflow id in body must match the id in the URL');
  }
  assertRouteNotTaken(config);
  workflowRegistry.upsert(config);
  sendSuccess(res, config);
}

export function deleteWorkflow(req: Request, res: Response): void {
  const deleted = workflowRegistry.remove(req.params.id);
  if (!deleted) throw new NotFoundError(`No workflow config with id "${req.params.id}"`);
  sendSuccess(res, { id: req.params.id, deleted: true });
}

/** Executes a workflow by id with the provided body and returns response + step logs. */
export async function testWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workflow = workflowRegistry.getById(req.params.id);
    if (!workflow) throw new NotFoundError(`No workflow config with id "${req.params.id}"`);

    const context = createExecutionContext({
      traceId: res.locals.traceId,
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    });

    const { response, stepLogs } = await executeWorkflow(workflow, context);
    sendSuccess(res, { response, stepLogs, traceId: context.traceId });
  } catch (err) {
    next(err);
  }
}
