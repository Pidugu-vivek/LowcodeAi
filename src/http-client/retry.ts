import { RetryConfig } from '../domain/workflowConfig';

const DEFAULT_RETRY: RetryConfig = { attempts: 1, backoffMs: 0 };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  const anyErr = err as { response?: { status?: number }; code?: string };
  if (anyErr.response?.status !== undefined) {
    return anyErr.response.status >= 500;
  }
  // network-level errors (timeout, connection reset, DNS) are retryable
  return true;
}

export async function withRetry<T>(fn: () => Promise<T>, retry?: RetryConfig): Promise<T> {
  const { attempts, backoffMs } = retry || DEFAULT_RETRY;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === attempts;
      if (isLastAttempt || !isRetryable(err)) {
        throw err;
      }
      await sleep(backoffMs * Math.pow(2, attempt - 1));
    }
  }
  throw lastError;
}
