/**
 * Flow diagram — renders a horizontal step-by-step flow visualization.
 */

export function renderFlowDiagram(workflow) {
  if (!workflow || !workflow.steps || workflow.steps.length === 0) {
    return '<div class="empty-state"><div class="empty-state-icon">🔗</div><p class="empty-state-text">No steps configured</p></div>';
  }

  const nodes = [];

  // Client node
  nodes.push(renderNode('client', 'Client', `${workflow.method} ${workflow.path}`, 'CLIENT'));

  // Step nodes
  workflow.steps.forEach((step, i) => {
    const hasCondition = !!step.condition;
    const nodeType = hasCondition ? 'condition' : 'step';
    const detail = step.vendor
      ? `${step.vendor.method} ${step.vendor.path}`
      : 'HTTP Call';
    const label = hasCondition ? `STEP ${i + 1} (conditional)` : `STEP ${i + 1}`;
    nodes.push(renderArrow());
    nodes.push(renderNode(nodeType, step.name, detail, label));
  });

  // Response node
  nodes.push(renderArrow());
  nodes.push(renderNode('response', 'Response', `${workflow.response.mapping.length} field(s)`, 'OUTPUT'));

  return `
    <div class="flow-diagram">
      <div class="flow-container">
        ${nodes.join('')}
      </div>
    </div>
  `;
}

function renderNode(type, name, detail, label) {
  return `
    <div class="flow-node flow-node-${type}">
      <span class="flow-node-label">${escapeHtml(label)}</span>
      <div class="flow-node-box">
        <div class="flow-node-name">${escapeHtml(name)}</div>
        <div class="flow-node-detail">${escapeHtml(detail)}</div>
      </div>
    </div>
  `;
}

function renderArrow() {
  return `
    <div class="flow-arrow">
      <div class="flow-arrow-line"></div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
