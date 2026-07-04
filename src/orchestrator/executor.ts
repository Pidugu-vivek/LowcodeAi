import { WorkflowConfig, WorkflowStep } from '../domain/workflowConfig';
import { ExecutionContext } from './context';
import { evaluateCondition } from './conditionEvaluator';
import { applyMappings } from '../mapping/fieldMapper';
import { callVendor } from '../http-client/vendorClient';
import { logger } from '../logging/logger';

export class StepExecutionError extends Error {
  constructor(
    public readonly stepName: string,
    cause: unknown,
  ) {
    super(`Step "${stepName}" failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'StepExecutionError';
  }
}

export interface StepLog {
  name: string;
  skipped: boolean;
  status: 'ok' | 'error' | 'skipped';
  durationMs: number;
  error?: string;
}

export interface ExecutionResult {
  response: Record<string, unknown>;
  stepLogs: StepLog[];
}

async function runStep(step: WorkflowStep, context: ExecutionContext): Promise<StepLog> {
  const start = Date.now();

  if (!evaluateCondition(step.condition, context)) {
    return { name: step.name, skipped: true, status: 'skipped', durationMs: Date.now() - start };
  }

  try {
    const payload = applyMappings(context, step.requestMapping);
    const result = await callVendor(step.vendor, payload);
    const responseSource = { httpStatus: result.status, body: result.data };
    context.steps[step.name] = applyMappings(responseSource, step.responseMapping);
    return { name: step.name, skipped: false, status: 'ok', durationMs: Date.now() - start };
  } catch (err) {
    const durationMs = Date.now() - start;
    if (step.onError === 'continue') {
      logger.warn(
        { traceId: context.traceId, step: step.name, err: (err as Error).message },
        'Step failed, continuing per onError policy',
      );
      return {
        name: step.name,
        skipped: false,
        status: 'error',
        durationMs,
        error: (err as Error).message,
      };
    }
    throw new StepExecutionError(step.name, err);
  }
}

export async function executeWorkflow(
  workflow: WorkflowConfig,
  context: ExecutionContext,
): Promise<ExecutionResult> {
  const stepLogs: StepLog[] = [];
  for (const step of workflow.steps) {
    const stepLog = await runStep(step, context);
    stepLogs.push(stepLog);
  }
  const response = applyMappings(context, workflow.response.mapping);
  return { response, stepLogs };
}
