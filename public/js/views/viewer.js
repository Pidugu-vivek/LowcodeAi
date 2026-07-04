/**
 * Workflow Viewer — detail page with flow diagram and config display.
 */

import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderNavbar } from '../components/navbar.js';
import { renderFlowDiagram } from '../components/flowDiagram.js';

export async function renderViewer(id) {
  renderNavbar('');
  const app = document.getElementById('app');

  app.innerHTML = `<div class="page-enter"><div class="skeleton skeleton-card" style="height:400px"></div></div>`;

  try {
    const workflow = await api.getWorkflow(id);
    renderContent(app, workflow);
  } catch (err) {
    showToast(err.message, 'error');
    app.innerHTML = `<div class="page-enter empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h3 class="empty-state-title">Workflow not found</h3>
      <p class="empty-state-text">${escapeHtml(err.message)}</p>
      <button class="btn btn-secondary" onclick="location.hash='#/'">Back to Dashboard</button>
    </div>`;
  }
}

function renderContent(app, w) {
  app.innerHTML = `
    <div class="page-enter">
      <div class="detail-header">
        <div class="detail-header-left">
          <div class="detail-breadcrumb">
            <a href="#/">Dashboard</a>
            <span>›</span>
            <span>${escapeHtml(w.id)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <span class="badge badge-method badge-${w.method}" style="font-size:0.8rem; padding:5px 14px;">${w.method}</span>
            <h1 style="font-size:1.6rem;">${escapeHtml(w.id)}</h1>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <code style="color:var(--text-secondary); font-size:0.95rem;">${escapeHtml(w.path)}</code>
            <span class="badge badge-auth">${w.auth?.type || 'none'}</span>
            <span class="badge badge-steps">${w.steps?.length || 0} steps</span>
            <span class="badge badge-auth">v${w.version || 1}</span>
          </div>
          ${w.description ? `<p style="color:var(--text-secondary); font-size:0.9rem; margin-top:4px;">${escapeHtml(w.description)}</p>` : ''}
        </div>
        <div class="detail-header-actions">
          <button class="btn btn-primary" onclick="location.hash='#/console/${encodeURIComponent(w.id)}'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
            Test
          </button>
          <button class="btn btn-secondary" onclick="location.hash='#/editor/${encodeURIComponent(w.id)}'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button class="btn btn-danger" id="delete-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      </div>

      <div class="detail-section">
        <h3 class="detail-section-title">Workflow Flow</h3>
        ${renderFlowDiagram(w)}
      </div>

      <div class="detail-section">
        <h3 class="detail-section-title">Steps Detail</h3>
        ${renderStepsDetail(w.steps)}
      </div>

      <div class="detail-section">
        <h3 class="detail-section-title">Configuration (JSON)</h3>
        <div class="config-preview">
          <div class="config-preview-header">
            <span>workflow config</span>
            <button class="btn btn-ghost btn-sm" id="copy-config-btn">Copy</button>
          </div>
          <pre><code>${syntaxHighlight(JSON.stringify(w, null, 2))}</code></pre>
        </div>
      </div>
    </div>
  `;

  // Delete handler
  document.getElementById('delete-btn').addEventListener('click', () => confirmDelete(w));

  // Copy handler
  document.getElementById('copy-config-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(w, null, 2));
    showToast('Config copied to clipboard', 'success');
  });
}

function renderStepsDetail(steps) {
  if (!steps || steps.length === 0) return '<p style="color:var(--text-muted)">No steps</p>';

  return `
    <div class="steps-container">
      ${steps.map((step, i) => `
        <div class="step-card">
          <div class="step-card-header" onclick="this.nextElementSibling.classList.toggle('open')">
            <div class="step-card-header-left">
              <div class="step-number">${i + 1}</div>
              <div>
                <div class="step-card-title">${escapeHtml(step.name)}</div>
                <div class="step-card-subtitle">${step.vendor ? `${step.vendor.method} ${step.vendor.path}` : 'HTTP Call'}</div>
              </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              ${step.condition ? '<span class="badge badge-auth" style="font-size:0.65rem;">conditional</span>' : ''}
              ${step.onError === 'continue' ? '<span class="badge badge-skipped" style="font-size:0.65rem;">on-error: continue</span>' : ''}
              <span style="color:var(--text-muted); font-size:0.8rem;">▾</span>
            </div>
          </div>
          <div class="step-card-body">
            ${step.vendor ? renderVendorDetail(step.vendor) : ''}
            ${step.condition ? renderCondition(step.condition) : ''}
            ${step.requestMapping?.length ? renderMappingTable('Request Mapping', step.requestMapping) : ''}
            ${step.responseMapping?.length ? renderMappingTable('Response Mapping', step.responseMapping) : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderVendorDetail(vendor) {
  return `
    <div style="margin-bottom:12px;">
      <div class="form-label">Vendor</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <span class="badge badge-method badge-${vendor.method}">${vendor.method}</span>
        <code style="font-size:0.85rem; color:var(--text-secondary);">${escapeHtml(vendor.baseUrl)}${escapeHtml(vendor.path)}</code>
      </div>
      <div style="display:flex; gap:12px; margin-top:8px; font-size:0.8rem; color:var(--text-muted);">
        ${vendor.timeoutMs ? `<span>Timeout: ${vendor.timeoutMs}ms</span>` : ''}
        ${vendor.retry ? `<span>Retry: ${vendor.retry.attempts} attempts, ${vendor.retry.backoffMs}ms backoff</span>` : ''}
      </div>
    </div>
  `;
}

function renderCondition(condition) {
  let desc = `field: ${condition.field}`;
  if (condition.equals !== undefined) desc += ` equals "${condition.equals}"`;
  if (condition.notEquals !== undefined) desc += ` notEquals "${condition.notEquals}"`;
  if (condition.exists !== undefined) desc += ` exists: ${condition.exists}`;

  return `
    <div style="margin-bottom:12px;">
      <div class="form-label">Condition</div>
      <code style="font-size:0.8rem; color:var(--color-warning); background:rgba(245,158,11,0.1); padding:4px 10px; border-radius:4px;">${escapeHtml(desc)}</code>
    </div>
  `;
}

function renderMappingTable(title, mappings) {
  return `
    <div style="margin-bottom:12px;">
      <div class="form-label">${title}</div>
      <div style="font-size:0.8rem; font-family:var(--font-mono);">
        ${mappings.map(m => `
          <div style="display:flex; gap:8px; align-items:center; padding:4px 0; color:var(--text-secondary);">
            <span style="color:var(--accent-blue);">${escapeHtml(m.from)}</span>
            <span style="color:var(--text-muted);">→</span>
            <span style="color:var(--accent-purple);">${escapeHtml(m.to)}</span>
            ${m.transform ? `<span class="badge badge-auth" style="font-size:0.6rem;">${escapeHtml(m.transform)}</span>` : ''}
            ${m.default !== undefined ? `<span style="color:var(--text-muted);">(default: ${JSON.stringify(m.default)})</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function confirmDelete(w) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3 class="modal-title">Delete Workflow</h3>
      <p class="modal-text">Are you sure you want to delete <strong>${escapeHtml(w.id)}</strong>? The endpoint <code>${escapeHtml(w.method)} ${escapeHtml(w.path)}</code> will stop working immediately.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-danger" id="modal-confirm">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#modal-confirm').addEventListener('click', async () => {
    try {
      await api.deleteWorkflow(w.id);
      showToast(`Workflow "${w.id}" deleted`, 'success');
      overlay.remove();
      location.hash = '#/';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
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
