// js/pages/roles/manage.js
function _renderManageRoles() {
  return `
    <div class="settings-card">
      <div class="settings-card-head" style="justify-content:space-between">
        <span style="font-weight:700">All Roles (${_roles.length})</span>
        <button class="btn btn-primary btn-sm" onclick="switchRolesSubTab('create')">${ICONS.plus} New Role</button>
      </div>
      <div id="roles-list-wrap" style="padding:15px">${_renderRolesList()}</div>
    </div>`;
}

function _renderRolesList() {
  return _roles.map(role => {
    const color = role.color || '#2563eb';
    return `<div class="role-card" onclick="_selectedRoleId='${role.id}'">
      <div class="role-card-head">
        <div class="role-card-name">
          <div class="role-avatar" style="background:${color}18;color:${color}">${role.name[0].toUpperCase()}</div>
          <div><strong>${esc(role.name)}</strong><div style="font-size:11px;color:var(--c-text3)">${esc(role.description||'')}</div></div>
        </div>
        <div class="role-card-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openEditRole('${role.id}')">${ICONS.edit}</button>
          ${!role.isSystem ? `<button class="btn btn-danger btn-icon btn-sm" onclick="deleteRole('${role.id}')">${ICONS.trash}</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function deleteRole(id) {
  confirmDel('Delete this role?', () => {
    _roles = _roles.filter(r => r.id !== id);
    toast('Role deleted');
    switchRolesSubTab('manage');
  });
}
