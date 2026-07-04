import { validateWorkflowConfig } from '../../src/validation/workflowConfigValidator';

const validConfig = {
  id: 'sample',
  version: 1,
  method: 'POST',
  path: '/sample',
  steps: [
    {
      name: 'stepOne',
      type: 'http',
      vendor: { baseUrl: 'http://localhost:3000', method: 'POST', path: '/mock/x' },
    },
  ],
  response: { mapping: [{ from: 'steps.stepOne.x', to: 'x' }] },
};

describe('validateWorkflowConfig', () => {
  it('accepts a well-formed workflow config', () => {
    expect(validateWorkflowConfig(validConfig)).toEqual({ valid: true });
  });

  it('rejects a config missing required top-level fields', () => {
    const result = validateWorkflowConfig({ id: 'x' });
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('rejects an invalid HTTP method', () => {
    const result = validateWorkflowConfig({ ...validConfig, method: 'TRACE' });
    expect(result.valid).toBe(false);
  });

  it('rejects a path missing a leading slash', () => {
    const result = validateWorkflowConfig({ ...validConfig, path: 'sample' });
    expect(result.valid).toBe(false);
  });

  it('rejects a workflow with zero steps', () => {
    const result = validateWorkflowConfig({ ...validConfig, steps: [] });
    expect(result.valid).toBe(false);
  });

  it('rejects a step missing a vendor block', () => {
    const result = validateWorkflowConfig({
      ...validConfig,
      steps: [{ name: 'bad', type: 'http' }],
    });
    expect(result.valid).toBe(false);
  });
});
