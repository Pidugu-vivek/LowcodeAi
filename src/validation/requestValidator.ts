import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const compiledCache = new Map<string, ValidateFunction>();

export interface ValidationResult {
  valid: boolean;
  errors?: { field: string; message: string }[];
}

function toValidationErrors(errors: ErrorObject[] | null | undefined): ValidationResult['errors'] {
  return (errors || []).map((e) => ({
    field: e.instancePath || e.params?.missingProperty || '(root)',
    message: e.message || 'Invalid value',
  }));
}

export function validateAgainstSchema(
  cacheKey: string,
  schema: Record<string, unknown>,
  data: unknown,
): ValidationResult {
  let validateFn = compiledCache.get(cacheKey);
  if (!validateFn) {
    validateFn = ajv.compile(schema);
    compiledCache.set(cacheKey, validateFn);
  }
  const valid = validateFn(data) as boolean;
  if (valid) return { valid: true };
  return { valid: false, errors: toValidationErrors(validateFn.errors) };
}

export function invalidateSchemaCache(cacheKey: string): void {
  compiledCache.delete(cacheKey);
}
