import axios, { AxiosRequestConfig } from 'axios';
import { VendorCallConfig } from '../domain/workflowConfig';
import { withRetry } from './retry';

/** Interpolates ${ENV_VAR} placeholders in vendor auth values against process.env. */
function resolveEnvPlaceholders(value: string): string {
  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, name) => process.env[name] || '');
}

function buildHeaders(vendor: VendorCallConfig): Record<string, string> {
  const headers: Record<string, string> = { ...(vendor.headers || {}) };
  if (vendor.auth?.type === 'apiKey' && vendor.auth.value) {
    headers[vendor.auth.headerName || 'x-api-key'] = resolveEnvPlaceholders(vendor.auth.value);
  } else if (vendor.auth?.type === 'bearer' && vendor.auth.value) {
    headers['authorization'] = `Bearer ${resolveEnvPlaceholders(vendor.auth.value)}`;
  }
  return headers;
}

export interface VendorCallResult {
  status: number;
  data: unknown;
}

export async function callVendor(
  vendor: VendorCallConfig,
  payload: Record<string, unknown>,
): Promise<VendorCallResult> {
  const requestConfig: AxiosRequestConfig = {
    baseURL: vendor.baseUrl,
    url: vendor.path,
    method: vendor.method,
    timeout: vendor.timeoutMs ?? 5000,
    headers: buildHeaders(vendor),
    // 4xx are meaningful business responses (e.g. "PAN invalid") and resolve normally;
    // only 5xx are treated as failures so they trigger the retry/backoff path below.
    validateStatus: (status) => status < 500,
  };

  if (vendor.method === 'GET' || vendor.method === 'DELETE') {
    requestConfig.params = payload;
  } else {
    requestConfig.data = payload;
  }

  const response = await withRetry(() => axios.request(requestConfig), vendor.retry);
  return { status: response.status, data: response.data };
}
