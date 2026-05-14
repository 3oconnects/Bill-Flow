// js/app.js — Main application controller

const APP = {
  currentUser: null,
  org: null,

  setUser(user, orgId) {
    this.currentUser = user;
  },

  async init() {
    try {
      const { user, org } = await API.me();
      this.currentUser = user;
      this.org = org;

      // Show app, hide auth
      document.getElementById('auth-root').style.display = 'none';
      document.getElementById('app-root').style.display = 'flex';

      // Update sidebar user info
      document.getElementById('user-name-sidebar').textContent = user.name;
      document.getElementById('user-email-sidebar').textContent = user.email;
      document.getElementById('user-avatar-btn').textContent = user.name[0].toUpperCase();
      document.getElementById('org-name-display').textContent = org?.name || 'My Business';
      document.getElementById('org-avatar').textContent = (org?.name || 'M')[0].toUpperCase();
      document.getElementById('org-role-display').textContent = user.role;

      // Update topbar header user info
      const topbarName = document.getElementById('topbar-user-name-hdr');
      const topbarAvatar = document.getElementById('topbar-avatar-hdr');
      if (topbarName) topbarName.textContent = user.name.toUpperCase();
      if (topbarAvatar) topbarAvatar.textContent = user.name[0].toUpperCase();

      // Build sidebar nav (role-filtered)
      this.buildNav();

      // Navigate to role-appropriate default page
      const defaultPage = ROLE_DEFAULT_PAGE[user.role] || 'dashboard';
      navigateTo(defaultPage);
    } catch {
      // Not authenticated
      document.getElementById('app-root').style.display = 'none';
      document.getElementById('auth-root').style.display = 'block';
      showLogin();
    }
  }
};

