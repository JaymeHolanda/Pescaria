// Página isolada do Painel Admin (dist/admin.html).
import {
  renderAdminProPanel,
  setAdminCommunityContext,
  initFirebaseRealtimeSync,
  setupAdminAutoRefresh,
  refreshAdminDataFromFirebase
} from './community-enhancements.js';

export const ADMIN_CREDENTIALS = { user: 'admin', pass: 'marecerta@2026' };
const SESSION_KEY = 'mare-certa-admin-session-v1';

export function checkAdminCredentials(user, pass) {
  return String(user || '').trim() === ADMIN_CREDENTIALS.user && String(pass || '') === ADMIN_CREDENTIALS.pass;
}

function showPanel(loggedIn) {
  const login = document.getElementById('adminLoginCard');
  const panel = document.getElementById('adminPanelArea');
  if (login) login.hidden = loggedIn;
  if (panel) panel.hidden = !loggedIn;
  if (loggedIn) {
    initFirebaseRealtimeSync();
    setAdminCommunityContext({ uid: 'admin-master', email: 'admin@marecerta.com.br', displayName: 'Administrador' }, {}, {});
    renderAdminProPanel();
    setupAdminAutoRefresh();
    refreshAdminDataFromFirebase();
  }
}

if (typeof document !== 'undefined') {
  let logged = false;
  try { logged = sessionStorage.getItem(SESSION_KEY) === '1'; } catch {}
  showPanel(logged);
  if (logged) {
    initFirebaseRealtimeSync();
  }

  document.getElementById('adminLoginForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const ok = checkAdminCredentials(form.elements.adminUser.value, form.elements.adminPass.value);
    document.getElementById('adminLoginError').hidden = ok;
    if (!ok) return;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    form.reset();
    showPanel(true);
  });

  document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    showPanel(false);
  });
}
