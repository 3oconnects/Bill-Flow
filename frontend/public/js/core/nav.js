const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: ICONS.grid },
  { 
    id: 'sales', 
    label: 'Customer & Sales', 
    icon: ICONS.user,
    children: [
      { id: 'customers', label: 'Customers' },
      { id: 'invoices',  label: 'Invoices' },
      { id: 'payments',  label: 'Payments' }
    ]
  },
  {
    id: 'purchases',
    label: 'Purchase & API',
    icon: ICONS.vendor,
    children: [
      { id: 'vendors',  label: 'Vendors' },
      { id: 'marketplace', label: 'Marketplace' }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: ICONS.product,
    children: [
      { id: 'products', label: 'Products' }
    ]
  },
  {
    id: 'finance',
    label: 'Finance Module',
    icon: ICONS.dollar,
    children: [
      { id: 'expenses', label: 'Expenses' },
      { id: 'reports',  label: 'Reports' }
    ]
  },
  {
    id: 'banking_group',
    label: 'Banking Module',
    icon: ICONS.bank,
    children: [
      { id: 'banking', label: 'Banking' }
    ]
  }
];

const PAGE_RENDERERS = { dashboard: renderDashboard, customers: renderCustomers, products: renderProducts, vendors: renderVendors, invoices: renderInvoices, payments: renderPayments, expenses: renderExpenses, reports: renderReports, settings: renderSettings, marketplace: renderMarketplace, banking: renderBanking };
const ROLE_PAGE_ACCESS = { owner: ['dashboard','customers','products','invoices','payments','vendors','expenses','reports','settings','marketplace','banking'], admin: ['dashboard','customers','products','invoices','payments','vendors','expenses','reports','settings','marketplace','banking'], staff: ['dashboard','customers','products','invoices','payments','vendors','expenses','banking'], member: ['dashboard','customers','products','invoices','payments','vendors','expenses'] };
const ROLE_DEFAULT_PAGE = { owner: 'dashboard', admin: 'dashboard', staff: 'invoices', member: 'invoices' };

APP.buildNav = function() {
  const allowed = ROLE_PAGE_ACCESS[APP.currentUser?.role] || ROLE_PAGE_ACCESS.member;
  
  const renderItem = (item) => {
    if (item.children) {
      const visibleChildren = item.children.filter(c => allowed.includes(c.id));
      if (visibleChildren.length === 0) return '';
      
      return `
        <div class="nav-group" id="group-${item.id}">
          <div class="nav-item has-children" data-label="${item.label}" onclick="toggleNavGroup('${item.id}')">
            ${item.icon}<span>${item.label}</span>
            <svg class="nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="nav-children">
            ${visibleChildren.map(c => `
              <div class="nav-sub-item" id="nav-${c.id}" data-page="${c.id}" onclick="navigateTo('${c.id}')">${c.label}</div>
            `).join('')}
          </div>
        </div>`;
    }
    
    if (!allowed.includes(item.id)) return '';
    return `<div class="nav-item" id="nav-${item.id}" data-page="${item.id}" data-label="${item.label}" onclick="navigateTo('${item.id}')">${item.icon}<span>${item.label}</span></div>`;
  };

  // Main Nav
  document.getElementById('sidebar-nav').innerHTML = NAV_ITEMS.map(renderItem).join('');

  // Footer Nav (Settings)
  document.getElementById('sidebar-footer-nav').innerHTML = `
    <div class="nav-item" id="nav-settings" data-page="settings" data-label="Settings" onclick="navigateTo('settings')">
      ${ICONS.settings}<span>Settings</span>
    </div>`;
};

function toggleNavGroup(groupId) {
  const group = document.getElementById(`group-${groupId}`);
  if (group) group.classList.toggle('expanded');
}

async function navigateTo(page) {
  if (!PAGE_RENDERERS[page]) return;
  const allowed = ROLE_PAGE_ACCESS[APP.currentUser?.role] || ROLE_PAGE_ACCESS.member;
  if (!allowed.includes(page) && page !== 'settings') return;

  // UI State
  document.querySelectorAll('.nav-item, .nav-sub-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`nav-${page}`);
  if (activeEl) {
    activeEl.classList.add('active');
    // If it's a sub-item, expand parent and mark parent active
    const group = activeEl.closest('.nav-group');
    if (group) {
      group.classList.add('expanded');
      group.querySelector('.nav-item').classList.add('active');
    }
  }

  // Render Page
  const el = document.getElementById('main-content');
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  await PAGE_RENDERERS[page](el);
  APP.currentPage = page;
}
