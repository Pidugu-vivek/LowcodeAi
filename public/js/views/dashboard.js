/**
 * Dashboard view — overview of all workflows with stats.
 */

import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderNavbar } from '../components/navbar.js';

export async function renderDashboard() {
  renderNavbar('dashboard');
  const app = document.getElementById('app');

  // Skeleton loading
  app.innerHTML = `
    <div class="page-enter">
      <div class="stats-bar">
        ${Array(4).fill('<div class="skeleton skeleton-stat"></div>').join('')}
      </div>
      <div class="section-header">
        <h2 class="section-title">Workflows</h2>
      </div>
      <div class="workflow-grid">
        ${Array(3).fill('<div class="skeleton skeleton-card"></div>').join('')}
      </div>
    </div>
  `;

  try {
    const workflows = await api.listWorkflows();
    renderContent(app, workflows);
  } catch (err) {
    showToast(err.message, 'error');
    app.innerHTML = `<div class="page-enter empty-state">
      <div class="empty-state-icon">⚠️</div>
      <h3 class="empty-state-title">Failed to load workflows</h3>
      <p class="empty-state-text">${escapeHtml(err.message)}</p>
      <button class="btn btn-primary" onclick="location.reload()">Retry</button>
    </div>`;
  }
}

function renderContent(app, workflows) {
  const methods = {};
  const authTypes = new Set();
  let totalSteps = 0;

  workflows.forEach(w => {
    methods[w.method] = (methods[w.method] || 0) + 1;
    authTypes.add(w.auth?.type || 'none');
    totalSteps += w.steps?.length || 0;
  });

  const methodSummary = Object.entries(methods).map(([m, c]) => `${c} ${m}`).join(', ') || 'none';

  app.innerHTML = `
    <div class="page-enter">
      <div class="stats-bar">
        <div class="stat-card">
          <div class="stat-icon blue">⚡</div>
          <div class="stat-content">
            <div class="stat-value">${workflows.length}</div>
            <div class="stat-label">Total Workflows</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">🔗</div>
          <div class="stat-content">
            <div class="stat-value">${totalSteps}</div>
            <div class="stat-label">Total Steps</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon cyan">📡</div>
          <div class="stat-content">
            <div class="stat-value">${Object.keys(methods).length}</div>
            <div class="stat-label">HTTP Methods (${methodSummary})</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">🔒</div>
          <div class="stat-content">
            <div class="stat-value">${authTypes.size}</div>
            <div class="stat-label">Auth Types</div>
          </div>
        </div>
      </div>

      <div class="section-header">
        <h2 class="section-title">Workflows</h2>
        <button class="btn btn-primary" onclick="location.hash='#/editor'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Workflow
        </button>
      </div>

      ${workflows.length === 0 ? renderEmptyState() : renderWorkflowGrid(workflows)}
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">🚀</div>
      <h3 class="empty-state-title">No workflows yet</h3>
      <p class="empty-state-text">Create your first API workflow to get started. Define endpoints, map fields, and orchestrate vendor APIs — all through configuration.</p>
      <button class="btn btn-primary" onclick="location.hash='#/editor'">Create First Workflow</button>
    </div>
  `;
}

function renderWorkflowGrid(workflows) {
  return `
    <div class="workflow-grid">
      ${workflows.map(w => renderWorkflowCard(w)).join('')}
    </div>
  `;
}

function renderWorkflowCard(w) {
  const stepCount = w.steps?.length || 0;
  const authType = w.auth?.type || 'none';

  return `
    <div class="card card-clickable workflow-card" onclick="location.hash='#/view/${encodeURIComponent(w.id)}'">
      <div class="workflow-card-header">
        <span class="badge badge-method badge-${w.method}">${w.method}</span>
        <span class="workflow-card-id">${escapeHtml(w.id)}</span>
      </div>
      <div class="workflow-card-path">${escapeHtml(w.path)}</div>
      ${w.description ? `<div class="workflow-card-desc">${escapeHtml(w.description)}</div>` : ''}
      <div class="workflow-card-meta">
        <span class="badge badge-steps">${stepCount} step${stepCount !== 1 ? 's' : ''}</span>
        <span class="badge badge-auth">${authType}</span>
        ${w.version ? `<span class="badge badge-auth">v${w.version}</span>` : ''}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
