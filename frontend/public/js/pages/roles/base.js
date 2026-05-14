// js/pages/roles/base.js
let _roles = [
  { id: 'role_owner', name: 'Owner', description: 'Full system access.', isSystem: true, color: '#7c3aed', permissions: { dashboard: ['view'], products: ['view','add','edit','delete'], invoices: ['view','create','edit','delete'], vendors: ['view','add','edit','delete'], customers: ['view','add','edit','delete'], expenses: ['view','add','edit','delete'], reports: ['view','export'], settings: ['view','manage_roles','system_config'] }, createdAt: '2024-01-01', assignedUsers: [] },
  { id: 'role_admin', name: 'Admin', description: 'Full access except system config.', isSystem: true, color: '#2563eb', permissions: { dashboard: ['view'], products: ['view','add','edit','delete'], invoices: ['view','create','edit','delete'], vendors: ['view','add','edit','delete'], customers: ['view','add','edit','delete'], expenses: ['view','add','edit','delete'], reports: ['view','export'], settings: ['view','manage_roles'] }, createdAt: '2024-01-01', assignedUsers: [] },
  { id: 'role_staff', name: 'Staff', description: 'Can view and create records.', isSystem: true, color: '#059669', permissions: { dashboard: ['view'], products: ['view','add'], invoices: ['view','create'], vendors: ['view'], customers: ['view','add'], expenses: ['view','add'], reports: ['view'], settings: [] }, createdAt: '2024-01-01', assignedUsers: [] }
];

let _assignUsers = [
  { id: 'u_owner', name: null, email: null, roleId: 'role_owner', status: 'active', isOwner: true },
  { id: 'u_staff1', name: 'Ravi Kumar', email: 'ravi@example.com', roleId: 'role_staff', status: 'active', isOwner: false },
  { id: 'u_staff2', name: 'Meena Nair', email: 'meena@example.com', roleId: 'role_admin', status: 'inactive', isOwner: false },
];

let _rolesActiveSubTab = 'manage', _editingRole = null, _rolesSearchQuery = '', _assignSearchQuery = '', _selectedRoleId = null;
let _roleActivityLog = [{ action: 'Created role "Owner"', user: 'System', time: '2024-01-01' }, { action: 'Created role "Admin"', user: 'System', time: '2024-01-01' }, { action: 'Created role "Staff"', user: 'System', time: '2024-01-01' }];

const PERMISSION_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', icon: ICONS.grid, perms: [{ key: 'view', label: 'View Dashboard' }] },
  { key: 'products', label: 'Products', icon: ICONS.product, perms: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }] },
  { key: 'invoices', label: 'Invoices', icon: ICONS.invoice, perms: [{ key: 'view', label: 'View' }, { key: 'create', label: 'Create' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }] },
  { key: 'vendors', label: 'Vendors', icon: ICONS.vendor, perms: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }] },
  { key: 'customers', label: 'Customers', icon: ICONS.user, perms: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }] },
  { key: 'expenses', label: 'Expenses', icon: ICONS.dollar, perms: [{ key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }] },
  { key: 'reports', label: 'Reports', icon: ICONS.chart, perms: [{ key: 'view', label: 'View' }, { key: 'export', label: 'Export' }] },
  { key: 'settings', label: 'Settings', icon: ICONS.settings, perms: [{ key: 'view', label: 'View' }, { key: 'manage_roles', label: 'Manage Roles' }, { key: 'system_config', label: 'System Config' }] }
];

function renderRolesTab() {
  if (_editingRole) return _renderRoleEditor();
  const subTabs = [
    { id: 'manage', label: 'Manage Roles', icon: ICONS.users },
    { id: 'create', label: 'Create Role', icon: ICONS.plus },
    { id: 'assign', label: 'Assign Roles', icon: ICONS.user_plus },
    { id: 'security', label: 'Security', icon: ICONS.lock },
    { id: 'log', label: 'Activity Log', icon: ICONS.list },
  ];
  return `
    <div class="roles-subtabs">${subTabs.map(t => `<button class="roles-subtab${_rolesActiveSubTab===t.id?' active':''}" onclick="switchRolesSubTab('${t.id}')">${t.icon}<span>${t.label}</span></button>`).join('')}</div>
    <div id="roles-subtab-content">${_renderRolesSubTab(_rolesActiveSubTab)}</div>`;
}

function switchRolesSubTab(tab) {
  _rolesActiveSubTab = tab;
  document.getElementById('roles-subtab-content').innerHTML = _renderRolesSubTab(tab);
}

function _renderRolesSubTab(tab) {
  switch(tab) {
    case 'manage': return _renderManageRoles();
    case 'create': return _renderCreateRole();
    case 'assign': return _renderAssignRoles();
    case 'security': return _renderSecuritySection();
    case 'log': return _renderActivityLog();
    default: return '';
  }
}
