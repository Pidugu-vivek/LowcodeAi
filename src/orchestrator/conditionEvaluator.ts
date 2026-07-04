import { StepCondition } from '../domain/workflowConfig';
import { getByPath } from '../mapping/fieldMapper';

export function evaluateCondition(condition: StepCondition | undefined, context: unknown): boolean {
  if (!condition) return true;
  const value = getByPath(context, condition.field);
  if (condition.exists !== undefined) {
    return condition.exists ? value !== undefined : value === undefined;
  }
  if (condition.equals !== undefined) {
    return value === condition.equals;
  }
  if (condition.notEquals !== undefined) {
    return value !== condition.notEquals;
  }
  return Boolean(value);
}
