/**
 * Hand-written OpenAPI spec for the platform's static surface (health, admin
 * config API, mock vendors). Dynamically-registered endpoints are configured
 * at runtime and are described generically here rather than enumerated,
 * since they don't exist until an admin config is created.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Low-Code API Orchestration Platform',
    version: '1.0.0',
    description:
      'Configuration-driven platform for defining REST endpoints that validate, ' +
      'invoke downstream vendor APIs, transform data, and return a standardized response ' +
      '— all without writing integration code.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      adminApiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
    schemas: {
      FieldMapping: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          transform: { type: 'string' },
          default: {},
        },
      },
      WorkflowConfig: {
        type: 'object',
        required: ['id', 'version', 'method', 'path', 'steps', 'response'],
        properties: {
          id: { type: 'string' },
          version: { type: 'integer' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          path: { type: 'string' },
          auth: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['none', 'apiKey', 'jwt'] } },
          },
          request: { type: 'object', properties: { schema: { type: 'object' } } },
          steps: { type: 'array', items: { type: 'object' } },
          response: {
            type: 'object',
            properties: { mapping: { type: 'array', items: { $ref: '#/components/schemas/FieldMapping' } } },
          },
        },
      },
      Envelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          traceId: { type: 'string' },
          data: {},
          error: {
            type: 'object',
            properties: { code: { type: 'string' }, message: { type: 'string' } },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Liveness check',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/apis': {
      get: {
        summary: 'List all workflow configs',
        security: [{ adminApiKey: [] }],
        responses: {
          '200': {
            description: 'List of workflow configs',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
          },
        },
      },
      post: {
        summary: 'Create a new workflow config (defines a live endpoint)',
        security: [{ adminApiKey: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkflowConfig' } } },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Invalid workflow configuration' },
        },
      },
    },
    '/admin/apis/{id}': {
      get: {
        summary: 'Get a workflow config by id',
        security: [{ adminApiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
      put: {
        summary: 'Update a workflow config',
        security: [{ adminApiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkflowConfig' } } },
        },
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
      delete: {
        summary: 'Delete a workflow config',
        security: [{ adminApiKey: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
  },
} as const;
