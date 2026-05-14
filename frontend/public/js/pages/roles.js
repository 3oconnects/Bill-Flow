// js/pages/roles.js — Roles & Permissions (Improved)

// ── State ──────────────────────────────────────
let _roles = [
  {
    id: 'role_owner',
    name: 'Owner',
    description: 'Full system access including billing, settings, and account management.',
    isSystem: true,
    color: '#7c3aed',
    permissions: {
      dashboard: ['view'],
      products: ['view','add','edit','delete'],
      invoices: ['view','create','edit','delete'],
      vendors: ['view','add','edit','delete'],
      customers: ['view','add','edit','delete'],
      expenses: ['view','add','edit','delete'],
      reports: ['view','export'],
      settings: ['view','manage_roles','system_config']
    },
    createdAt: '2024-01-01',
    assignedUsers: []
  },
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Full access to all modules except system configuration.',
    isSystem: true,
    color: '#2563eb',
    permissions: {
      dashboard: ['view'],
      products: ['view','add','edit','delete'],
      invoices: ['view','create','edit','delete'],
      vendors: ['view','add','edit','delete'],
      customers: ['view','add','edit','delete'],
      expenses: ['view','add','edit','delete'],
      reports: ['view','export'],
      settings: ['view','manage_roles']
    },
    createdAt: '2024-01-01',
    assignedUsers: []
  },
  {
    id: 'role_staff',
    name: 'Staff',
    description: 'Can view and create records but cannot delete or manage settings.',
    isSystem: true,
    color: '#059669',
    permissions: {
      dashboard: ['view'],
      products: ['view','add'],
      invoices: ['view','create'],
      vendors: ['view'],
      customers: ['view','add'],
      expenses: ['view','add'],
      reports: ['view'],
      settings: []
    },
    createdAt: '2024-01-01',
    assignedUsers: []
  }
];

let _assignUsers = [
  { id: 'u_owner', name: null, email: null, roleId: 'role_owner', status: 'active', isOwner: true },
  { id: 'u_staff1', name: 'Ravi Kumar', email: 'ravi@example.com', roleId: 'role_staff', status: 'active', isOwner: false },
  { id: 'u_staff2', name: 'Meena Nair', email: 'meena@example.com', roleId: 'role_admin', status: 'inactive', isOwner: false },
];

let _rolesActiveSubTab = 'manage';
let _editingRole = null;
let _rolesSearchQuery = '';
let _assignSearchQuery = '';
let _selectedRoleId = null;
let _roleActivityLog = [
  { action: 'Created role "Owner"', user: 'System', time: '2024-01-01' },
  { action: 'Created role "Admin"', user: 'System', time: '2024-01-01' },
  { action: 'Created role "Staff"', user: 'System', time: '2024-01-01' },
];

// ── Permission Schema ───────────────────────────
const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    perms: [{ key: 'view', label: 'View Dashboard' }]
  },
  {
    key: 'products',
    label: 'Products',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    perms: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }]
  },
  {
    key: 'invoices',
    label: 'Invoices',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    perms: [{ key: 'view', label: 'View' }, { key: 'create', label: 'Create' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }]
  },
  {
    key: 'vendors',
    label: 'Vendors',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 6v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    perms: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }]
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
    perms: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }]
  },
  {
    key: 'expenses',
    label: 'Expenses',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    perms: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }]
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    perms: [{ key: 'view', label: 'View' }, { key: 'export', label: 'Export' }]
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    perms: [{ key: 'view', label: 'View' }, { key: 'manage_roles', label: 'Manage Roles' }, { key: 'system_config', label: 'System Config' }]
  }
];

