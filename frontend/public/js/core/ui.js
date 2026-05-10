// js/core/ui.js
function toggleTopbarUserMenu(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('topbar-user-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function closeTopbarUserMenu() {
  const dd = document.getElementById('topbar-user-dropdown');
  if (dd) dd.style.display = 'none';
}

function goToProfileSettings() {
  closeTopbarUserMenu();
  navigateTo('settings');
  setTimeout(() => { if (typeof switchSettingsTab === 'function') switchSettingsTab('profile'); }, 200);
}

function _renderNotifPanel() {
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = 'none'; // simple mock
  const list = document.getElementById('notif-list');
  if (list) list.innerHTML = `<div style="padding:32px;text-align:center;color:var(--c-text2)">No new notifications</div>`;
}

function toggleNotifPanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('notif-panel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  if (panel.style.display !== 'none') _renderNotifPanel();
}

function _setupUniversalSearch() {
  const input = document.getElementById('topbar-search-input');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') toast(`Searching for "${input.value}"...`);
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); input.focus(); }
  });
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

document.addEventListener('DOMContentLoaded', () => {
  _setupUniversalSearch();
  document.getElementById('user-menu-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    const dd = document.getElementById('user-dropdown');
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  });
});

document.addEventListener('click', () => {
  ['user-dropdown','topbar-user-dropdown','notif-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
