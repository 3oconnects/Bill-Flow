// js/pages/settings/misc.js
function _renderLocalizationTab() {
  const savedLang = localStorage.getItem('bf_lang') || 'en';
  return `
    <div class="settings-card">
      <div class="settings-card-head">Localization</div>
      <div class="settings-card-body">
        <label class="form-label">Language</label>
        <select class="form-input" onchange="localStorage.setItem('bf_lang',this.value);toast('Saved')">
          <option value="en"${savedLang==='en'?' selected':''}>English</option>
          <option value="hi"${savedLang==='hi'?' selected':''}>Hindi</option>
        </select>
      </div>
    </div>`;
}

function _renderAppearanceTab() {
  const savedTheme = localStorage.getItem('bf_theme') || 'light';
  return `
    <div class="settings-card">
      <div class="settings-card-head">${ICONS.eye} Visual Appearance</div>
      <div class="settings-card-body">
        <div class="settings-row">
          <div class="settings-label-wrap"><div class="settings-label">Color Theme</div><div class="settings-desc">Choose between light and dark modes for your interface.</div></div>
          <div style="display:flex;gap:12px">
            <div class="theme-opt ${savedTheme==='light'?'active':''}" onclick="applyTheme('light')">
              <div class="theme-preview light"></div>
              <span>Light Mode</span>
            </div>
            <div class="theme-opt ${savedTheme==='dark'?'active':''}" onclick="applyTheme('dark')">
              <div class="theme-preview dark"></div>
              <span>Dark Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function applyTheme(t) {
  localStorage.setItem('bf_theme', t);
  document.documentElement.classList.toggle('dark', t === 'dark');
  toast('Theme applied successfully');
  _renderSettingsLayout(document.querySelector('.page-content'));
}

function _renderTeamTab() {
  return `
    <div class="settings-card">
      <div class="settings-card-head">${ICONS.users} Team Management</div>
      <div class="settings-card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div><div class="settings-label">Active Members</div><div class="settings-desc">Manage who has access to your business workspace.</div></div>
          <button class="btn btn-primary btn-sm" onclick="openMemberForm()">${ICONS.plus} Invite Member</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>
              ${(Array.isArray(_settingsTeam) && _settingsTeam.length > 0) ? _settingsTeam.map(u => `
                <tr>
                  <td><div style="font-weight:600">${esc(u.name)}</div></td>
                  <td>${esc(u.email)}</td>
                  <td><span class="badge badge-paid">${esc(u.role)}</span></td>
                  <td style="text-align:right">
                    <button class="btn btn-ghost btn-sm" onclick="editMember('${u.id}')">${ICONS.edit}</button>
                  </td>
                </tr>`).join('') : '<tr><td colspan="4" class="empty-state">No members found</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function _renderProfileTab() {
  const u = APP.currentUser || {};
  return `
    <div class="settings-card">
      <div class="settings-card-head">${ICONS.user} Personal Profile</div>
      <div class="settings-card-body">
        <div class="settings-row">
          <div class="settings-label-wrap"><div class="settings-label">Account Identity</div><div class="settings-desc">Your name as it appears to other team members.</div></div>
          <div class="settings-ctrl"><label>Full Name</label><input type="text" value="${esc(u.name)}" disabled></div>
        </div>
        <div class="settings-row">
          <div class="settings-label-wrap"><div class="settings-label">Email Address</div><div class="settings-desc">Used for login and notifications (cannot be changed here).</div></div>
          <div class="settings-ctrl"><label>Email</label><input type="text" value="${esc(u.email)}" disabled></div>
        </div>
      </div>
    </div>`;
}

function _renderSecurityTab() {
  return `
    <div class="settings-card">
      <div class="settings-card-head">${ICONS.lock} Security & Password</div>
      <div class="settings-card-body">
        <div class="settings-row">
          <div class="settings-label-wrap"><div class="settings-label">Credentials</div><div class="settings-desc">Update your password to keep your account secure.</div></div>
          <div class="settings-ctrl"><button class="btn btn-secondary" onclick="openPasswordModal()">Change Password</button></div>
        </div>
      </div>
    </div>`;
}