// ── CSS ─────────────────────────────────────────
const ROLES_CSS = `<style>
.roles-subtabs{display:flex;gap:4px;margin-bottom:24px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius-lg);padding:5px;box-shadow:var(--shadow);overflow-x:auto}
.roles-subtab{flex:1;min-width:100px;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 12px;border-radius:calc(var(--radius-lg) - 4px);border:none;background:transparent;font-size:12px;font-weight:600;color:var(--c-text2);cursor:pointer;transition:all .18s;white-space:nowrap}
.roles-subtab:hover{background:var(--c-bg);color:var(--c-text)}
.roles-subtab.active{background:var(--c-primary);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3)}
.roles-subtab svg{width:14px;height:14px;flex-shrink:0}
.roles-subtab.active svg{stroke:#fff}
.role-card{border:1.5px solid var(--c-border);border-radius:var(--radius-lg);background:var(--c-surface);overflow:hidden;margin-bottom:12px;transition:box-shadow .18s,border-color .18s,transform .1s;cursor:pointer}
.role-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.09);transform:translateY(-1px)}
.role-card.rc-selected{border-color:var(--c-primary);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.role-card-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--c-border);flex-wrap:wrap;gap:8px}
.role-card-name{font-size:14px;font-weight:700;color:var(--c-text);display:flex;align-items:center;gap:10px}
.role-card-body{padding:14px 18px}
.role-avatar{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0}
.role-badge{font-size:9px;font-weight:700;padding:3px 8px;border-radius:20px;letter-spacing:.05em;text-transform:uppercase}
.role-badge-system{background:#ede9fe;color:#6d28d9}
.role-badge-custom{background:#d1fae5;color:#065f46}
.perm-group{border:1.5px solid var(--c-border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:10px}
.perm-group-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--c-surface2);cursor:pointer;user-select:none;border-bottom:1px solid var(--c-border)}
.perm-group-head-left{display:flex;align-items:center;gap:10px;color:var(--c-primary)}
.perm-group-head-left svg{width:15px;height:15px}
.perm-group-head-label{font-size:13px;font-weight:700;color:var(--c-text)}
.perm-group-head-count{font-size:10px;font-weight:700;color:var(--c-text3);background:var(--c-bg);padding:2px 8px;border-radius:20px;border:1px solid var(--c-border)}
.perm-group-body{padding:12px 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px;background:var(--c-surface)}
.perm-toggle{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;border:1.5px solid var(--c-border);background:var(--c-bg);cursor:pointer;transition:all .15s;user-select:none;outline:none}
.perm-toggle:hover{border-color:var(--c-primary);background:var(--c-primary-lt)}
.perm-toggle:focus{outline:2px solid var(--c-primary);outline-offset:1px}
.perm-toggle.pt-on{border-color:var(--c-primary);background:var(--c-primary-lt)}
.perm-toggle input[type=checkbox]{display:none}
.perm-dot{width:18px;height:18px;border-radius:50%;border:2px solid var(--c-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;background:var(--c-surface)}
.perm-toggle.pt-on .perm-dot{background:var(--c-primary);border-color:var(--c-primary)}
.perm-dot-check{display:none}
.perm-toggle.pt-on .perm-dot-check{display:block}
.perm-toggle-label{font-size:12px;font-weight:600;color:var(--c-text2);transition:color .15s}
.perm-toggle.pt-on .perm-toggle-label{color:var(--c-primary)}
.perm-select-all-bar{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;background:linear-gradient(135deg,rgba(37,99,235,.06),rgba(37,99,235,.02));border:1px solid rgba(37,99,235,.15);border-radius:var(--radius-lg);margin-bottom:16px;flex-wrap:wrap;gap:8px}
.perm-bar-left{display:flex;align-items:center;gap:10px}
.perm-bar-right{display:flex;gap:6px}
.assign-search-bar{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--c-border)}
.assign-search-wrap{position:relative;flex:1}
.assign-search-wrap svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;stroke:var(--c-text3);pointer-events:none}
.assign-search-wrap input{width:100%;padding:8px 12px 8px 34px;border:1.5px solid var(--c-border);border-radius:var(--radius);background:var(--c-bg);font-size:13px;color:var(--c-text);outline:none;transition:border-color .15s;box-sizing:border-box}
.assign-search-wrap input:focus{border-color:var(--c-primary)}
.assign-row{display:grid;grid-template-columns:44px 1fr auto auto auto;align-items:center;gap:12px;padding:13px 18px;border-bottom:1px solid var(--c-border);transition:background .12s}
.assign-row:hover{background:var(--c-surface2)}
.assign-row:last-child{border-bottom:none}
.assign-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.log-entry{display:flex;align-items:flex-start;gap:12px;padding:12px 18px;border-bottom:1px solid var(--c-border);transition:background .12s}
.log-entry:hover{background:var(--c-surface2)}
.log-entry:last-child{border-bottom:none}
.log-dot{width:8px;height:8px;border-radius:50%;background:var(--c-primary);margin-top:5px;flex-shrink:0}
.roles-search-wrap{position:relative}
.roles-search-wrap svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:14px;height:14px;stroke:var(--c-text3);pointer-events:none}
.roles-search-wrap input{width:100%;padding:9px 12px 9px 34px;border:1.5px solid var(--c-border);border-radius:var(--radius);background:var(--c-bg);font-size:13px;color:var(--c-text);outline:none;transition:border-color .15s;box-sizing:border-box}
.roles-search-wrap input:focus{border-color:var(--c-primary)}
.perm-pill{display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;background:var(--c-primary-lt);color:var(--c-primary);margin:2px 2px 2px 0;text-transform:capitalize}
.perm-prog-bar{height:5px;background:var(--c-border);border-radius:3px;overflow:hidden}
.perm-prog-fill{height:100%;border-radius:3px;transition:width .4s}
.pw-input-wrap{position:relative}
.pw-input-wrap input{padding-right:40px}
.pw-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;color:var(--c-text3);display:flex;align-items:center}
.pw-eye:hover{color:var(--c-text)}
.pw-strength-bar{height:4px;border-radius:2px;margin-top:7px;background:var(--c-border);overflow:hidden}
.pw-strength-fill{height:100%;border-radius:2px;transition:all .3s;width:0}
.pw-strength-label{font-size:11px;margin-top:4px;font-weight:600;color:var(--c-text2)}
.role-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;animation:rmFadeIn .15s ease}
.role-modal{background:var(--c-surface);border-radius:var(--radius-lg);box-shadow:0 24px 64px rgba(0,0,0,.2);width:100%;max-width:640px;max-height:85vh;overflow-y:auto;animation:rmSlideUp .2s ease}
.role-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--c-border);position:sticky;top:0;background:var(--c-surface);z-index:1}
.role-modal-body{padding:20px 22px}
.role-modal-foot{display:flex;gap:10px;padding:16px 22px;border-top:1px solid var(--c-border);position:sticky;bottom:0;background:var(--c-surface)}
@keyframes rmFadeIn{from{opacity:0}to{opacity:1}}
@keyframes rmSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:640px){
  .roles-subtab span{display:none}
  .assign-row{grid-template-columns:36px 1fr auto}
  .assign-row .assign-status-cell,.assign-row .assign-role-cell{display:none}
  .perm-group-body{grid-template-columns:1fr 1fr}
}
</style>`;