// ── NAVIGATION ────────────────────────────────
const NAV_ITEMS = [
  { section: 'Overview' },
  { id: 'dashboard', label: 'Dashboard', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>` },
  { section: 'Sales' },
  { id: 'customers', label: 'Customers', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>` },
  { id: 'products',  label: 'Products',  icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },
  { id: 'invoices',  label: 'Invoices',  icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
  { id: 'payments',  label: 'Payments',  icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>` },
  { section: 'Purchases' },
  { id: 'vendors',  label: 'Vendors',   icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 6v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
  { id: 'expenses', label: 'Expenses',  icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>` },
  { section: 'Analytics' },
  { id: 'reports',  label: 'Reports',   icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
  { section: 'Workspace' },
  { id: 'marketplace', label: 'Marketplace', icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>` },
  { id: 'settings', label: 'Settings',  icon: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard', customers: 'Customers', products: 'Products', invoices: 'Invoices',
  payments: 'Payments', vendors: 'Vendors', expenses: 'Expenses',
  reports: 'Reports', settings: 'Settings', marketplace: 'Marketplace',
};

const PAGE_RENDERERS = {
  dashboard: renderDashboard,
  customers: renderCustomers,
  products: renderProducts,
  vendors: renderVendors,
  invoices: renderInvoices,
  payments: renderPayments,
  expenses: renderExpenses,
  reports: renderReports,
  settings: renderSettings,
  marketplace: renderMarketplace,
};

// Role-based page permissions
const ROLE_PAGE_ACCESS = {
  owner:  ['dashboard','customers','products','invoices','payments','vendors','expenses','reports','settings','marketplace'],
  admin:  ['dashboard','customers','products','invoices','payments','vendors','expenses','reports','settings','marketplace'],
  staff:  ['dashboard','customers','products','invoices','payments','vendors','expenses'],
  member: ['dashboard','customers','products','invoices','payments','vendors','expenses'],
};

// Role-based default landing page after login
const ROLE_DEFAULT_PAGE = {
  owner:  'dashboard',
  admin:  'dashboard',
  staff:  'invoices',
  member: 'invoices',
};

APP.buildNav = function() {
  const role = APP.currentUser?.role || 'member';
  const allowed = ROLE_PAGE_ACCESS[role] || ROLE_PAGE_ACCESS.member;
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = NAV_ITEMS.map(item => {
    if (item.section) {
      // Only show section header if at least one item in section is accessible
      return `<div class="nav-section">${item.section}</div>`;
    }
    if (!allowed.includes(item.id)) return ''; // Hide inaccessible pages
    return `<div class="nav-item" id="nav-${item.id}" data-page="${item.id}" onclick="navigateTo('${item.id}')">
      ${item.icon}
      <span>${item.label}</span>
    </div>`;
  }).join('');
};

let _currentPage = null;

async function navigateTo(page) {
  if (!PAGE_RENDERERS[page]) return;

  // Role-based access guard
  const role = APP.currentUser?.role || 'member';
  const allowed = ROLE_PAGE_ACCESS[role] || ROLE_PAGE_ACCESS.member;
  if (!allowed.includes(page)) {
    const fallback = ROLE_DEFAULT_PAGE[role] || 'dashboard';
    if (page !== fallback) return navigateTo(fallback);
    return;
  }

  _currentPage = page;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update topbar
  document.getElementById('topbar-title').textContent = PAGE_TITLES[page] || page;
  document.getElementById('topbar-actions').innerHTML = '';
  // Update subtitle
  const subtitleEl = document.getElementById('topbar-subtitle');
  if (subtitleEl) {
    const subtitles = {
      dashboard: 'Overview & key metrics',
      customers: 'Manage your customer directory',
      products: 'Product catalog, stock & warranties',
      invoices: 'Billing & invoice management',
      payments: 'Payment records & reconciliation',
      vendors: 'Vendor & supplier directory',
      expenses: 'Track business expenses',
      reports: 'Analytics & financial reports',
      settings: 'Workspace configuration',
      marketplace: 'Marketplace · Connect your tools & integrations',
    };
    subtitleEl.textContent = subtitles[page] || '';
  }

  // Render page
  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="page-content page-enter"></div>`;
  const el = main.querySelector('.page-content');

  try {
    await PAGE_RENDERERS[page](el);
  } catch(e) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <h3>Failed to load page</h3>
      <p>${esc(e.message)}</p>
    </div>`;
    console.error('Page error:', e);
  }
}

// ── TOPBAR USER DROPDOWN ──────────────────────
function toggleTopbarUserMenu(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('topbar-user-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}
function closeTopbarUserMenu() {
  const dd = document.getElementById('topbar-user-dropdown');
  if (dd) dd.style.display = 'none';
}
function goToProfileSettings() {
  closeTopbarUserMenu();
  navigateTo('settings');
  // After navigation, switch to profile tab
  setTimeout(() => {
    if (typeof switchSettingsTab === 'function') switchSettingsTab('profile');
  }, 200);
}

// ── NOTIFICATION PANEL ────────────────────────
const NOTIF_STORE_KEY = 'bf_notifications';

function _defaultNotifications() {
  return [
    { id: 1, icon: '📄', iconBg: '#eaf1fd', title: 'Invoice #INV-001 overdue', desc: 'Payment of ₹12,500 is 3 days overdue', time: '2 hours ago', unread: true },
    { id: 2, icon: '⚠️', iconBg: '#fef7e7', title: 'Low stock alert', desc: 'Product "Laptop Stand" has only 2 units left', time: '5 hours ago', unread: true },
    { id: 3, icon: '✅', iconBg: '#e6f5ee', title: 'Payment received', desc: '₹8,200 from Ravi Enterprises', time: 'Yesterday', unread: false },
    { id: 4, icon: '👤', iconBg: '#f3effe', title: 'New customer added', desc: 'Sunita Sharma joined as a new customer', time: '2 days ago', unread: false },
    { id: 5, icon: '📊', iconBg: '#eaf1fd', title: 'Monthly report ready', desc: 'March 2026 financial report is ready to view', time: '3 days ago', unread: false },
  ];
}

function _getNotifications() {
  try {
    const stored = localStorage.getItem(NOTIF_STORE_KEY);
    return stored ? JSON.parse(stored) : _defaultNotifications();
  } catch { return _defaultNotifications(); }
}

function _saveNotifications(notifs) {
  localStorage.setItem(NOTIF_STORE_KEY, JSON.stringify(notifs));
}

function _renderNotifPanel() {
  const notifs = _getNotifications();
  const list = document.getElementById('notif-list');
  const dot = document.getElementById('notif-dot');
  const unreadCount = notifs.filter(n => n.unread).length;
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
  if (!list) return;
  if (notifs.length === 0) {
    list.innerHTML = `<div style="padding:32px;text-align:center;color:var(--c-text2);font-size:13px">
      <div style="font-size:32px;margin-bottom:8px">🔔</div>No notifications</div>`;
    return;
  }
  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="markNotifRead(${n.id})">
      <div class="notif-icon" style="background:${n.iconBg}">${n.icon}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-desc">${n.desc}</div>
        <div class="notif-time">${n.time}</div>
      </div>
      ${n.unread ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--c-primary);flex-shrink:0;margin-top:6px"></div>' : ''}
    </div>`).join('');
}

function toggleNotifPanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) _renderNotifPanel();
}

