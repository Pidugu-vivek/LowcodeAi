import Ajv from 'ajv';
import {
  workflowConfigSchema,
  workflowStepSchema,
  fieldMappingSchema,
} from '../domain/workflowConfigSchema';
import { ValidationResult } from './requestValidator';

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(fieldMappingSchema, 'fieldMapping');
ajv.addSchema(workflowStepSchema, 'workflowStep');
const validateFn = ajv.compile(workflowConfigSchema);

export function validateWorkflowConfig(data: unknown): ValidationResult {
  const valid = validateFn(data) as boolean;
  if (valid) return { valid: true };
  return {
    valid: false,
    errors: (validateFn.errors || []).map((e) => ({
      field: e.instancePath || e.params?.missingProperty || '(root)',
      message: e.message || 'Invalid value',
    })),
  };
}
