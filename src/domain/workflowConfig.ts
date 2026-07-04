export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AuthType = 'none' | 'apiKey' | 'jwt';

export interface AuthConfig {
  type: AuthType;
  headerName?: string; // for apiKey, defaults to 'x-api-key'
}

export interface FieldMapping {
  from: string; // dot-path into the source object (e.g. "body.pan", "steps.verifyPan.status")
  to: string; // dot-path to write into the target object
  transform?: string; // named transform, e.g. "toUpperCase", "toNumber"
  default?: unknown; // used when `from` resolves to undefined
}

export interface RetryConfig {
  attempts: number; // total attempts including the first
  backoffMs: number; // base delay, doubled per retry
}

export interface VendorCallConfig {
  baseUrl: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  auth?: {
    type: 'none' | 'apiKey' | 'bearer';
    headerName?: string; // for apiKey
    value?: string; // static token/key value (env-var interpolated, e.g. "${VENDOR_A_KEY}")
  };
  timeoutMs?: number;
  retry?: RetryConfig;
}

export interface StepCondition {
  field: string; // dot-path into execution context, e.g. "steps.verifyPan.vendorAStatus"
  equals?: unknown;
  notEquals?: unknown;
  exists?: boolean;
}

export interface WorkflowStep {
  name: string; // unique within the workflow; used as the key under `steps` in context
  type: 'http';
  condition?: StepCondition;
  onError?: 'fail' | 'continue'; // default 'fail'
  vendor: VendorCallConfig;
  requestMapping?: FieldMapping[]; // builds the outbound vendor payload
  responseMapping?: FieldMapping[]; // extracts fields from the vendor response into this step's output
}

export interface WorkflowConfig {
  id: string;
  version: number;
  method: HttpMethod;
  path: string; // e.g. "/verify-pan"
  auth?: AuthConfig;
  request?: {
    schema?: Record<string, unknown>; // JSON Schema for the incoming request body
  };
  steps: WorkflowStep[];
  response: {
    mapping: FieldMapping[];
  };
  description?: string;
}