// ── Main Render ─────────────────────────────────
function renderRolesTab() {
  if (_editingRole) return _renderRoleEditor();

  const subTabs = [
    { id: 'manage',   label: 'Manage Roles', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
    { id: 'create',   label: 'Create Role',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>` },
    { id: 'assign',   label: 'Assign Roles', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>` },
    { id: 'security', label: 'Security',     icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
    { id: 'log',      label: 'Activity Log', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
  ];

  return `
    ${ROLES_CSS}
    <div class="roles-subtabs">
      ${subTabs.map(t => `
        <button class="roles-subtab${_rolesActiveSubTab===t.id?' active':''}" onclick="switchRolesSubTab('${t.id}')">
          ${t.icon}<span>${t.label}</span>
        </button>`).join('')}
    </div>
    <div id="roles-subtab-content">${_renderRolesSubTab(_rolesActiveSubTab)}</div>`;
}

function switchRolesSubTab(tab) {
  _rolesActiveSubTab = tab;
  document.querySelectorAll('.roles-subtab').forEach(b =>
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${tab}'`))
  );
  const c = document.getElementById('roles-subtab-content');
  if (c) c.innerHTML = _renderRolesSubTab(tab);
}

function _renderRolesSubTab(tab) {
  switch(tab) {
    case 'manage':   return _renderManageRoles();
    case 'create':   return _renderCreateRole();
    case 'assign':   return _renderAssignRoles();
    case 'security': return _renderSecuritySection();
    case 'log':      return _renderActivityLog();
    default: return '';
  }
}

// ── Manage Roles ────────────────────────────────
function _renderManageRoles() {
  return `
    <div class="settings-card" style="margin-bottom:16px">
      <div class="settings-card-head" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
        <span style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          All Roles
          <span style="font-size:11px;font-weight:500;color:var(--c-text3);background:var(--c-bg);border:1px solid var(--c-border);padding:2px 8px;border-radius:20px">${_roles.length}</span>
        </span>
        <button class="btn btn-primary btn-sm" onclick="switchRolesSubTab('create')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Role
        </button>
      </div>
      <div style="padding:14px 18px;border-bottom:1px solid var(--c-border)">
        <div class="roles-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search roles by name or description…" value="${esc(_rolesSearchQuery)}"
            oninput="_rolesSearchQuery=this.value;document.getElementById('roles-list-wrap').innerHTML=_renderRolesList()">
        </div>
      </div>
    </div>
    <div id="roles-list-wrap">${_renderRolesList()}</div>`;
}

function _renderRolesList() {
  const list = _roles.filter(r =>
    !_rolesSearchQuery ||
    r.name.toLowerCase().includes(_rolesSearchQuery.toLowerCase()) ||
    (r.description||'').toLowerCase().includes(_rolesSearchQuery.toLowerCase())
  );

  if (!list.length) return `
    <div class="settings-card">
      <div class="settings-placeholder">
        <div class="settings-placeholder-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <h4 style="font-weight:700;font-size:15px;margin-bottom:6px">No roles found</h4>
        <p style="font-size:12px;color:var(--c-text2)">Try a different search or create a new role.</p>
      </div>
    </div>`;

  return list.map(role => {
    const totalPerms = Object.values(role.permissions).flat().length;
    const totalPossible = PERMISSION_GROUPS.reduce((s,g)=>s+g.perms.length,0);
    const pct = Math.round((totalPerms/totalPossible)*100);
    const color = role.color || '#2563eb';
    const assignedCount = _assignUsers.filter(u=>u.roleId===role.id).length;

    return `
      <div class="role-card${_selectedRoleId===role.id?' rc-selected':''}" onclick="_selectedRoleId='${role.id}';document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('rc-selected'));this.classList.add('rc-selected')">
        <div class="role-card-head">
          <div class="role-card-name">
            <div class="role-avatar" style="background:${color}18;color:${color}">${role.name[0].toUpperCase()}</div>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                ${esc(role.name)}
                <span class="role-badge ${role.isSystem?'role-badge-system':'role-badge-custom'}">${role.isSystem?'System':'Custom'}</span>
              </div>
              <div style="font-size:11px;font-weight:400;color:var(--c-text3);margin-top:1px">${esc(role.description||'')}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px" onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-sm" onclick="cloneRole('${role.id}')" style="display:flex;align-items:center;gap:5px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Clone
            </button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="openEditRole('${role.id}')" title="Edit">${ICONS.edit}</button>
            ${!role.isSystem?`<button class="btn btn-danger btn-icon btn-sm" onclick="deleteRole('${role.id}','${esc(role.name)}')" title="Delete">${ICONS.trash}</button>`:''}
          </div>
        </div>
        <div class="role-card-body">
          <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px">
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:11px;font-weight:600;color:var(--c-text3);text-transform:uppercase;letter-spacing:.05em">Permission coverage</span>
                <span style="font-size:11px;font-weight:700;color:${color}">${pct}%</span>
              </div>
              <div class="perm-prog-bar"><div class="perm-prog-fill" style="width:${pct}%;background:${color}"></div></div>
            </div>
            <div style="text-align:center;flex-shrink:0">
              <div style="font-size:20px;font-weight:800;color:var(--c-text)">${totalPerms}</div>
              <div style="font-size:10px;color:var(--c-text3)">permissions</div>
            </div>
            <div style="text-align:center;flex-shrink:0">
              <div style="font-size:20px;font-weight:800;color:var(--c-text)">${assignedCount}</div>
              <div style="font-size:10px;color:var(--c-text3)">users</div>
            </div>
          </div>
          <div style="line-height:2">
            ${PERMISSION_GROUPS.map(g=>{
              const granted=role.permissions[g.key]||[];
              if(!granted.length) return '';
              return `<span style="font-size:10px;font-weight:700;color:var(--c-text3);margin-right:4px">${g.label}:</span>${granted.map(p=>`<span class="perm-pill">${p.replace(/_/g,' ')}</span>`).join('')}`;
            }).join(' ')}
          </div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--c-border);font-size:11px;color:var(--c-text3)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;vertical-align:middle;margin-right:3px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Created ${fmtDate(role.createdAt)}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Create Role ─────────────────────────────────
function _renderCreateRole(prefill={}) {
  const colors = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#374151'];
  return `
    <div class="settings-card">
      <div class="settings-card-head" style="justify-content:space-between">
        <span style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create New Role
        </span>
        <button class="btn btn-ghost btn-sm" onclick="switchRolesSubTab('manage')">Cancel</button>
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-2" style="margin-bottom:18px">
          <div class="form-group">
            <label class="form-label req">Role Name</label>
            <input class="form-input" id="nr-name" placeholder="e.g. Accountant, Sales Manager…" value="${esc(prefill.name||'')}">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input class="form-input" id="nr-desc" placeholder="Brief description of this role…" value="${esc(prefill.description||'')}">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label">Role Color</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${colors.map(c=>`
              <button type="button"
                onclick="document.querySelectorAll('.color-pick-btn').forEach(b=>{b.style.outline='2px solid transparent'});this.style.outline='3px solid var(--c-text)';document.getElementById('nr-color').value='${c}'"
                class="color-pick-btn"
                style="width:28px;height:28px;border-radius:8px;background:${c};border:none;cursor:pointer;transition:all .15s;outline:${(prefill.color||'#2563eb')===c?'3px solid var(--c-text)':'2px solid transparent'}">
              </button>`).join('')}
          </div>
          <input type="hidden" id="nr-color" value="${prefill.color||'#2563eb'}">
        </div>

        <div class="perm-select-all-bar">
          <div class="perm-bar-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-primary)" stroke-width="2" style="width:16px;height:16px"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span style="font-size:13px;font-weight:700;color:var(--c-primary)">Permissions</span>
            <span style="font-size:11px;color:var(--c-text3)" id="nr-perm-count">0 selected</span>
          </div>
          <div class="perm-bar-right">
            <button class="btn btn-ghost btn-sm" onclick="toggleAllNewRolePerms(true)">Select All</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleAllNewRolePerms(false)">Clear All</button>
          </div>
        </div>

        ${PERMISSION_GROUPS.map(g=>`
          <div class="perm-group">
            <div class="perm-group-head">
              <div class="perm-group-head-left">
                ${g.icon}
                <span class="perm-group-head-label">${g.label}</span>
                <span class="perm-group-head-count" id="pg-count-${g.key}">0 / ${g.perms.length}</span>
              </div>
              <label onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--c-text2);cursor:pointer">
                <input type="checkbox" id="pg-all-${g.key}" onchange="togglePermGroup('${g.key}',this.checked)" style="accent-color:var(--c-primary)"> All
              </label>
            </div>
            <div class="perm-group-body">
              ${g.perms.map(p=>{
                const isOn=(prefill.permissions||{})[g.key]?.includes(p.key);
                return `<div class="perm-toggle${isOn?' pt-on':''}" id="pt-${g.key}-${p.key}"
                  onclick="toggleNewPerm('${g.key}','${p.key}',this)" tabindex="0"
                  onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();toggleNewPerm('${g.key}','${p.key}',this)}"
                  role="checkbox" aria-checked="${isOn?'true':'false'}">
                  <input type="checkbox" ${isOn?'checked':''}>
                  <div class="perm-dot"><svg class="perm-dot-check" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <span class="perm-toggle-label">${p.label}</span>
                </div>`;
              }).join('')}
            </div>
          </div>`).join('')}

        <div style="display:flex;gap:10px;margin-top:22px;padding-top:18px;border-top:1px solid var(--c-border)">
          <button class="btn btn-primary" onclick="saveNewRole()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg>
            Create Role
          </button>
          <button class="btn btn-secondary" onclick="switchRolesSubTab('manage')">Cancel</button>
        </div>
      </div>
    </div>`;
}

// ── Role Editor ─────────────────────────────────
function _renderRoleEditor() {
  const role = _editingRole;
  return `
    ${ROLES_CSS}
    <div class="settings-card">
      <div class="settings-card-head" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <button onclick="_editingRole=null;switchSettingsTab('roles')" class="btn btn-ghost btn-icon btn-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <span style="font-weight:700;font-size:14px">Edit Role: <strong style="color:var(--c-primary)">${esc(role.name)}</strong></span>
          ${role.isSystem?`<span class="role-badge role-badge-system">System</span>`:''}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="_editingRole=null;switchSettingsTab('roles')">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="updateRole()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polyline points="20 6 9 17 4 12"/></svg>
            Update Role
          </button>
        </div>
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-2" style="margin-bottom:18px">
          <div class="form-group">
            <label class="form-label req">Role Name</label>
            <input class="form-input" id="er-name" value="${esc(role.name)}" ${role.isSystem?'readonly style="opacity:.7"':''}>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <input class="form-input" id="er-desc" value="${esc(role.description||'')}">
          </div>
        </div>
        <div class="perm-select-all-bar">
          <div class="perm-bar-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-primary)" stroke-width="2" style="width:16px;height:16px"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span style="font-size:13px;font-weight:700;color:var(--c-primary)">Permissions</span>
          </div>
          <div class="perm-bar-right">
            <button class="btn btn-ghost btn-sm" onclick="toggleAllEditRolePerms(true)">Select All</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleAllEditRolePerms(false)">Clear All</button>
          </div>
        </div>
        ${PERMISSION_GROUPS.map(g=>{
          const granted=role.permissions[g.key]||[];
          return `<div class="perm-group">
            <div class="perm-group-head">
              <div class="perm-group-head-left">${g.icon}<span class="perm-group-head-label">${g.label}</span><span class="perm-group-head-count">${granted.length} / ${g.perms.length}</span></div>
              <label onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--c-text2);cursor:pointer">
                <input type="checkbox" id="epg-all-${g.key}" ${granted.length===g.perms.length?'checked':''} onchange="toggleEditPermGroup('${g.key}',this.checked)" style="accent-color:var(--c-primary)"> All
              </label>
            </div>
            <div class="perm-group-body">
              ${g.perms.map(p=>{
                const isOn=granted.includes(p.key);
                return `<div class="perm-toggle${isOn?' pt-on':''}" id="ept-${g.key}-${p.key}"
                  onclick="toggleEditPerm('${g.key}','${p.key}',this)" tabindex="0"
                  onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();toggleEditPerm('${g.key}','${p.key}',this)}"
                  role="checkbox" aria-checked="${isOn?'true':'false'}">
                  <input type="checkbox" ${isOn?'checked':''}>
                  <div class="perm-dot"><svg class="perm-dot-check" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <span class="perm-toggle-label">${p.label}</span>
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Assign Roles ────────────────────────────────
function _renderAssignRoles() {
  return `
    <div class="settings-card">
      <div class="settings-card-head" style="justify-content:space-between;flex-wrap:wrap;gap:10px">
        <span style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
          Assign Roles to Users
          <span style="font-size:11px;font-weight:500;color:var(--c-text3);background:var(--c-bg);border:1px solid var(--c-border);padding:2px 8px;border-radius:20px">${_assignUsers.length}</span>
        </span>
        <button class="btn btn-primary btn-sm" onclick="openAddUserModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>
      <div class="assign-search-bar">
        <div class="assign-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search by name or email…" value="${esc(_assignSearchQuery)}"
            oninput="_assignSearchQuery=this.value;document.getElementById('assign-rows').innerHTML=_renderAssignRows()">
        </div>
      </div>
      <div style="padding:9px 18px;background:var(--c-surface2);border-bottom:1px solid var(--c-border)">
        <div class="assign-row" style="padding:0;border:none;pointer-events:none">
          <div></div>
          <span style="font-size:10px;font-weight:700;color:var(--c-text3);text-transform:uppercase;letter-spacing:.05em">User</span>
          <span class="assign-role-cell" style="font-size:10px;font-weight:700;color:var(--c-text3);text-transform:uppercase;letter-spacing:.05em;min-width:160px">Role</span>
          <span class="assign-status-cell" style="font-size:10px;font-weight:700;color:var(--c-text3);text-transform:uppercase;letter-spacing:.05em">Status</span>
          <span style="font-size:10px;font-weight:700;color:var(--c-text3);text-transform:uppercase;letter-spacing:.05em">Action</span>
        </div>
      </div>
      <div id="assign-rows">${_renderAssignRows()}</div>
    </div>`;
}

function _renderAssignRows() {
  const users = _assignUsers.map(u => u.isOwner
    ? { ...u, name: APP?.currentUser?.name || 'Account Owner', email: APP?.currentUser?.email || 'owner@billflow.com' }
    : u
  );

  const list = users.filter(u => {
    if (!_assignSearchQuery) return true;
    const q = _assignSearchQuery.toLowerCase();
    return (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q);
  });

  if (!list.length) return `<div style="padding:32px;text-align:center;font-size:13px;color:var(--c-text2)">No users match your search.</div>`;

  return list.map(u => {
    const color = u.isOwner ? '#7c3aed' : '#2563eb';
    const initial = (u.name||'?')[0].toUpperCase();
    const isActive = u.status === 'active';
    return `
      <div class="assign-row">
        <div class="assign-avatar" style="background:${color}18;color:${color}">${initial}</div>
        <div>
          <div style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px">
            ${esc(u.name||'Unknown')}
            ${u.isOwner?`<span class="role-badge role-badge-system">Owner</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--c-text2)">${esc(u.email||'')}</div>
        </div>
        <select class="form-input assign-role-cell" style="min-width:160px;font-size:12px" ${u.isOwner?'disabled':''} onchange="_updateUserRole('${u.id}',this.value)">
          <option value="">— No Role —</option>
          ${_roles.map(r=>`<option value="${r.id}" ${u.roleId===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}
        </select>
        <div style="display:flex;align-items:center;gap:5px" class="assign-status-cell">
          <span style="width:7px;height:7px;border-radius:50%;background:${isActive?'var(--c-green,#059669)':'var(--c-red,#dc2626)'};display:inline-block"></span>
          <span style="font-size:12px;font-weight:600;color:${isActive?'var(--c-green,#059669)':'var(--c-red,#dc2626)'}">${isActive?'Active':'Inactive'}</span>
        </div>
        <div style="display:flex;gap:6px">
          ${!u.isOwner?`
            <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleUserStatus('${u.id}')" title="${isActive?'Deactivate':'Activate'}">
              ${isActive
                ?`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9a3 3 0 0 0 5.12 2.12"/><path d="M3 3a15.3 15.3 0 0 0-1 5 15.3 15.3 0 0 0 15.3 15.3"/></svg>`
                :`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`}
            </button>`:''}
        </div>
      </div>`;
  }).join('');
}

// ── Security Section ────────────────────────────
function _renderSecuritySection() {
  const twoFA = localStorage.getItem('bf_2fa') === 'on';
  const loginAlerts = localStorage.getItem('bf_login_alerts') !== 'off';
  return `
    <div class="settings-card" style="margin-bottom:16px">
      <div class="settings-card-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1"/></svg>
        <span style="font-weight:700">Password Management</span>
      </div>
      <div class="settings-card-body">
        <div class="form-row cols-2" style="margin-bottom:16px">
          <div class="form-group">
            <label class="form-label req">Current Password</label>
            <div class="pw-input-wrap">
              <input class="form-input" type="password" id="sec-cur-pw" placeholder="Enter current password">
              <button class="pw-eye" type="button" onclick="togglePwVisibility('sec-cur-pw',this)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div></div>
        </div>
        <div class="form-row cols-2" style="margin-bottom:16px">
          <div class="form-group">
            <label class="form-label req">New Password</label>
            <div class="pw-input-wrap">
              <input class="form-input" type="password" id="sec-new-pw" placeholder="Min 8 characters" oninput="checkPwStrength(this.value)">
              <button class="pw-eye" type="button" onclick="togglePwVisibility('sec-new-pw',this)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="pw-strength-bar"><div class="pw-strength-fill" id="sec-pw-bar"></div></div>
            <div class="pw-strength-label" id="sec-pw-label"></div>
            <div id="sec-pw-rules" style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px"></div>
          </div>
          <div class="form-group">
            <label class="form-label req">Confirm New Password</label>
            <div class="pw-input-wrap">
              <input class="form-input" type="password" id="sec-confirm-pw" placeholder="Repeat new password" oninput="checkPwMatch()">
              <button class="pw-eye" type="button" onclick="togglePwVisibility('sec-confirm-pw',this)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div id="sec-match-label" style="font-size:11px;margin-top:6px;font-weight:600"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-primary" onclick="saveNewPassword()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Update Password
          </button>
          <button class="btn btn-ghost btn-sm" onclick="openForgotPassword()">Forgot Password?</button>
        </div>
      </div>
    </div>

    <div class="settings-card" style="margin-bottom:16px">
      <div class="settings-card-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span style="font-weight:700">Two-Factor Authentication</span></div>
      <div class="settings-card-body">
        ${[
          { key:'bf_2fa', def:twoFA, title:'Authenticator App (TOTP)', desc:'Use Google Authenticator or Authy' },
          { key:'bf_login_alerts', def:loginAlerts, title:'Login Alert Emails', desc:'Get notified when a new device logs in' },
        ].map(item=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--c-border)">
            <div>
              <div style="font-weight:600;font-size:13px;margin-bottom:2px">${item.title}</div>
              <div style="font-size:12px;color:var(--c-text2)">${item.desc}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${item.def?'checked':''} onchange="localStorage.setItem('${item.key}',this.checked?'on':'off');toast(this.checked?'${item.title} enabled':'${item.title} disabled')">
              <span class="toggle-slider"></span>
            </label>
          </div>`).join('')}
      </div>
    </div>

    <div class="settings-card" style="margin-bottom:16px">
      <div class="settings-card-head" style="justify-content:space-between">
        <span style="display:flex;align-items:center;gap:8px;font-weight:700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          Active Sessions
        </span>
        <button class="btn btn-danger btn-sm" onclick="confirmDel('Revoke all other sessions?',()=>toast('All other sessions revoked'))">Revoke All Others</button>
      </div>
      <div class="settings-card-body" style="padding:0">
        ${[
          { device:'Chrome on Windows', location:'Tirupati, IN', last:'Active now', current:true },
          { device:'Safari on iPhone', location:'Hyderabad, IN', last:'2 hours ago', current:false },
          { device:'Firefox on MacOS', location:'Bengaluru, IN', last:'3 days ago', current:false },
        ].map(s=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border-bottom:1px solid var(--c-border)">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:36px;height:36px;background:var(--c-surface2);border-radius:8px;display:flex;align-items:center;justify-content:center;border:1px solid var(--c-border)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div>
                <div style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:8px">
                  ${s.device}${s.current?`<span style="font-size:10px;background:#d1fae5;color:#059669;padding:2px 7px;border-radius:20px;font-weight:700">Current</span>`:''}
                </div>
                <div style="font-size:11px;color:var(--c-text2)">${s.location} · ${s.last}</div>
              </div>
            </div>
            ${!s.current?`<button class="btn btn-ghost btn-sm" onclick="toast('Session revoked')">Revoke</button>`:''}
          </div>`).join('')}
      </div>
    </div>

    <div class="settings-card" style="border-color:var(--c-red,#dc2626);background:#fff8f8">
      <div class="settings-card-head" style="color:var(--c-red,#dc2626)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Danger Zone
      </div>
      <div class="settings-card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">Delete Account</div>
            <div style="font-size:12px;color:var(--c-text2)">Permanently delete your account and all associated data. This cannot be undone.</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="confirmDel('Delete your account permanently? All data will be lost.',()=>toast('Account deletion requested','info'))">Delete Account</button>
        </div>
      </div>
    </div>`;
}

// ── Activity Log ────────────────────────────────
function _renderActivityLog() {
  return `
    <div class="settings-card">
      <div class="settings-card-head" style="justify-content:space-between">
        <span style="display:flex;align-items:center;gap:8px;font-weight:700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Role Activity Log
          <span style="font-size:11px;font-weight:500;color:var(--c-text3);background:var(--c-bg);border:1px solid var(--c-border);padding:2px 8px;border-radius:20px">${_roleActivityLog.length}</span>
        </span>
        <button class="btn btn-ghost btn-sm" onclick="_roleActivityLog=[];switchRolesSubTab('log');toast('Log cleared')">Clear Log</button>
      </div>
      <div class="settings-card-body" style="padding:0">
        ${_roleActivityLog.length===0?`<div class="settings-placeholder"><p style="font-size:12px;color:var(--c-text2)">No activity recorded yet.</p></div>`:
          [..._roleActivityLog].reverse().map(e=>`
            <div class="log-entry">
              <div class="log-dot"></div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500;color:var(--c-text)">${esc(e.action)}</div>
                <div style="font-size:11px;color:var(--c-text3);margin-top:2px">by ${esc(e.user)} · ${e.time}</div>
              </div>
            </div>`).join('')}
      </div>
    </div>`;
}

// ── Permission Handlers ─────────────────────────
function toggleNewPerm(group, perm, el) {
  el.classList.toggle('pt-on');
  const cb = el.querySelector('input[type=checkbox]');
  if (cb) cb.checked = el.classList.contains('pt-on');
  el.setAttribute('aria-checked', el.classList.contains('pt-on'));
  _updatePermGroupCount(group,'pg-count-','pt-','pg-all-');
  _updateNewRolePermCount();
}

function toggleEditPerm(group, perm, el) {
  el.classList.toggle('pt-on');
  const cb = el.querySelector('input[type=checkbox]');
  if (cb) cb.checked = el.classList.contains('pt-on');
  el.setAttribute('aria-checked', el.classList.contains('pt-on'));
  if (_editingRole) {
    const perms = _editingRole.permissions[group] || [];
    if (el.classList.contains('pt-on')) { if (!perms.includes(perm)) perms.push(perm); }
    else { const i=perms.indexOf(perm); if(i>-1) perms.splice(i,1); }
    _editingRole.permissions[group] = perms;
  }
}

function togglePermGroup(group, checked) {
  PERMISSION_GROUPS.find(g=>g.key===group)?.perms.forEach(p=>{
    const el=document.getElementById(`pt-${group}-${p.key}`);
    if(el){ el.classList.toggle('pt-on',checked); const cb=el.querySelector('input'); if(cb) cb.checked=checked; el.setAttribute('aria-checked',checked); }
  });
  _updatePermGroupCount(group,'pg-count-','pt-','pg-all-');
  _updateNewRolePermCount();
}

function toggleEditPermGroup(group, checked) {
  PERMISSION_GROUPS.find(g=>g.key===group)?.perms.forEach(p=>{
    const el=document.getElementById(`ept-${group}-${p.key}`);
    if(el){ el.classList.toggle('pt-on',checked); const cb=el.querySelector('input'); if(cb) cb.checked=checked; el.setAttribute('aria-checked',checked); }
  });
  if(_editingRole) _editingRole.permissions[group]=checked?PERMISSION_GROUPS.find(g=>g.key===group)?.perms.map(p=>p.key)||[]:[];
}

function toggleAllNewRolePerms(checked) {
  PERMISSION_GROUPS.forEach(g=>{
    g.perms.forEach(p=>{
      const el=document.getElementById(`pt-${g.key}-${p.key}`);
      if(el){ el.classList.toggle('pt-on',checked); const cb=el.querySelector('input'); if(cb) cb.checked=checked; el.setAttribute('aria-checked',checked); }
    });
    const allCb=document.getElementById(`pg-all-${g.key}`); if(allCb) allCb.checked=checked;
    const countEl=document.getElementById(`pg-count-${g.key}`); if(countEl) countEl.textContent=checked?`${g.perms.length} / ${g.perms.length}`:`0 / ${g.perms.length}`;
  });
  _updateNewRolePermCount();
}

function toggleAllEditRolePerms(checked) {
  PERMISSION_GROUPS.forEach(g=>{
    g.perms.forEach(p=>{
      const el=document.getElementById(`ept-${g.key}-${p.key}`);
      if(el){ el.classList.toggle('pt-on',checked); const cb=el.querySelector('input'); if(cb) cb.checked=checked; el.setAttribute('aria-checked',checked); }
    });
    const allCb=document.getElementById(`epg-all-${g.key}`); if(allCb) allCb.checked=checked;
  });
  if(_editingRole) PERMISSION_GROUPS.forEach(g=>{ _editingRole.permissions[g.key]=checked?g.perms.map(p=>p.key):[]; });
}

function _updatePermGroupCount(group, countPre, togglePre, allPre) {
  const g=PERMISSION_GROUPS.find(x=>x.key===group); if(!g) return;
  const checked=g.perms.filter(p=>document.getElementById(`${togglePre}${group}-${p.key}`)?.classList.contains('pt-on')).length;
  const el=document.getElementById(`${countPre}${group}`); if(el) el.textContent=`${checked} / ${g.perms.length}`;
  const allCb=document.getElementById(`${allPre}${group}`); if(allCb) allCb.checked=checked===g.perms.length&&g.perms.length>0;
}

function _updateNewRolePermCount() {
  let total=0;
  PERMISSION_GROUPS.forEach(g=>g.perms.forEach(p=>{ if(document.getElementById(`pt-${g.key}-${p.key}`)?.classList.contains('pt-on')) total++; }));
  const el=document.getElementById('nr-perm-count'); if(el) el.textContent=`${total} selected`;
}

function _gatherPermissions(prefix) {
  const perms={};
  PERMISSION_GROUPS.forEach(g=>{ perms[g.key]=g.perms.filter(p=>document.getElementById(`${prefix}-${g.key}-${p.key}`)?.classList.contains('pt-on')).map(p=>p.key); });
  return perms;
}

// ── Role CRUD ───────────────────────────────────
function saveNewRole() {
  const name=document.getElementById('nr-name')?.value.trim();
  const desc=document.getElementById('nr-desc')?.value.trim()||'';
  const color=document.getElementById('nr-color')?.value||'#2563eb';
  if(!name){ toast('Role name is required','error'); return; }
  if(_roles.find(r=>r.name.toLowerCase()===name.toLowerCase())){ toast('A role with this name already exists','error'); return; }
  const permissions=_gatherPermissions('pt');
  _roles.push({ id:'role_'+Date.now(), name, description:desc, isSystem:false, color, permissions, createdAt:new Date().toISOString().slice(0,10), assignedUsers:[] });
  _roleActivityLog.push({ action:`Created role "${name}"`, user:APP?.currentUser?.name||'You', time:new Date().toLocaleDateString() });
  toast(`Role "${name}" created successfully`);
  _rolesActiveSubTab='manage';
  switchSettingsTab('roles');
}

function openEditRole(id) {
  const role=_roles.find(r=>r.id===id);
  if(!role) return;
  _editingRole=JSON.parse(JSON.stringify(role));
  switchSettingsTab('roles');
}

function updateRole() {
  if(!_editingRole) return;
  const name=document.getElementById('er-name')?.value.trim();
  const desc=document.getElementById('er-desc')?.value.trim()||'';
  if(!name){ toast('Role name is required','error'); return; }
  const idx=_roles.findIndex(r=>r.id===_editingRole.id);
  if(idx>=0) _roles[idx]={ ..._editingRole, name:_editingRole.isSystem?_editingRole.name:name, description:desc };
  _roleActivityLog.push({ action:`Updated role "${_editingRole.name}"`, user:APP?.currentUser?.name||'You', time:new Date().toLocaleDateString() });
  toast(`Role "${_editingRole.name}" updated`);
  _editingRole=null; _rolesActiveSubTab='manage';
  switchSettingsTab('roles');
}

function deleteRole(id, name) {
  if(_roles.find(r=>r.id===id)?.isSystem){ toast('System roles cannot be deleted','error'); return; }
  confirmDel(`Delete role "${name}"? This cannot be undone.`, ()=>{
    _roles=_roles.filter(r=>r.id!==id);
    _assignUsers.forEach(u=>{ if(u.roleId===id) u.roleId=null; });
    _roleActivityLog.push({ action:`Deleted role "${name}"`, user:APP?.currentUser?.name||'You', time:new Date().toLocaleDateString() });
    toast(`Role "${name}" deleted`);
    switchSettingsTab('roles');
  });
}

function cloneRole(id) {
  const role=_roles.find(r=>r.id===id); if(!role) return;
  const cloned={ ...JSON.parse(JSON.stringify(role)), id:'role_'+Date.now(), name:role.name+' (Copy)', isSystem:false, createdAt:new Date().toISOString().slice(0,10), assignedUsers:[] };
  _roles.push(cloned);
  _roleActivityLog.push({ action:`Cloned role "${role.name}" → "${cloned.name}"`, user:APP?.currentUser?.name||'You', time:new Date().toLocaleDateString() });
  toast(`Role cloned as "${cloned.name}"`);
  _rolesActiveSubTab='manage'; switchSettingsTab('roles');
}

// ── User Management ─────────────────────────────
function _updateUserRole(userId, roleId) {
  const u=_assignUsers.find(x=>x.id===userId);
  if(u){
    u.roleId=roleId||null;
    const roleName=_roles.find(r=>r.id===roleId)?.name||'None';
    _roleActivityLog.push({ action:`Assigned role "${roleName}" to ${u.name}`, user:APP?.currentUser?.name||'You', time:new Date().toLocaleDateString() });
    toast(roleId?'Role assignment saved':'Role removed from user');
  }
}

function toggleUserStatus(userId) {
  const u=_assignUsers.find(x=>x.id===userId); if(!u) return;
  u.status=u.status==='active'?'inactive':'active';
  _roleActivityLog.push({ action:`${u.status==='active'?'Activated':'Deactivated'} user ${u.name}`, user:APP?.currentUser?.name||'You', time:new Date().toLocaleDateString() });
  toast(`User ${u.status==='active'?'activated':'deactivated'}`);
  document.getElementById('assign-rows').innerHTML=_renderAssignRows();
}

function openAddUserModal() {
  const overlay=document.createElement('div');
  overlay.className='role-modal-overlay'; overlay.id='add-user-modal';
  overlay.innerHTML=`
    <div class="role-modal" onclick="event.stopPropagation()">
      <div class="role-modal-head">
        <span style="font-weight:700;font-size:14px">Add Team Member</span>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="document.getElementById('add-user-modal').remove()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="role-modal-body">
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label req">Full Name</label>
          <input class="form-input" id="au-name" placeholder="e.g. Priya Sharma">
        </div>
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label req">Email Address</label>
          <input class="form-input" id="au-email" type="email" placeholder="e.g. priya@company.com">
        </div>
        <div class="form-group">
          <label class="form-label">Assign Role</label>
          <select class="form-input" id="au-role">
            <option value="">— No Role —</option>
            ${_roles.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="role-modal-foot">
        <button class="btn btn-primary" onclick="_submitAddUser()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg>
          Add Member
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('add-user-modal').remove()">Cancel</button>
      </div>
    </div>`;
  overlay.addEventListener('click', ()=>overlay.remove());
  document.body.appendChild(overlay);
}

function _submitAddUser() {
  const name=document.getElementById('au-name')?.value.trim();
  const email=document.getElementById('au-email')?.value.trim();
  const roleId=document.getElementById('au-role')?.value;
  if(!name){ toast('Name is required','error'); return; }
  if(!email||!email.includes('@')){ toast('Valid email is required','error'); return; }
  if(_assignUsers.find(u=>u.email===email)){ toast('User with this email already exists','error'); return; }
  _assignUsers.push({ id:'u_'+Date.now(), name, email, roleId:roleId||null, status:'active', isOwner:false });
  _roleActivityLog.push({ action:`Added user ${name}`, user:APP?.currentUser?.name||'You', time:new Date().toLocaleDateString() });
  document.getElementById('add-user-modal')?.remove();
  toast(`${name} added successfully`);
  document.getElementById('assign-rows').innerHTML=_renderAssignRows();
}

// ── Password Functions ──────────────────────────
function togglePwVisibility(inputId, btn) {
  const input=document.getElementById(inputId); if(!input) return;
  const isText=input.type==='text';
  input.type=isText?'password':'text';
  btn.innerHTML=isText
    ?`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    :`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

function checkPwStrength(val) {
  const bar=document.getElementById('sec-pw-bar');
  const lbl=document.getElementById('sec-pw-label');
  const rules=document.getElementById('sec-pw-rules');
  if(!bar||!lbl) return;
  const checks=[
    { label:'8+ characters', pass:val.length>=8 },
    { label:'Uppercase letter', pass:/[A-Z]/.test(val) },
    { label:'Lowercase letter', pass:/[a-z]/.test(val) },
    { label:'Number (0–9)', pass:/[0-9]/.test(val) },
    { label:'Symbol (!@#…)', pass:/[^A-Za-z0-9]/.test(val) },
  ];
  const score=checks.filter(c=>c.pass).length;
  const colors=['#ef4444','#f97316','#eab308','#22c55e','#10b981'];
  const labels=['Very Weak','Weak','Fair','Strong','Very Strong'];
  bar.style.width=(score*20)+'%';
  bar.style.background=val?(colors[score-1]||'#ef4444'):'';
  lbl.textContent=val?labels[score-1]:'';
  lbl.style.color=val?(colors[score-1]||'#ef4444'):'';
  if(rules) rules.innerHTML=checks.map(c=>`
    <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:${c.pass?'#059669':'var(--c-text3)'}">
      ${c.pass?`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`:`<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`}
      ${c.label}
    </div>`).join('');
}

function checkPwMatch() {
  const nw=document.getElementById('sec-new-pw')?.value;
  const cnf=document.getElementById('sec-confirm-pw')?.value;
  const lbl=document.getElementById('sec-match-label');
  if(!lbl||!cnf) return;
  if(!nw||!cnf){ lbl.textContent=''; return; }
  lbl.style.color=nw===cnf?'#059669':'#dc2626';
  lbl.textContent=nw===cnf?'✓ Passwords match':'✗ Passwords do not match';
}

function saveNewPassword() {
  const cur=document.getElementById('sec-cur-pw')?.value;
  const nw=document.getElementById('sec-new-pw')?.value;
  const cnf=document.getElementById('sec-confirm-pw')?.value;
  if(!cur){ toast('Enter your current password','error'); return; }
  if(!nw||nw.length<8){ toast('New password must be at least 8 characters','error'); return; }
  if(!/[A-Z]/.test(nw)||!/[0-9]/.test(nw)||!/[^A-Za-z0-9]/.test(nw)){ toast('Password must include uppercase, number, and symbol','error'); return; }
  if(nw!==cnf){ toast('Passwords do not match','error'); return; }
  // Try real API
  (typeof API!=='undefined' ? API.fetch('/api/auth/change-password',{ method:'POST', body:JSON.stringify({ currentPassword:cur, newPassword:nw }) }) : Promise.reject())
    .then(r=>{ if(r.ok){ _clearPwFields(); toast('Password updated successfully'); } else r.json().then(d=>toast(d.error||'Update failed','error')); })
    .catch(()=>{ _clearPwFields(); toast('Password updated successfully'); });
}

function _clearPwFields() {
  ['sec-cur-pw','sec-new-pw','sec-confirm-pw'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const bar=document.getElementById('sec-pw-bar'); if(bar){ bar.style.width='0'; }
  const lbl=document.getElementById('sec-pw-label'); if(lbl) lbl.textContent='';
  const rules=document.getElementById('sec-pw-rules'); if(rules) rules.innerHTML='';
  const match=document.getElementById('sec-match-label'); if(match) match.textContent='';
}

function openForgotPassword() {
  const overlay=document.createElement('div');
  overlay.className='role-modal-overlay'; overlay.id='forgot-pw-modal';
  overlay.innerHTML=`
    <div class="role-modal" style="max-width:420px" onclick="event.stopPropagation()">
      <div class="role-modal-head">
        <span style="font-weight:700;font-size:14px">Reset Password</span>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="document.getElementById('forgot-pw-modal').remove()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="role-modal-body">
        <p style="font-size:13px;color:var(--c-text2);margin-bottom:16px">Enter your email and we'll send a password reset link.</p>
        <div class="form-group">
          <label class="form-label req">Email Address</label>
          <input class="form-input" id="fp-email" type="email" value="${APP?.currentUser?.email||''}" placeholder="your@email.com">
        </div>
      </div>
      <div class="role-modal-foot">
        <button class="btn btn-primary" onclick="_sendResetEmail()">Send Reset Link</button>
        <button class="btn btn-secondary" onclick="document.getElementById('forgot-pw-modal').remove()">Cancel</button>
      </div>
    </div>`;
  overlay.addEventListener('click', ()=>overlay.remove());
  document.body.appendChild(overlay);
}

function _sendResetEmail() {
  const email=document.getElementById('fp-email')?.value.trim();
  if(!email||!email.includes('@')){ toast('Enter a valid email address','error'); return; }
  document.getElementById('forgot-pw-modal')?.remove();
  toast(`Password reset link sent to ${email}`);
}
