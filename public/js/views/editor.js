/**
 * Workflow Editor — form-based builder for creating/editing workflows.
 */

import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderNavbar } from '../components/navbar.js';

let formState = null;

export async function renderEditor(editId) {
  renderNavbar('editor');
  const app = document.getElementById('app');

  if (editId) {
    app.innerHTML = `<div class="page-enter"><div class="skeleton skeleton-card" style="height:600px"></div></div>`;
    try {
      const workflow = await api.getWorkflow(editId);
      formState = structuredClone(workflow);
      renderForm(app, true);
    } catch (err) {
      showToast(err.message, 'error');
      app.innerHTML = `<div class="page-enter empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Workflow not found</h3>
        <button class="btn btn-secondary" onclick="location.hash='#/'">Back to Dashboard</button>
      </div>`;
    }
  } else {
    formState = {
      id: '',
      version: 1,
      method: 'POST',
      path: '/',
      description: '',
      auth: { type: 'none' },
      request: { schema: { type: 'object', required: [], properties: {} } },
      steps: [],
      response: { mapping: [] },
    };
    renderForm(app, false);
  }
}

function renderForm(app, isEdit) {
  const w = formState;

  app.innerHTML = `
    <div class="page-enter">
      <div class="detail-header">
        <div class="detail-header-left">
          <div class="detail-breadcrumb">
            <a href="#/">Dashboard</a>
            <span>›</span>
            <span>${isEdit ? `Edit: ${escapeHtml(w.id)}` : 'New Workflow'}</span>
          </div>
          <h1>${isEdit ? 'Edit Workflow' : 'Create New Workflow'}</h1>
          <p style="color:var(--text-secondary); font-size:0.9rem;">
            ${isEdit ? 'Modify the workflow configuration below.' : 'Define a new API endpoint with orchestration steps.'}
          </p>
        </div>
      </div>

      <div class="editor-layout">
        <!-- Form Side -->
        <div class="editor-form">
          <!-- Basic Info -->
          <div class="editor-section">
            <div class="editor-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Basic Information
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Workflow ID</label>
                <input type="text" class="form-input" id="field-id" value="${escapeAttr(w.id)}" placeholder="verify-pan" ${isEdit ? 'disabled' : ''}>
                <div class="form-hint">Unique identifier, used in admin API URLs</div>
              </div>
              <div class="form-group">
                <label class="form-label">Version</label>
                <input type="number" class="form-input" id="field-version" value="${w.version || 1}" min="1">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">HTTP Method</label>
                <select class="form-select" id="field-method">
                  ${['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m =>
                    `<option value="${m}" ${w.method === m ? 'selected' : ''}>${m}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Path</label>
                <input type="text" class="form-input" id="field-path" value="${escapeAttr(w.path)}" placeholder="/verify-pan">
                <div class="form-hint">Must start with /</div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" class="form-input" id="field-desc" value="${escapeAttr(w.description || '')}" placeholder="Optional description of this workflow">
            </div>
            <div class="form-group">
              <label class="form-label">Authentication</label>
              <div class="toggle-group">
                ${['none', 'apiKey', 'jwt'].map(t =>
                  `<button class="toggle-option ${(w.auth?.type || 'none') === t ? 'active' : ''}" data-auth="${t}">${t}</button>`
                ).join('')}
              </div>
            </div>
          </div>

          <!-- Request Schema -->
          <div class="editor-section">
            <div class="editor-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Request Schema
            </div>
            <div class="form-hint" style="margin-bottom:12px;">JSON Schema to validate incoming request payloads. Leave empty to skip validation.</div>
            <div class="json-editor" id="schema-editor">
              <div class="json-editor-header">
                <span>JSON Schema</span>
              </div>
              <textarea id="field-schema" style="min-height:140px;">${JSON.stringify(w.request?.schema || {}, null, 2)}</textarea>
            </div>
          </div>

          <!-- Steps -->
          <div class="editor-section">
            <div class="editor-section-title" style="justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
                Steps (${w.steps.length})
              </div>
              <button class="btn btn-sm btn-secondary" id="add-step-btn">+ Add Step</button>
            </div>
            <div id="steps-container" class="steps-container">
              ${w.steps.map((step, i) => renderStepEditor(step, i)).join('')}
            </div>
            ${w.steps.length === 0 ? '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:16px;">No steps yet. Add a step to define a vendor API call.</p>' : ''}
          </div>

          <!-- Response Mapping -->
          <div class="editor-section">
            <div class="editor-section-title" style="justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 9 8 12 2 12"/></svg>
                Response Mapping
              </div>
              <button class="btn btn-sm btn-secondary" id="add-response-mapping-btn">+ Add Field</button>
            </div>
            <div id="response-mappings" class="mapping-list">
              ${(w.response?.mapping || []).map((m, i) => renderMappingRow(m, i, 'resp')).join('')}
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex; gap:12px; justify-content:flex-end; padding:8px 0;">
            <button class="btn btn-secondary" onclick="location.hash='#/'">Cancel</button>
            <button class="btn btn-primary" id="save-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              ${isEdit ? 'Update Workflow' : 'Create Workflow'}
            </button>
          </div>
        </div>

        <!-- Preview Side -->
        <div class="editor-preview">
          <div class="config-preview">
            <div class="config-preview-header">
              <span>Live Preview (JSON)</span>
              <button class="btn btn-ghost btn-sm" id="copy-preview-btn">Copy</button>
            </div>
            <pre id="preview-json" style="padding:12px; max-height:calc(100vh - 140px); overflow-y:auto;"><code></code></pre>
          </div>
        </div>
      </div>
    </div>
  `;

  bindFormEvents(isEdit);
  updatePreview();
}

function renderStepEditor(step, index) {
  return `
    <div class="step-card" data-step-index="${index}">
      <div class="step-card-header" onclick="this.nextElementSibling.classList.toggle('open')">
        <div class="step-card-header-left">
          <div class="step-number">${index + 1}</div>
          <div>
            <div class="step-card-title">${escapeHtml(step.name) || 'Unnamed Step'}</div>
            <div class="step-card-subtitle">${step.vendor ? `${step.vendor.method || 'POST'} ${step.vendor.path || ''}` : 'Configure vendor...'}</div>
          </div>
        </div>
        <div class="step-card-actions">
          <button class="btn btn-ghost btn-icon btn-sm remove-step-btn" data-index="${index}" onclick="event.stopPropagation()" title="Remove step">✕</button>
        </div>
      </div>
      <div class="step-card-body ${index === formState.steps.length - 1 ? 'open' : ''}">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Step Name</label>
            <input type="text" class="form-input step-field" data-step="${index}" data-field="name" value="${escapeAttr(step.name)}" placeholder="verifyPan">
          </div>
          <div class="form-group">
            <label class="form-label">On Error</label>
            <select class="form-select step-field" data-step="${index}" data-field="onError">
              <option value="fail" ${step.onError !== 'continue' ? 'selected' : ''}>Fail (stop workflow)</option>
              <option value="continue" ${step.onError === 'continue' ? 'selected' : ''}>Continue (skip step)</option>
            </select>
          </div>
        </div>

        <div class="form-label" style="margin-top:8px; margin-bottom:8px; font-size:0.75rem; color:var(--accent-blue);">VENDOR</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Base URL</label>
            <input type="text" class="form-input step-vendor-field" data-step="${index}" data-field="baseUrl" value="${escapeAttr(step.vendor?.baseUrl || '')}" placeholder="\${SELF_BASE_URL}">
          </div>
          <div class="form-group">
            <label class="form-label">Method</label>
            <select class="form-select step-vendor-field" data-step="${index}" data-field="method">
              ${['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m =>
                `<option value="${m}" ${(step.vendor?.method || 'POST') === m ? 'selected' : ''}>${m}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Path</label>
            <input type="text" class="form-input step-vendor-field" data-step="${index}" data-field="path" value="${escapeAttr(step.vendor?.path || '')}" placeholder="/mock/vendor-a/verify">
          </div>
          <div class="form-group">
            <label class="form-label">Timeout (ms)</label>
            <input type="number" class="form-input step-vendor-field" data-step="${index}" data-field="timeoutMs" value="${step.vendor?.timeoutMs || 3000}" min="100">
          </div>
          <div class="form-group">
            <label class="form-label">Retry Attempts</label>
            <input type="number" class="form-input step-retry-field" data-step="${index}" data-field="attempts" value="${step.vendor?.retry?.attempts || 1}" min="1">
          </div>
        </div>

        <div class="form-label" style="margin-top:8px; margin-bottom:8px; font-size:0.75rem; color:var(--accent-blue);">CONDITION (optional)</div>
        <div class="form-row-3">
          <div class="form-group">
            <label class="form-label">Field</label>
            <input type="text" class="form-input step-condition-field" data-step="${index}" data-field="field" value="${escapeAttr(step.condition?.field || '')}" placeholder="steps.verifyPan.status">
          </div>
          <div class="form-group">
            <label class="form-label">Equals</label>
            <input type="text" class="form-input step-condition-field" data-step="${index}" data-field="equals" value="${escapeAttr(step.condition?.equals ?? '')}" placeholder="VALID">
          </div>
          <div class="form-group">
            <label class="form-label">Not Equals</label>
            <input type="text" class="form-input step-condition-field" data-step="${index}" data-field="notEquals" value="${escapeAttr(step.condition?.notEquals ?? '')}" placeholder="">
          </div>
        </div>

        <div class="form-label" style="margin-top:8px; margin-bottom:4px; font-size:0.75rem; color:var(--accent-blue);">REQUEST MAPPING</div>
        <div class="mapping-list" id="req-mappings-${index}">
          ${(step.requestMapping || []).map((m, mi) => renderMappingRow(m, mi, `req-${index}`)).join('')}
        </div>
        <button class="btn btn-ghost btn-sm add-req-mapping-btn" data-step="${index}" style="margin-top:4px;">+ Add Request Mapping</button>

        <div class="form-label" style="margin-top:12px; margin-bottom:4px; font-size:0.75rem; color:var(--accent-blue);">RESPONSE MAPPING</div>
        <div class="mapping-list" id="res-mappings-${index}">
          ${(step.responseMapping || []).map((m, mi) => renderMappingRow(m, mi, `res-${index}`)).join('')}
        </div>
        <button class="btn btn-ghost btn-sm add-res-mapping-btn" data-step="${index}" style="margin-top:4px;">+ Add Response Mapping</button>
      </div>
    </div>
  `;
}

function renderMappingRow(mapping, index, prefix) {
  return `
    <div class="mapping-row" data-mapping-prefix="${prefix}" data-mapping-index="${index}">
      <input type="text" class="form-input mapping-from" value="${escapeAttr(mapping.from)}" placeholder="body.pan / steps.x.field">
      <span class="mapping-arrow">→</span>
      <input type="text" class="form-input mapping-to" value="${escapeAttr(mapping.to)}" placeholder="pan / panStatus">
      <select class="form-select mapping-transform" style="width:100px; padding:7px 8px; font-size:0.75rem;">
        <option value="" ${!mapping.transform ? 'selected' : ''}>none</option>
        ${['toUpperCase', 'toLowerCase', 'toString', 'toNumber', 'toBoolean'].map(t =>
          `<option value="${t}" ${mapping.transform === t ? 'selected' : ''}>${t}</option>`
        ).join('')}
      </select>
      <button class="btn btn-ghost btn-icon btn-sm remove-mapping-btn" title="Remove">✕</button>
    </div>
  `;
}

function bindFormEvents(isEdit) {
  // Auth toggle
  document.querySelectorAll('.toggle-option[data-auth]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.toggle-option[data-auth]').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      formState.auth = { type: e.target.dataset.auth };
      updatePreview();
    });
  });

  // Basic field changes
  const fieldMap = { 'field-id': 'id', 'field-version': 'version', 'field-method': 'method', 'field-path': 'path', 'field-desc': 'description' };
  for (const [elemId, key] of Object.entries(fieldMap)) {
    const el = document.getElementById(elemId);
    if (el) {
      el.addEventListener('input', () => {
        formState[key] = key === 'version' ? parseInt(el.value) || 1 : el.value;
        updatePreview();
      });
    }
  }

  // Schema editor
  document.getElementById('field-schema').addEventListener('input', (e) => {
    try {
      formState.request = { schema: JSON.parse(e.target.value) };
      document.getElementById('schema-editor').classList.remove('error');
    } catch {
      document.getElementById('schema-editor').classList.add('error');
    }
    updatePreview();
  });

  // Step fields
  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target.classList.contains('step-field')) {
      const idx = parseInt(target.dataset.step);
      const field = target.dataset.field;
      formState.steps[idx][field] = target.value;
      updatePreview();
    }
    if (target.classList.contains('step-vendor-field')) {
      const idx = parseInt(target.dataset.step);
      const field = target.dataset.field;
      if (!formState.steps[idx].vendor) formState.steps[idx].vendor = { baseUrl: '', method: 'POST', path: '' };
      formState.steps[idx].vendor[field] = field === 'timeoutMs' ? parseInt(target.value) || 3000 : target.value;
      updatePreview();
    }
    if (target.classList.contains('step-retry-field')) {
      const idx = parseInt(target.dataset.step);
      if (!formState.steps[idx].vendor) formState.steps[idx].vendor = { baseUrl: '', method: 'POST', path: '' };
      formState.steps[idx].vendor.retry = {
        attempts: parseInt(target.value) || 1,
        backoffMs: formState.steps[idx].vendor.retry?.backoffMs || 200,
      };
      updatePreview();
    }
    if (target.classList.contains('step-condition-field')) {
      const idx = parseInt(target.dataset.step);
      const field = target.dataset.field;
      if (!formState.steps[idx].condition) formState.steps[idx].condition = {};
      if (target.value) {
        formState.steps[idx].condition[field] = target.value;
      } else {
        delete formState.steps[idx].condition[field];
      }
      // Clean up empty condition
      if (Object.keys(formState.steps[idx].condition).length === 0) {
        delete formState.steps[idx].condition;
      }
      updatePreview();
    }
    // Mapping fields
    if (target.classList.contains('mapping-from') || target.classList.contains('mapping-to') || target.classList.contains('mapping-transform')) {
      syncMappingsFromDOM();
      updatePreview();
    }
  });

  // Change events for selects
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (target.classList.contains('step-field') || target.classList.contains('step-vendor-field') || target.classList.contains('mapping-transform')) {
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // Add step
  document.getElementById('add-step-btn').addEventListener('click', () => {
    formState.steps.push({
      name: `step${formState.steps.length + 1}`,
      type: 'http',
      vendor: { baseUrl: '${SELF_BASE_URL}', method: 'POST', path: '/mock/', timeoutMs: 3000, retry: { attempts: 2, backoffMs: 200 } },
      requestMapping: [],
      responseMapping: [],
    });
    rerenderSteps();
    updatePreview();
  });

  // Remove step
  document.addEventListener('click', (e) => {
    if (e.target.closest('.remove-step-btn')) {
      const idx = parseInt(e.target.closest('.remove-step-btn').dataset.index);
      formState.steps.splice(idx, 1);
      rerenderSteps();
      updatePreview();
    }
    if (e.target.closest('.remove-mapping-btn')) {
      const row = e.target.closest('.mapping-row');
      row.remove();
      syncMappingsFromDOM();
      updatePreview();
    }
    if (e.target.closest('.add-req-mapping-btn')) {
      const stepIdx = parseInt(e.target.closest('.add-req-mapping-btn').dataset.step);
      formState.steps[stepIdx].requestMapping = formState.steps[stepIdx].requestMapping || [];
      formState.steps[stepIdx].requestMapping.push({ from: '', to: '' });
      rerenderSteps();
      updatePreview();
    }
    if (e.target.closest('.add-res-mapping-btn')) {
      const stepIdx = parseInt(e.target.closest('.add-res-mapping-btn').dataset.step);
      formState.steps[stepIdx].responseMapping = formState.steps[stepIdx].responseMapping || [];
      formState.steps[stepIdx].responseMapping.push({ from: '', to: '' });
      rerenderSteps();
      updatePreview();
    }
  });

  // Add response mapping
  document.getElementById('add-response-mapping-btn').addEventListener('click', () => {
    formState.response.mapping.push({ from: '', to: '' });
    const container = document.getElementById('response-mappings');
    const idx = formState.response.mapping.length - 1;
    container.insertAdjacentHTML('beforeend', renderMappingRow(formState.response.mapping[idx], idx, 'resp'));
    updatePreview();
  });

  // Save
  document.getElementById('save-btn').addEventListener('click', () => handleSave(isEdit));

  // Copy preview
  document.getElementById('copy-preview-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(buildConfig(), null, 2));
    showToast('Config copied to clipboard', 'success');
  });
}