function markNotifRead(id) {
  const notifs = _getNotifications();
  const n = notifs.find(x => x.id === id);
  if (n) { n.unread = false; _saveNotifications(notifs); _renderNotifPanel(); }
}

function markAllNotifRead() {
  const notifs = _getNotifications();
  notifs.forEach(n => n.unread = false);
  _saveNotifications(notifs);
  _renderNotifPanel();
  toast('All notifications marked as read');
}

function clearAllNotif() {
  _saveNotifications([]);
  _renderNotifPanel();
  document.getElementById('notif-panel').style.display = 'none';
  toast('Notifications cleared');
}

// ── UNIVERSAL SEARCH ──────────────────────────
function _setupUniversalSearch() {
  const input = document.getElementById('topbar-search-input');
  if (!input) return;
  input.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    if (!q) return;
    // Navigate based on keyword hints
    if (q.length >= 2) {
      _universalSearch(q);
    }
  });
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      _universalSearch(this.value.trim().toLowerCase());
    }
  });
  // ⌘K shortcut
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
}

function _universalSearch(q) {
  if (!q) return;
  // Map to page searches
  const pageMap = {
    'invoice': 'invoices', 'bill': 'invoices',
    'customer': 'customers', 'client': 'customers',
    'product': 'products', 'item': 'products', 'stock': 'products',
    'vendor': 'vendors', 'supplier': 'vendors',
    'expense': 'expenses',
    'payment': 'payments',
    'report': 'reports',
    'setting': 'settings',
    'dashboard': 'dashboard',
  };
  for (const [kw, page] of Object.entries(pageMap)) {
    if (q.includes(kw)) { navigateTo(page); return; }
  }
  toast(`Searching for "${q}"…`);
}

// ── MOBILE SIDEBAR ────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── USER DROPDOWN ─────────────────────────────
document.getElementById('user-menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const dd = document.getElementById('user-dropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
});
document.addEventListener('click', (e) => {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.style.display = 'none';
  const tdd = document.getElementById('topbar-user-dropdown');
  if (tdd) tdd.style.display = 'none';
  // Close notif panel if clicking outside
  const panel = document.getElementById('notif-panel');
  const bellBtn = document.getElementById('notif-bell-btn');
  if (panel && panel.style.display !== 'none' && !panel.contains(e.target) && !bellBtn?.contains(e.target)) {
    panel.style.display = 'none';
  }
});

// Close sidebar on outside click (mobile)
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// ── KEYBOARD SHORTCUTS ────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    document.getElementById('sidebar').classList.remove('open');
  }
});

// ── BOOT ─────────────────────────────────────
APP.init();

// ── APPEARANCE RESTORE ON LOAD ────────────────
(function initAppearance() {
  const theme = localStorage.getItem('bf_theme') || 'light';
  document.documentElement.classList.toggle('dark',
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  const accent = localStorage.getItem('bf_accent');
  if (accent) document.documentElement.style.setProperty('--c-primary', accent);
  const fontMap = { 'dm-sans': '"DM Sans",sans-serif', 'inter': '"Inter",sans-serif', 'system': 'system-ui,sans-serif' };
  const font = localStorage.getItem('bf_font');
  if (font && fontMap[font]) document.documentElement.style.setProperty('--font', fontMap[font]);
  const radius = localStorage.getItem('bf_radius');
  if (radius) document.documentElement.style.setProperty('--radius', radius + 'px');
  if (localStorage.getItem('bf_compact') === 'on') document.body.classList.add('compact-mode');
  // Init notification dot after login
  setTimeout(() => { try { _renderNotifPanel(); } catch(e) {} }, 1200);
})();

// ── UNIVERSAL SEARCH SETUP ────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _setupUniversalSearch();
});
