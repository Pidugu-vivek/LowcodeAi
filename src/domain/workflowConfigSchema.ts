/**
 * JSON Schema that validates a WorkflowConfig document itself (not the runtime
 * request payloads it describes). Used by the admin API to reject malformed
 * workflow definitions before they're persisted.
 */
export const workflowConfigSchema = {
  $id: 'workflowConfig',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'version', 'method', 'path', 'steps', 'response'],
  properties: {
    id: { type: 'string', minLength: 1, pattern: '^[a-zA-Z0-9._-]+$' },
    version: { type: 'integer', minimum: 1 },
    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    path: { type: 'string', pattern: '^/' },
    description: { type: 'string' },
    auth: {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: {
        type: { type: 'string', enum: ['none', 'apiKey', 'jwt'] },
        headerName: { type: 'string' },
      },
    },
    request: {
      type: 'object',
      additionalProperties: false,
      properties: {
        schema: { type: 'object' },
      },
    },
    steps: {
      type: 'array',
      minItems: 1,
      items: { $ref: 'workflowStep' },
    },
    response: {
      type: 'object',
      additionalProperties: false,
      required: ['mapping'],
      properties: {
        mapping: { type: 'array', items: { $ref: 'fieldMapping' } },
      },
    },
  },
} as const;

export const fieldMappingSchema = {
  $id: 'fieldMapping',
  type: 'object',
  additionalProperties: false,
  required: ['from', 'to'],
  properties: {
    from: { type: 'string', minLength: 1 },
    to: { type: 'string', minLength: 1 },
    transform: { type: 'string' },
    default: {},
  },
} as const;

export const workflowStepSchema = {
  $id: 'workflowStep',
  type: 'object',
  additionalProperties: false,
  required: ['name', 'type', 'vendor'],
  properties: {
    name: { type: 'string', minLength: 1, pattern: '^[a-zA-Z][a-zA-Z0-9]*$' },
    type: { type: 'string', enum: ['http'] },
    onError: { type: 'string', enum: ['fail', 'continue'] },
    condition: {
      type: 'object',
      additionalProperties: false,
      required: ['field'],
      properties: {
        field: { type: 'string', minLength: 1 },
        equals: {},
        notEquals: {},
        exists: { type: 'boolean' },
      },
    },
    vendor: {
      type: 'object',
      additionalProperties: false,
      required: ['baseUrl', 'method', 'path'],
      properties: {
        baseUrl: { type: 'string', minLength: 1 },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        path: { type: 'string', pattern: '^/' },
        headers: { type: 'object' },
        auth: {
          type: 'object',
          additionalProperties: false,
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['none', 'apiKey', 'bearer'] },
            headerName: { type: 'string' },
            value: { type: 'string' },
          },
        },
        timeoutMs: { type: 'integer', minimum: 1 },
        retry: {
          type: 'object',
          additionalProperties: false,
          required: ['attempts', 'backoffMs'],
          properties: {
            attempts: { type: 'integer', minimum: 1, maximum: 10 },
            backoffMs: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
    requestMapping: { type: 'array', items: { $ref: 'fieldMapping' } },
    responseMapping: { type: 'array', items: { $ref: 'fieldMapping' } },
  },
} as const;
