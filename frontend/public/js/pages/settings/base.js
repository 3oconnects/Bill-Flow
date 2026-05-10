// js/pages/settings/base.js
let _settingsOrg = null, _settingsTeam = [], _settingsActiveTab = 'organization';
let _customForms = [], _editingForm = null;

async function renderSettings(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  document.getElementById('topbar-actions').innerHTML = '';
  [_settingsOrg, _settingsTeam] = await Promise.all([
    API.getOrg(),
    APP.currentUser?.role !== 'member' ? API.getTeam() : Promise.resolve([])
  ]);
  _renderSettingsLayout(el);
}

function _renderSettingsLayout(el) {
  const tabs = [
    { id: 'profile',       icon: ICONS.user,     label: 'Profile' },
    { id: 'security',      icon: ICONS.lock,     label: 'Security' },
    { id: 'notifications', icon: ICONS.info,     label: 'Notifications' },
    { id: 'appearance',    icon: ICONS.eye,      label: 'Appearance' },
    { id: 'divider',       type: 'divider' },
    { id: 'organization',  icon: ICONS.home,     label: 'Organization' },
    { id: 'invoice',       icon: ICONS.invoice,  label: 'Invoice' },
    { id: 'billing',       icon: ICONS.card,     label: 'Billing' },
    { id: 'team',          icon: ICONS.users,    label: 'Team' },
    { id: 'divider2',      type: 'divider' },
    { id: 'logout',        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--c-red)"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`, label: 'Logout', class: 'btn-logout' },
  ];
  el.innerHTML = `
    <div class="settings-layout">
      <div class="settings-sidenav">
        ${tabs.map(t => {
          if (t.type === 'divider') return `<div style="height:1px;background:var(--c-border);margin:8px 12px"></div>`;
          return `<button class="settings-sidenav-btn ${t.class||''}${_settingsActiveTab===t.id?' active':''}" onclick="handleSettingsTabClick('${t.id}')">${t.icon}<span>${t.label}</span></button>`;
        }).join('')}
      </div>
      <div class="settings-content" id="settings-content-area">${_renderSettingsTab(_settingsActiveTab)}</div>
    </div>`;
}

function handleSettingsTabClick(tab) {
  if (tab === 'logout') {
    if (confirm('Are you sure you want to log out?')) API.logout().then(() => location.reload());
    return;
  }
  switchSettingsTab(tab);
}

function switchSettingsTab(tab) {
  _settingsActiveTab = tab;
  const el = document.getElementById('main-content');
  if (el) _renderSettingsLayout(el);
}

function _renderSettingsTab(tab) {
  switch(tab) {
    case 'organization': return _renderOrgTab();
    case 'invoice':      return _renderInvoiceTab();
    case 'notifications': return _renderNotificationsTab();
    case 'security':     return _renderSecurityTab();
    case 'appearance':   return _renderAppearanceTab();
    case 'billing':      return _renderBillingTab();
    case 'team':         return _renderTeamTab();
    case 'profile':      return _renderProfileTab();
    default:             return `<div class="settings-card"><div class="settings-card-body">Select a tab to view settings.</div></div>`;
  }
}

function _renderNotificationsTab() {
  return `<div class="settings-card"><div class="settings-card-head">${ICONS.info} Notifications</div><div class="settings-card-body"><p style="color:var(--c-text2)">Manage your email and system notification preferences.</p></div></div>`;
}
function _renderBillingTab() {
  return `<div class="settings-card"><div class="settings-card-head">${ICONS.card} Billing & Subscription</div><div class="settings-card-body"><p style="color:var(--c-text2)">View your plan, billing history, and payment methods.</p></div></div>`;
}
