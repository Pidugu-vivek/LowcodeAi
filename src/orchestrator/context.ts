export interface ExecutionContext {
  traceId: string;
  body: unknown;
  query: unknown;
  params: unknown;
  headers: unknown;
  steps: Record<string, unknown>;
}

export function createExecutionContext(input: {
  traceId: string;
  body: unknown;
  query: unknown;
  params: unknown;
  headers: unknown;
}): ExecutionContext {
  return { ...input, steps: {} };
}
