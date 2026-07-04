import { FieldMapping } from '../domain/workflowConfig';

type Transform = (value: unknown) => unknown;

const transforms: Record<string, Transform> = {
  toUpperCase: (v: unknown) => (typeof v === 'string' ? v.toUpperCase() : v),
  toLowerCase: (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v),
  toString: (v: unknown) => (v === undefined || v === null ? v : String(v)),
  toNumber: (v: unknown) => (v === undefined || v === null ? v : Number(v)),
  toBoolean: (v: unknown) => Boolean(v),
};

export function registerTransform(name: string, fn: Transform): void {
  transforms[name] = fn;
}

export function getByPath(source: unknown, dotPath: string): unknown {
  if (!dotPath) return undefined;
  return dotPath.split('.').reduce<unknown>((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

export function setByPath(target: Record<string, unknown>, dotPath: string, value: unknown): void {
  const keys = dotPath.split('.');
  let cursor = target;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof cursor[key] !== 'object' || cursor[key] === null) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
}

/**
 * Applies a list of field mappings from `source` into a fresh object, resolving
 * `default` and `transform` per mapping. Unknown transform names are a config
 * error surfaced at execution time (not silently ignored).
 */
export function applyMappings(source: unknown, mappings: FieldMapping[] = []): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const mapping of mappings) {
    let value = getByPath(source, mapping.from);
    if (value === undefined && mapping.default !== undefined) {
      value = mapping.default;
    }
    if (mapping.transform) {
      const transformFn = transforms[mapping.transform];
      if (!transformFn) {
        throw new Error(`Unknown field mapping transform: "${mapping.transform}"`);
      }
      value = transformFn(value);
    }
    setByPath(output, mapping.to, value);
  }
  return output;
}
