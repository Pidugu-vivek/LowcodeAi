/**
 * API Test Console — invoke any configured workflow and see results + step logs.
 */

import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderNavbar } from '../components/navbar.js';

let workflows = [];

export async function renderConsole(preselectedId) {
  renderNavbar('console');
  const app = document.getElementById('app');

  app.innerHTML = `<div class="page-enter"><div class="skeleton skeleton-card" style="height:600px"></div></div>`;

  try {
    workflows = await api.listWorkflows();
    renderContent(app, preselectedId);
  } catch (err) {
    showToast(err.message, 'error');
    app.innerHTML = `<div class="page-enter empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h3 class="empty-state-title">Failed to load workflows</h3>
      <p class="empty-state-text">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function renderContent(app, preselectedId) {
  const selected = preselectedId ? workflows.find(w => w.id === preselectedId) : null;

  app.innerHTML = `
    <div class="page-enter">
      <div class="detail-header">
        <div class="detail-header-left">
          <div class="detail-breadcrumb">
            <a href="#/">Dashboard</a>
            <span>›</span>
            <span>Test Console</span>
          </div>
          <h1>API Test Console</h1>
          <p style="color:var(--text-secondary); font-size:0.9rem;">Execute workflow endpoints and inspect the response and step execution timeline.</p>
        </div>
      </div>

      <div class="console-layout">
        <!-- Request Panel -->
        <div class="console-panel">
          <div class="console-panel-header">
            <div class="console-panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              Request
            </div>
          </div>
          <div class="console-panel-body">
            <div class="form-group">
              <label class="form-label">Workflow</label>
              <select class="form-select" id="console-workflow">
                <option value="">Select a workflow...</option>
                ${workflows.map(w => `
                  <option value="${escapeHtml(w.id)}" ${w.id === preselectedId ? 'selected' : ''}>
                    ${w.method} ${w.path} — ${escapeHtml(w.id)}
                  </option>
                `).join('')}
              </select>
            </div>

            <div id="console-request-info" style="margin-bottom:16px;">
              ${selected ? renderRequestInfo(selected) : ''}
            </div>

            <div class="form-group">
              <label class="form-label">Request Body (JSON)</label>
              <div class="json-editor" id="console-editor">
                <div class="json-editor-header">
                  <span>JSON</span>
                </div>
                <textarea id="console-body" placeholder='{ "key": "value" }'>${selected ? generateSampleBody(selected) : ''}</textarea>
              </div>
            </div>

            <button class="btn btn-primary" id="console-send" style="width:100%;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Send Request
            </button>
          </div>
        </div>

        <!-- Response Panel -->
        <div class="console-panel">
          <div class="console-panel-header">
            <div class="console-panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Response
            </div>
            <div id="response-status"></div>
          </div>
          <div class="console-panel-body" id="response-body">
            <div class="empty-state" style="padding:48px 0;">
              <div class="empty-state-icon">📡</div>
              <p class="empty-state-text" style="margin-bottom:0;">Select a workflow and send a request to see the response here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event: workflow selection changed
  document.getElementById('console-workflow').addEventListener('change', (e) => {
    const w = workflows.find(w => w.id === e.target.value);
    const info = document.getElementById('console-request-info');
    const body = document.getElementById('console-body');
    if (w) {
      info.innerHTML = renderRequestInfo(w);
      body.value = generateSampleBody(w);
    } else {
      info.innerHTML = '';
      body.value = '';
    }
  });

  // Event: send request
  document.getElementById('console-send').addEventListener('click', handleSend);
}

function renderRequestInfo(w) {
  return `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
      <span class="badge badge-method badge-${w.method}" style="font-size:0.75rem;">${w.method}</span>
      <code style="color:var(--text-secondary); font-size:0.9rem;">${escapeHtml(w.path)}</code>
    </div>
    ${w.description ? `<p style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(w.description)}</p>` : ''}
  `;
}