function rerenderSteps() {
  const container = document.getElementById('steps-container');
  container.innerHTML = formState.steps.map((step, i) => renderStepEditor(step, i)).join('');
  if (formState.steps.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:16px;">No steps yet. Add a step to define a vendor API call.</p>';
  }
}

function syncMappingsFromDOM() {
  // Sync step request/response mappings
  formState.steps.forEach((step, stepIdx) => {
    step.requestMapping = readMappingsFromDOM(`req-${stepIdx}`);
    step.responseMapping = readMappingsFromDOM(`res-${stepIdx}`);
  });
  // Sync response mappings
  formState.response.mapping = readMappingsFromDOM('resp');
}

function readMappingsFromDOM(prefix) {
  const rows = document.querySelectorAll(`.mapping-row[data-mapping-prefix="${prefix}"]`);
  const mappings = [];
  rows.forEach(row => {
    const from = row.querySelector('.mapping-from')?.value || '';
    const to = row.querySelector('.mapping-to')?.value || '';
    const transform = row.querySelector('.mapping-transform')?.value || '';
    if (from || to) {
      const m = { from, to };
      if (transform) m.transform = transform;
      mappings.push(m);
    }
  });
  return mappings;
}

function buildConfig() {
  syncMappingsFromDOM();
  const config = {
    id: formState.id,
    version: formState.version || 1,
    method: formState.method,
    path: formState.path,
    auth: formState.auth,
    request: formState.request,
    steps: formState.steps.map(step => {
      const s = {
        name: step.name,
        type: 'http',
        vendor: step.vendor,
      };
      if (step.condition && Object.keys(step.condition).length > 0) {
        s.condition = step.condition;
      }
      if (step.onError === 'continue') s.onError = 'continue';
      if (step.requestMapping?.length) s.requestMapping = step.requestMapping;
      if (step.responseMapping?.length) s.responseMapping = step.responseMapping;
      return s;
    }),
    response: { mapping: formState.response.mapping },
  };
  if (formState.description) config.description = formState.description;
  return config;
}

function updatePreview() {
  const preEl = document.querySelector('#preview-json code');
  if (preEl) {
    preEl.innerHTML = syntaxHighlight(JSON.stringify(buildConfig(), null, 2));
  }
}

async function handleSave(isEdit) {
  const config = buildConfig();
  const saveBtn = document.getElementById('save-btn');

  // Basic validation
  if (!config.id || !config.id.trim()) {
    showToast('Workflow ID is required', 'error');
    return;
  }
  if (!config.path || !config.path.startsWith('/')) {
    showToast('Path must start with /', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner"></div> Saving...';

  try {
    if (isEdit) {
      await api.updateWorkflow(config.id, config);
      showToast(`Workflow "${config.id}" updated successfully`, 'success');
    } else {
      await api.createWorkflow(config);
      showToast(`Workflow "${config.id}" created successfully`, 'success');
    }
    location.hash = `#/view/${encodeURIComponent(config.id)}`;
  } catch (err) {
    showToast(err.message, 'error');
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      ${isEdit ? 'Update Workflow' : 'Create Workflow'}
    `;
  }
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

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
