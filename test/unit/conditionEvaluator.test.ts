import { evaluateCondition } from '../../src/orchestrator/conditionEvaluator';

describe('evaluateCondition', () => {
  it('returns true when no condition is given', () => {
    expect(evaluateCondition(undefined, {})).toBe(true);
  });

  it('evaluates equals', () => {
    const ctx = { steps: { a: { status: 'VALID' } } };
    expect(evaluateCondition({ field: 'steps.a.status', equals: 'VALID' }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'steps.a.status', equals: 'INVALID' }, ctx)).toBe(false);
  });

  it('evaluates notEquals', () => {
    const ctx = { steps: { a: { status: 'VALID' } } };
    expect(evaluateCondition({ field: 'steps.a.status', notEquals: 'INVALID' }, ctx)).toBe(true);
  });

  it('evaluates exists', () => {
    const ctx = { steps: { a: { status: 'VALID' } } };
    expect(evaluateCondition({ field: 'steps.a.status', exists: true }, ctx)).toBe(true);
    expect(evaluateCondition({ field: 'steps.missing.field', exists: true }, ctx)).toBe(false);
    expect(evaluateCondition({ field: 'steps.missing.field', exists: false }, ctx)).toBe(true);
  });
});
