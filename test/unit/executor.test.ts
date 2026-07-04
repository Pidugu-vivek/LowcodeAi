import nock from 'nock';
import { executeWorkflow, StepExecutionError } from '../../src/orchestrator/executor';
import { createExecutionContext } from '../../src/orchestrator/context';
import { WorkflowConfig } from '../../src/domain/workflowConfig';

const BASE_URL = 'http://vendor.test';

function baseConfig(overrides: Partial<WorkflowConfig> = {}): WorkflowConfig {
  return {
    id: 'test-workflow',
    version: 1,
    method: 'POST',
    path: '/test',
    steps: [],
    response: { mapping: [] },
    ...overrides,
  };
}

afterEach(() => nock.cleanAll());

describe('executeWorkflow', () => {
  it('runs a single step and maps its response into the final output', async () => {
    nock(BASE_URL).post('/verify').reply(200, { status: 'VALID' });

    const config = baseConfig({
      steps: [
        {
          name: 'verify',
          type: 'http',
          vendor: { baseUrl: BASE_URL, method: 'POST', path: '/verify' },
          requestMapping: [{ from: 'body.pan', to: 'pan' }],
          responseMapping: [{ from: 'body.status', to: 'status' }],
        },
      ],
      response: { mapping: [{ from: 'steps.verify.status', to: 'panStatus' }] },
    });

    const context = createExecutionContext({ traceId: 't1', body: { pan: 'X' }, query: {}, params: {}, headers: {} });
    const result = await executeWorkflow(config, context);

    expect(result.response).toEqual({ panStatus: 'VALID' });
    expect(result.stepLogs).toEqual([
      expect.objectContaining({ name: 'verify', status: 'ok', skipped: false }),
    ]);
  });

  it('skips a conditional step when the condition is not met and merges only the executed step', async () => {
    nock(BASE_URL).post('/verify').reply(200, { status: 'INVALID' });

    const config = baseConfig({
      steps: [
        {
          name: 'verify',
          type: 'http',
          vendor: { baseUrl: BASE_URL, method: 'POST', path: '/verify' },
          responseMapping: [{ from: 'body.status', to: 'status' }],
        },
        {
          name: 'fetchExtra',
          type: 'http',
          condition: { field: 'steps.verify.status', equals: 'VALID' },
          vendor: { baseUrl: BASE_URL, method: 'POST', path: '/extra' },
          responseMapping: [{ from: 'body.extra', to: 'extra' }],
        },
      ],
      response: {
        mapping: [
          { from: 'steps.verify.status', to: 'status' },
          { from: 'steps.fetchExtra.extra', to: 'extra' },
        ],
      },
    });

    const context = createExecutionContext({ traceId: 't2', body: {}, query: {}, params: {}, headers: {} });
    const result = await executeWorkflow(config, context);

    expect(result.response).toEqual({ status: 'INVALID' });
    expect(result.stepLogs.find((s) => s.name === 'fetchExtra')?.skipped).toBe(true);
  });

  it('retries a transient 5xx and eventually succeeds', async () => {
    nock(BASE_URL).post('/flaky').reply(503);
    nock(BASE_URL).post('/flaky').reply(200, { status: 'OK' });

    const config = baseConfig({
      steps: [
        {
          name: 'flaky',
          type: 'http',
          vendor: {
            baseUrl: BASE_URL,
            method: 'POST',
            path: '/flaky',
            retry: { attempts: 2, backoffMs: 1 },
          },
          responseMapping: [{ from: 'body.status', to: 'status' }],
        },
      ],
      response: { mapping: [{ from: 'steps.flaky.status', to: 'status' }] },
    });

    const context = createExecutionContext({ traceId: 't3', body: {}, query: {}, params: {}, headers: {} });
    const result = await executeWorkflow(config, context);

    expect(result.response).toEqual({ status: 'OK' });
  });

  it('throws a StepExecutionError when a step fails and onError is "fail" (default)', async () => {
    nock(BASE_URL).post('/broken').times(3).reply(500);

    const config = baseConfig({
      steps: [
        {
          name: 'broken',
          type: 'http',
          vendor: { baseUrl: BASE_URL, method: 'POST', path: '/broken', retry: { attempts: 3, backoffMs: 1 } },
        },
      ],
    });

    const context = createExecutionContext({ traceId: 't4', body: {}, query: {}, params: {}, headers: {} });
    await expect(executeWorkflow(config, context)).rejects.toBeInstanceOf(StepExecutionError);
  });

  it('continues past a failed step when onError is "continue"', async () => {
    nock(BASE_URL).post('/broken').times(2).reply(500);

    const config = baseConfig({
      steps: [
        {
          name: 'broken',
          type: 'http',
          onError: 'continue',
          vendor: { baseUrl: BASE_URL, method: 'POST', path: '/broken', retry: { attempts: 2, backoffMs: 1 } },
        },
      ],
      response: { mapping: [{ from: 'steps.broken.status', to: 'status', default: 'UNKNOWN' }] },
    });

    const context = createExecutionContext({ traceId: 't5', body: {}, query: {}, params: {}, headers: {} });
    const result = await executeWorkflow(config, context);

    expect(result.response).toEqual({ status: 'UNKNOWN' });
    expect(result.stepLogs[0]).toEqual(expect.objectContaining({ name: 'broken', status: 'error' }));
  });
});
