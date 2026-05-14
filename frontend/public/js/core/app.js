// js/core/app.js
const APP = {
  currentUser: null,
  org: null,
  setUser(user, orgId) { this.currentUser = user; },
  async init() {
    try {
      const { user, org } = await API.me();
      this.currentUser = user; this.org = org;
      document.getElementById('auth-root').style.display = 'none';
      document.getElementById('app-root').style.display = 'flex';
      this.updateUI(user, org);
      this.buildNav();
      navigateTo(ROLE_DEFAULT_PAGE[user.role] || 'dashboard');
    } catch {
      document.getElementById('app-root').style.display = 'none';
      document.getElementById('auth-root').style.display = 'block';
      showLogin();
    }
  },
  updateUI(user, org) {
    document.getElementById('org-name-display').textContent = org?.name || 'My Business';
    document.getElementById('org-avatar').textContent = (org?.name || 'M')[0].toUpperCase();
    document.getElementById('org-role-display').textContent = user.role;
    const topbarName = document.getElementById('topbar-user-name-hdr');
    const topbarAvatar = document.getElementById('topbar-avatar-hdr');
    if (topbarName) topbarName.textContent = user.name.toUpperCase();
    if (topbarAvatar) topbarAvatar.textContent = user.name[0].toUpperCase();
  }
};

function toggleSidebarCollapse() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