function generateSampleBody(w) {
  if (!w.request?.schema?.properties) return '{}';
  const sample = {};
  const props = w.request.schema.properties;
  for (const [key, def] of Object.entries(props)) {
    if (def.type === 'string') {
      if (def.pattern) {
        // Try to generate a plausible example for common patterns
        if (key.toLowerCase().includes('pan')) sample[key] = 'ABCDE1234F';
        else if (key.toLowerCase().includes('aadhaar')) sample[key] = '123456789012';
        else sample[key] = 'sample-value';
      } else {
        sample[key] = key.toLowerCase().includes('id') ? 'doc-123' : 'sample-value';
      }
    } else if (def.type === 'number' || def.type === 'integer') {
      sample[key] = 1;
    } else if (def.type === 'boolean') {
      sample[key] = true;
    } else {
      sample[key] = 'value';
    }
  }
  return JSON.stringify(sample, null, 2);
}

async function handleSend() {
  const selectEl = document.getElementById('console-workflow');
  const bodyEl = document.getElementById('console-body');
  const sendBtn = document.getElementById('console-send');
  const responseBody = document.getElementById('response-body');
  const responseStatus = document.getElementById('response-status');

  const workflowId = selectEl.value;
  if (!workflowId) {
    showToast('Please select a workflow first', 'info');
    return;
  }

  let body;
  try {
    body = bodyEl.value.trim() ? JSON.parse(bodyEl.value) : {};
  } catch {
    showToast('Invalid JSON in request body', 'error');
    document.getElementById('console-editor').classList.add('error');
    return;
  }
  document.getElementById('console-editor').classList.remove('error');

  // Loading state
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<div class="spinner"></div> Sending...';
  responseBody.innerHTML = '<div style="display:flex;justify-content:center;padding:48px;"><div class="spinner" style="width:32px;height:32px;border-width:3px;"></div></div>';
  responseStatus.innerHTML = '';

  const startTime = Date.now();

  try {
    const result = await api.testWorkflow(workflowId, body);
    const duration = Date.now() - startTime;

    responseStatus.innerHTML = `<span class="status-badge status-2xx">200 OK · ${duration}ms</span>`;
    responseBody.innerHTML = renderResponseResult(result);
  } catch (err) {
    const duration = Date.now() - startTime;
    const statusCode = err.status || 500;
    const statusClass = statusCode >= 500 ? 'status-5xx' : statusCode >= 400 ? 'status-4xx' : 'status-2xx';

    responseStatus.innerHTML = `<span class="status-badge ${statusClass}">${statusCode} · ${duration}ms</span>`;
    responseBody.innerHTML = `
      <div style="margin-bottom:16px;">
        <div class="form-label" style="color:var(--color-error);">Error</div>
        <pre style="color:var(--color-error); font-size:0.85rem; padding:12px; background:rgba(239,68,68,0.08); border-radius:8px; overflow-x:auto;">${escapeHtml(err.message)}</pre>
        ${err.details ? `<pre style="color:var(--text-secondary); font-size:0.8rem; margin-top:8px; overflow-x:auto;">${escapeHtml(JSON.stringify(err.details, null, 2))}</pre>` : ''}
      </div>
    `;
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      Send Request
    `;
  }
}

function renderResponseResult(result) {
  const { response, stepLogs } = result;

  let html = `
    <div style="margin-bottom:20px;">
      <div class="form-label">Response Data</div>
      <div class="config-preview">
        <pre style="padding:12px;"><code>${syntaxHighlight(JSON.stringify(response, null, 2))}</code></pre>
      </div>
    </div>
  `;

  if (stepLogs && stepLogs.length > 0) {
    html += `
      <div class="step-timeline">
        <div class="step-timeline-title">Execution Timeline</div>
        ${stepLogs.map((step, i) => {
          const icon = step.status === 'ok' ? '✓' : step.status === 'skipped' ? '–' : '✕';
          return `
            <div class="timeline-item">
              <div class="timeline-dot ${step.status}">${icon}</div>
              <div class="timeline-content">
                <div class="timeline-name">${escapeHtml(step.name)}</div>
                <div class="timeline-meta">
                  <span class="badge badge-${step.status}" style="font-size:0.65rem;">${step.status}</span>
                  <span class="timeline-duration">${step.durationMs}ms</span>
                  ${step.error ? `<span style="color:var(--color-error); font-size:0.75rem;">${escapeHtml(step.error)}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return html;
}

function syntaxHighlight(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span style="color:#8b5cf6">"$1"</span>:')
    .replace(/"([^"]*)"/g, '<span style="color:#10b981">"$1"</span>')
    .replace(/\b(true|false)\b/g, '<span style="color:#f59e0b">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#3b82f6">$1</span>');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
