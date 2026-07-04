/**
 * API client — thin wrapper around fetch for the admin API.
 * All requests include the admin API key header.
 */

const API_KEY = 'dev-admin-key';
const BASE = '/admin/apis';

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const json = await res.json();

  if (!res.ok || json.success === false) {
    const msg = json.error?.message || json.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.details = json.error?.details;
    throw err;
  }

  return json.data;
}

export const api = {
  /** List all workflow configs. */
  listWorkflows() {
    return request(BASE);
  },

  /** Get a single workflow by id. */
  getWorkflow(id) {
    return request(`${BASE}/${encodeURIComponent(id)}`);
  },

  /** Create a new workflow config. */
  createWorkflow(config) {
    return request(BASE, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  /** Update an existing workflow config. */
  updateWorkflow(id, config) {
    return request(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  /** Delete a workflow config. */
  deleteWorkflow(id) {
    return request(`${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** Test-execute a workflow by id and return response + step logs. */
  testWorkflow(id, body) {
    return request(`${BASE}/${encodeURIComponent(id)}/test`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** Invoke a dynamically-registered endpoint directly. */
  async invokeEndpoint(method, path, body, extraHeaders = {}) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
    };
    if (method !== 'GET' && method !== 'DELETE' && body) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(path, options);
    const json = await res.json();
    return { status: res.status, data: json };
  },
};
