/**
 * App — hash-based SPA router.
 * Routes:
 *   #/              → Dashboard
 *   #/editor        → New Workflow
 *   #/editor/:id    → Edit Workflow
 *   #/view/:id      → View Workflow
 *   #/console       → Test Console
 *   #/console/:id   → Test Console (pre-selected)
 */

import { renderDashboard } from './views/dashboard.js';
import { renderEditor } from './views/editor.js';
import { renderViewer } from './views/viewer.js';
import { renderConsole } from './views/console.js';

function route() {
  const hash = location.hash || '#/';
  const parts = hash.replace('#', '').split('/').filter(Boolean);

  const view = parts[0] || '';
  const param = parts.slice(1).map(decodeURIComponent).join('/');

  switch (view) {
    case 'editor':
      renderEditor(param || null);
      break;
    case 'view':
      renderViewer(param);
      break;
    case 'console':
      renderConsole(param || null);
      break;
    default:
      renderDashboard();
      break;
  }
}

// Listen for hash changes
window.addEventListener('hashchange', route);

// Initial route
route();
