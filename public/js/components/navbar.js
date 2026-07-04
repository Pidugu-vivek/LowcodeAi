/**
 * Navbar component.
 */

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: gridIcon(), hash: '#/' },
  { id: 'editor',    label: 'New Workflow', icon: plusIcon(), hash: '#/editor' },
  { id: 'console',   label: 'Test Console', icon: terminalIcon(), hash: '#/console' },
];

export function renderNavbar(activeId) {
  const navbar = document.getElementById('navbar');
  navbar.innerHTML = `
    <div class="nav-inner">
      <div class="nav-brand" onclick="location.hash='#/'">
        <div class="nav-brand-icon">⚡</div>
        <span>API Orchestrator</span>
      </div>
      <div class="nav-links">
        ${NAV_ITEMS.map(item => `
          <button class="nav-link ${activeId === item.id ? 'active' : ''}"
                  onclick="location.hash='${item.hash}'" id="nav-${item.id}">
            ${item.icon}
            <span>${item.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function gridIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
}

function plusIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
}

function terminalIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
}
