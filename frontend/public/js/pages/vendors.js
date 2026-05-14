// js/pages/vendors.js — Enhanced Vendor Management
let _vendors = [], _vendorSearch = '', _vendorView = 'table', _vendorStatusFilter = 'all';
let _vendorGstFilter = '';

async function renderVendors(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  _vendors = await API.getVendors();
  _renderVendorTable(el);
  // If navigation was triggered with a pending vendor to open, open it now
  if (window._pendingVendorId) {
    const pendingId = window._pendingVendorId;
    window._pendingVendorId = null;
    setTimeout(() => openVendorView(pendingId), 100);
  }
}

/**
 * Navigate to Vendors page and open the detail modal for a specific vendor.
 * Can be called from any page (Products, Expenses, etc.)
 */
async function navigateToVendor(vendorId) {
  window._pendingVendorId = vendorId;
  await navigateTo('vendors');
}

function _vendorViewToggleHTML() {
  return `
    <div class="view-toggle-bar">
      <button class="view-toggle-btn ${_vendorView==='table'?'active':''}" title="Table view" onclick="_vendorView='table';_renderVendorTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>
      <button class="view-toggle-btn ${_vendorView==='card'?'active':''}" title="Card view" onclick="_vendorView='card';_renderVendorTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      </button>
    </div>`;
}

function _vendorStats() {
  const total = _vendors.length;
  const active = _vendors.filter(v => (v.status || 'active') === 'active').length;
  const inactive = total - active;
  return { total, active, inactive };
}

function _renderVendorTable(el) {
  const stats = _vendorStats();

  let filtered = _vendors.filter(v => {
    const matchStatus = _vendorStatusFilter === 'all' || (v.status || 'active') === _vendorStatusFilter;
    const q = _vendorSearch.toLowerCase();
    const matchSearch = !q ||
      v.name?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.company_name?.toLowerCase().includes(q) ||
      v.gstin?.toLowerCase().includes(q) ||
      v.vendor_id?.toLowerCase().includes(q) ||
      v.phone?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  document.getElementById('topbar-actions').innerHTML =
    `<button class="btn btn-primary" onclick="openVendorForm()">${ICONS.plus} New Vendor</button>`;

  const colors = ['purple','teal','blue','orange','green'];

  const emptyState = `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 6v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    <h3>No vendors yet</h3><p>${_vendorSearch ? 'No results found' : 'Add vendors to track purchases'}</p>
  </div>`;

  const cardGrid = `<div class="card-grid">
    ${filtered.map((v,i) => `
      <div class="item-card">
        <div class="item-card-header">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            <div class="item-card-avatar ${colors[i%colors.length]}">${esc(v.name?.charAt(0)||'?')}</div>
            <div style="min-width:0">
              <div class="item-card-title">${esc(v.name)}</div>
              <div class="item-card-sub">${esc(v.company_name || v.email || '—')}</div>
            </div>
          </div>
          <div class="item-card-actions">
            <button class="btn btn-ghost btn-icon btn-sm" title="View Details" onclick="openVendorView('${v.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick='openVendorForm(${JSON.stringify(v)})'>${ICONS.edit}</button>
            <button class="btn btn-danger btn-icon btn-sm" onclick="deleteVendor('${v.id}','${esc(v.name)}')">${ICONS.trash}</button>
          </div>
        </div>
        <hr class="item-card-divider"/>
        <div class="item-card-fields">
          <div class="item-card-field"><span class="item-card-field-label">Vendor ID</span><span class="item-card-field-val mono" style="color:var(--c-primary);font-weight:600">${esc(v.vendor_id||'—')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Phone</span><span class="item-card-field-val">${esc(v.phone||'—')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">GSTIN</span><span class="item-card-field-val mono">${esc(v.gstin||'—')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Status</span><span class="item-card-field-val">${_vendorStatusBadge(v.status)}</span></div>
        </div>
      </div>`).join('')}
  </div>`;

  el.innerHTML = `
    <!-- STATS -->
    <div class="inv-stats-grid" style="margin-bottom:20px">
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 6v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Total Vendors</span>
          <div class="inv-stat-row"><span class="inv-stat-value">${stats.total}</span><span class="inv-stat-sub">Registered</span></div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Active</span>
          <div class="inv-stat-row"><span class="inv-stat-value">${stats.active}</span><span class="inv-stat-sub">Vendors</span></div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Inactive</span>
          <div class="inv-stat-row"><span class="inv-stat-value">${stats.inactive}</span><span class="inv-stat-sub">Vendors</span></div>
        </div>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="filter-bar" style="margin-bottom:16px;flex-wrap:wrap;gap:8px">
      ${searchInput('Search by name, company, GST…', '_vendorSearchChange', _vendorSearch)}
      <div class="pill-tabs">
        <button class="pill-tab${_vendorStatusFilter==='all'?' active':''}" onclick="_vendorStatusFilter='all';_renderVendorTable(document.querySelector('.page-content'))">All (${_vendors.length})</button>
        <button class="pill-tab${_vendorStatusFilter==='active'?' active':''}" onclick="_vendorStatusFilter='active';_renderVendorTable(document.querySelector('.page-content'))">Active (${stats.active})</button>
        <button class="pill-tab${_vendorStatusFilter==='inactive'?' active':''}" onclick="_vendorStatusFilter='inactive';_renderVendorTable(document.querySelector('.page-content'))">Inactive (${stats.inactive})</button>
      </div>
      <div class="spacer"></div>
      ${_vendorViewToggleHTML()}
      <span style="font-size:13px;color:var(--c-text2)">${filtered.length} vendor${filtered.length!==1?'s':''}</span>
    </div>

    ${_vendorView === 'card'
      ? (filtered.length === 0 ? `<div class="card"><div class="card-body-p0">${emptyState}</div></div>` : cardGrid)
      : `<div class="card"><div class="card-body-p0"><div class="table-wrap">
          ${filtered.length === 0 ? emptyState :
          `<table>
            <thead><tr>
              <th>Vendor ID</th><th>Name</th><th>Company</th><th>Contact</th><th>Phone</th>
              <th>GSTIN</th><th>Bank</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${filtered.map(v => `<tr>
                <td><span class="mono" style="color:var(--c-primary);font-weight:700;font-size:12px">${esc(v.vendor_id||'—')}</span></td>
                <td><span style="font-weight:600">${esc(v.name)}</span></td>
                <td>${esc(v.company_name || '—')}</td>
                <td>${esc(v.contact_person || '—')}</td>
                <td>${esc(v.phone || '—')}</td>
                <td class="mono" style="font-size:12px">${esc(v.gstin || '—')}</td>
                <td class="mono" style="font-size:12px">${esc(v.bank_account ? '••••'+v.bank_account.slice(-4) : '—')}</td>
                <td>${_vendorStatusBadge(v.status)}</td>
                <td><div class="tbl-actions">
                  <button class="btn btn-ghost btn-icon btn-sm" title="View Details" onclick="openVendorView('${v.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button class="btn btn-ghost btn-icon btn-sm" onclick='openVendorForm(${JSON.stringify(v)})'>${ICONS.edit}</button>
                  <button class="btn btn-danger btn-icon btn-sm" onclick="deleteVendor('${v.id}','${esc(v.name)}')">${ICONS.trash}</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>`}
        </div></div></div>`}`;
}

function _vendorStatusBadge(status) {
  const s = status || 'active';
  const cfg = s === 'active'
    ? { bg: 'rgba(16,185,129,.12)', color: '#10b981', label: 'Active' }
    : { bg: 'rgba(239,68,68,.12)', color: '#ef4444', label: 'Inactive' };
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:${cfg.bg};color:${cfg.color}">
    <span style="width:5px;height:5px;border-radius:50%;background:${cfg.color};flex-shrink:0"></span>${cfg.label}
  </span>`;
}

function _vendorSearchChange(v) { _vendorSearch = v; _renderVendorTable(document.querySelector('.page-content')); }

// ── VENDOR VIEW (Profile Modal) ──────────────────────────────────────────────
async function openVendorView(vendorId) {
  let v = _vendors.find(x => x.id === vendorId);
  // If not in cache (called from Products/Expenses page before vendors were loaded), fetch directly
  if (!v) {
    try { v = await API.getVendor(vendorId); } catch(e) {}
  }
  if (!v) { toast('Vendor not found', 'error'); return; }

  const colors = ['purple','teal','blue','orange','green'];
  const colorIdx = Math.abs(v.name.charCodeAt(0)) % colors.length;

  openModal({
    size: 'xl',
    title: `Vendor Profile — ${v.name}`,
    hideSave: true,
    cancelLabel: 'Close',
    body: `<div id="vendor-profile-root"><div class="loading-page" style="padding:60px 0"><div class="spinner spin-dark"></div></div></div>`,
    onOpen: async () => {
      await _renderVendorProfile(vendorId, v, colorIdx);
    }
  });
}

async function _renderVendorProfile(vendorId, v, colorIdx) {
  const colors = ['purple','teal','blue','orange','green'];
  let vendorProducts = [], vendorExpenses = [], purchaseHistory = [], summary = null;
  try { vendorProducts = await API.getVendorProducts(vendorId); } catch(e) {}
  try { vendorExpenses = await API.getVendorExpenses(vendorId); } catch(e) {}
  try { purchaseHistory = await API.getVendorPurchaseHistory(vendorId); } catch(e) {}
  try { summary = await API.getVendorSummary(vendorId); } catch(e) {}

  const totalSpend = summary?.total_spend ?? vendorExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const productCount = summary?.product_count ?? vendorProducts.length;
  const txCount = summary?.transaction_count ?? (vendorExpenses.length + purchaseHistory.length);

  const root = document.getElementById('vendor-profile-root');
  if (!root) return;

  root.innerHTML = `
    <!-- VENDOR HEADER -->
    <div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--c-border)">
      <div class="item-card-avatar ${colors[colorIdx]}" style="width:64px;height:64px;font-size:26px;flex-shrink:0">${esc(v.name?.charAt(0)||'?')}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
          <h2 style="font-size:20px;font-weight:700;margin:0">${esc(v.name)}</h2>
          ${_vendorStatusBadge(v.status)}
        </div>
        <div style="color:var(--c-text2);font-size:13px;margin-bottom:8px">${esc(v.company_name || '')}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <span class="mono" style="font-size:12px;color:var(--c-primary);font-weight:600;background:rgba(99,102,241,.1);padding:3px 8px;border-radius:6px">${esc(v.vendor_id||'—')}</span>
          ${v.gstin ? `<span class="mono" style="font-size:12px;color:var(--c-text2)">GST: ${esc(v.gstin)}</span>` : ''}
          ${v.email ? `<span style="font-size:13px;color:var(--c-text2)">✉ ${esc(v.email)}</span>` : ''}
          ${v.phone ? `<span style="font-size:13px;color:var(--c-text2)">📞 ${esc(v.phone)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="_refreshVendorProfile('${vendorId}')" title="Refresh data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
        <button class="btn btn-secondary btn-sm" onclick="openVendorForm(${JSON.stringify(v).replace(/"/g,'&quot;')})">
          ${ICONS.edit} Edit
        </button>
      </div>
    </div>

    <!-- SUPPLY SUMMARY STATS -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
      <div style="background:var(--c-bg);border-radius:10px;padding:12px 14px;border:1px solid var(--c-border)">
        <div style="font-size:10px;color:var(--c-text2);font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Products Supplied</div>
        <div style="font-size:22px;font-weight:700;color:var(--c-primary)">${productCount}</div>
        <div style="font-size:11px;color:var(--c-text3);margin-top:2px">unique products</div>
      </div>
      <div style="background:var(--c-bg);border-radius:10px;padding:12px 14px;border:1px solid var(--c-border)">
        <div style="font-size:10px;color:var(--c-text2);font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Qty Supplied</div>
        <div style="font-size:22px;font-weight:700;color:#6366f1">${(summary?.total_qty_supplied ?? 0).toLocaleString('en-IN')}</div>
        <div style="font-size:11px;color:var(--c-text3);margin-top:2px">units invoiced</div>
      </div>
      <div style="background:var(--c-bg);border-radius:10px;padding:12px 14px;border:1px solid var(--c-border)">
        <div style="font-size:10px;color:var(--c-text2);font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Total Spend</div>
        <div style="font-size:22px;font-weight:700;color:#10b981">${fmt(totalSpend)}</div>
        <div style="font-size:11px;color:var(--c-text3);margin-top:2px">incl. expenses</div>
      </div>
      <div style="background:var(--c-bg);border-radius:10px;padding:12px 14px;border:1px solid var(--c-border)">
        <div style="font-size:10px;color:var(--c-text2);font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Transactions</div>
        <div style="font-size:22px;font-weight:700">${txCount}</div>
        <div style="font-size:11px;color:var(--c-text3);margin-top:2px">all time</div>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs" id="vendor-profile-tabs" style="margin-bottom:16px">
      <button class="tab-btn active" onclick="_vendorProfileTab('overview',this)">Overview</button>
      <button class="tab-btn" onclick="_vendorProfileTab('products',this)">Products Supplied (${productCount})</button>
      <button class="tab-btn" onclick="_vendorProfileTab('history',this)">Purchase History (${purchaseHistory.length})</button>
      <button class="tab-btn" onclick="_vendorProfileTab('expenses',this)">Expenses (${vendorExpenses.length})</button>
      <button class="tab-btn" onclick="_vendorProfileTab('documents',this)">Documents</button>
    </div>

    <!-- TAB: OVERVIEW -->
    <div id="vendor-tab-overview">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <h4 style="font-size:11px;font-weight:700;color:var(--c-text2);text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px">Contact Information</h4>
          <div style="display:flex;flex-direction:column;gap:9px">
            ${_vpRow('Vendor ID', v.vendor_id, true)}
            ${_vpRow('Vendor Name', v.name)}
            ${_vpRow('Company Name', v.company_name)}
            ${_vpRow('Contact Person', v.contact_person)}
            ${_vpRow('Phone', v.phone)}
            ${_vpRow('Email', v.email)}
            ${_vpRow('GSTIN', v.gstin, true)}
          </div>
          ${(v.street || v.city || v.state || v.address) ? `
            <h4 style="font-size:11px;font-weight:700;color:var(--c-text2);text-transform:uppercase;letter-spacing:.06em;margin:18px 0 8px">Address</h4>
            <div style="font-size:13px;background:var(--c-bg);border-radius:8px;padding:12px;line-height:1.8;color:var(--c-text)">
              ${v.street ? `<div>${esc(v.street)}</div>` : ''}
              ${(v.city || v.state || v.pincode) ? `<div>${[v.city,v.state,v.pincode].filter(Boolean).map(esc).join(', ')}</div>` : ''}
              ${v.country ? `<div style="color:var(--c-text2)">${esc(v.country)}</div>` : ''}
              ${(!v.street && !v.city && v.address) ? esc(v.address) : ''}
            </div>` : ''}
        </div>
        <div>
          <h4 style="font-size:11px;font-weight:700;color:var(--c-text2);text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px">Bank Details</h4>
          ${(v.bank_account || v.ifsc || v.bank_name)
            ? `<div style="background:var(--c-bg);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:9px">
                ${_vpRow('Bank Name', v.bank_name)}
                ${_vpRow('Branch', v.bank_branch)}
                ${_vpRow('Account No.', v.bank_account, true)}
                ${_vpRow('IFSC Code', v.ifsc, true)}
              </div>`
            : `<p style="font-size:13px;color:var(--c-text2);font-style:italic">No bank details added</p>`}
          ${v.notes ? `
            <h4 style="font-size:11px;font-weight:700;color:var(--c-text2);text-transform:uppercase;letter-spacing:.06em;margin:18px 0 8px">Notes</h4>
            <p style="font-size:13px;color:var(--c-text2);background:var(--c-bg);border-radius:8px;padding:10px 12px;margin:0;white-space:pre-wrap;line-height:1.6">${esc(v.notes)}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- TAB: PRODUCTS SUPPLIED -->
    <div id="vendor-tab-products" style="display:none">
      ${_renderVendorProductsTab(vendorProducts, vendorId)}
    </div>

    <!-- TAB: PURCHASE HISTORY (from invoices) -->
    <div id="vendor-tab-history" style="display:none">
      ${_renderVendorPurchaseHistoryTab(purchaseHistory, vendorId)}
    </div>

    <!-- TAB: EXPENSES -->
    <div id="vendor-tab-expenses" style="display:none">
      ${_renderVendorExpensesTab(vendorExpenses, totalSpend)}
    </div>

    <!-- TAB: DOCUMENTS -->
    <div id="vendor-tab-documents" style="display:none">
      <div id="vendor-docs-root">
        <div class="loading-page" style="padding:30px 0"><div class="spinner spin-dark"></div></div>
      </div>
    </div>
  `;

  // Store data on window for search filtering
  window._vpProducts = vendorProducts;
  window._vpHistory = purchaseHistory;
  window._vpExpenses = vendorExpenses;
  window._vpVendorId = vendorId;

  _loadVendorDocs(vendorId);
}

function _renderVendorProductsTab(products, vendorId) {
  if (!products.length) {
    return `<div class="empty-state" style="padding:48px 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="40" height="40"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      <h3>No products linked</h3>
      <p>Set this vendor as supplier when creating or editing products</p>
    </div>`;
  }

  const totalProducts = products.length;
  const totalStock = products.reduce((s, p) => s + (parseFloat(p.stock_qty) || 0), 0);
  const totalValue = products.reduce((s, p) => s + ((parseFloat(p.supply_price) || parseFloat(p.purchase_price) || 0) * (parseFloat(p.stock_qty) || 0)), 0);

  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <div style="position:relative;flex:1;min-width:200px;max-width:320px">
        <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--c-text3)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="form-input" id="vp-prod-search" placeholder="Search products…" style="padding-left:32px;height:34px;font-size:13px"
          oninput="_vpFilterProducts(this.value)">
      </div>
      <select class="form-input" id="vp-prod-cat" style="width:auto;height:34px;font-size:13px" onchange="_vpFilterProducts(document.getElementById('vp-prod-search').value)">
        <option value="">All Categories</option>
        ${[...new Set(products.map(p => p.category).filter(Boolean))].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
      </select>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <span style="font-size:12px;color:var(--c-text2)">${totalProducts} products · Stock value: <strong>${fmt(totalValue)}</strong></span>
        <button class="btn btn-ghost btn-sm" onclick="_exportVendorProducts()" style="font-size:12px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>
    </div>
    <div id="vp-products-table-wrap">
      ${_vpProductsTableHTML(products)}
    </div>`;
}

function _vpProductsTableHTML(products) {
  if (!products.length) return `<div style="text-align:center;padding:40px;color:var(--c-text3);font-size:13px">No products match your search</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>SKU / Code</th><th>Product Name</th><th>Category</th>
      <th>Supply Price</th><th>Selling Price</th>
      <th style="text-align:right">Stock</th><th>Status</th><th>Primary</th>
    </tr></thead>
    <tbody>
      ${products.map(p => `<tr>
        <td class="mono" style="font-size:12px;color:var(--c-primary);font-weight:600">${esc(p.sku||'—')}</td>
        <td>
          <div style="font-weight:600;font-size:13px">${esc(p.name)}</div>
          ${p.brand ? `<div style="font-size:11px;color:var(--c-text3)">${esc(p.brand)}</div>` : ''}
        </td>
        <td style="text-transform:capitalize;color:var(--c-text2);font-size:12px">${esc(p.category||'—')}</td>
        <td style="font-weight:600;color:#10b981">${p.supply_price > 0 ? fmt(p.supply_price) : (p.purchase_price > 0 ? fmt(p.purchase_price) : '—')}</td>
        <td style="font-weight:500">${p.unit_price > 0 ? fmt(p.unit_price) : '—'}</td>
        <td style="text-align:right">
          <span style="font-weight:600;color:${(p.stock_qty||0) <= (p.low_stock_alert||0) && (p.stock_qty||0) > 0 ? '#f59e0b' : (p.stock_qty||0) === 0 ? '#ef4444' : 'inherit'}">${(p.stock_qty??0).toLocaleString('en-IN')}</span>
          ${p.unit ? `<span style="font-size:11px;color:var(--c-text3);margin-left:3px">${esc(p.unit)}</span>` : ''}
          ${(p.stock_qty||0) === 0 ? `<span style="font-size:10px;background:rgba(239,68,68,.1);color:#ef4444;border-radius:4px;padding:1px 5px;margin-left:4px">OUT</span>` :
            (p.stock_qty||0) <= (p.low_stock_alert||0) ? `<span style="font-size:10px;background:rgba(245,158,11,.1);color:#f59e0b;border-radius:4px;padding:1px 5px;margin-left:4px">LOW</span>` : ''}
        </td>
        <td><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${p.is_active?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)'};color:${p.is_active?'#10b981':'#ef4444'}">${p.is_active?'Active':'Inactive'}</span></td>
        <td style="text-align:center">${p.is_primary ? '<span style="font-size:16px" title="Primary vendor">⭐</span>' : '<span style="color:var(--c-text3);font-size:12px">—</span>'}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function _vpFilterProducts(q) {
  const cat = document.getElementById('vp-prod-cat')?.value || '';
  const products = (window._vpProducts || []).filter(p => {
    const matchQ = !q || p.name?.toLowerCase().includes(q.toLowerCase()) || p.sku?.toLowerCase().includes(q.toLowerCase()) || p.brand?.toLowerCase().includes(q.toLowerCase());
    const matchCat = !cat || p.category === cat;
    return matchQ && matchCat;
  });
  const wrap = document.getElementById('vp-products-table-wrap');
  if (wrap) wrap.innerHTML = _vpProductsTableHTML(products);
}

function _renderVendorPurchaseHistoryTab(history, vendorId) {
  if (!history.length) {
    return `<div class="empty-state" style="padding:48px 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="40" height="40"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      <h3>No purchase history</h3>
      <p>Invoice items linked to this vendor will appear here automatically</p>
    </div>`;
  }

  const totalQty = history.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
  const totalAmt = history.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <div style="position:relative;flex:1;min-width:200px;max-width:320px">
        <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--c-text3)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="form-input" id="vp-hist-search" placeholder="Search by product, invoice…" style="padding-left:32px;height:34px;font-size:13px"
          oninput="_vpFilterHistory(this.value)">
      </div>
      <select class="form-input" id="vp-hist-status" style="width:auto;height:34px;font-size:13px" onchange="_vpFilterHistory(document.getElementById('vp-hist-search').value)">
        <option value="">All Statuses</option>
        ${[...new Set(history.map(r => r.invoice_status).filter(Boolean))].map(s => `<option value="${esc(s)}">${esc(s.charAt(0).toUpperCase()+s.slice(1))}</option>`).join('')}
      </select>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <span style="font-size:12px;color:var(--c-text2)">${history.length} rows · Total: <strong>${fmt(totalAmt)}</strong></span>
        <button class="btn btn-ghost btn-sm" onclick="_exportVendorPurchaseHistory()" style="font-size:12px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>
    </div>
    <div id="vp-history-table-wrap">
      ${_vpHistoryTableHTML(history)}
    </div>
    <div style="padding:12px 16px;background:var(--c-bg);border-top:1px solid var(--c-border);display:flex;justify-content:flex-end;gap:24px;border-radius:0 0 8px 8px;margin-top:1px">
      <span style="font-size:13px;color:var(--c-text2)">Total Qty: <strong>${totalQty.toLocaleString('en-IN')}</strong></span>
      <span style="font-size:13px;color:var(--c-text2)">Total Amount: <strong style="color:var(--c-danger)">${fmt(totalAmt)}</strong></span>
    </div>`;
}

function _vpHistoryTableHTML(rows) {
  if (!rows.length) return `<div style="text-align:center;padding:40px;color:var(--c-text3);font-size:13px">No records match your search</div>`;

  const statusColor = s => ({ draft:'#9ca3af', sent:'#3b82f6', paid:'#10b981', overdue:'#ef4444', cancelled:'#9ca3af' }[s] || '#9ca3af');

  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>Date</th><th>Invoice No.</th><th>Product / Description</th><th>SKU</th>
      <th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th>
      <th style="text-align:right">Total</th><th>Status</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `<tr>
        <td style="white-space:nowrap;color:var(--c-text2);font-size:12px">${new Date(r.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
        <td class="mono" style="font-size:12px;font-weight:600;color:var(--c-primary)">${esc(r.invoice_number||'—')}</td>
        <td>
          <div style="font-weight:500;font-size:13px">${esc(r.product_name || r.description)}</div>
          ${r.product_name && r.description !== r.product_name ? `<div style="font-size:11px;color:var(--c-text3)">${esc(r.description)}</div>` : ''}
          ${r.customer_name ? `<div style="font-size:11px;color:var(--c-text3)">Customer: ${esc(r.customer_name)}</div>` : ''}
        </td>
        <td class="mono" style="font-size:12px;color:var(--c-text2)">${esc(r.sku||'—')}</td>
        <td style="text-align:right;font-weight:600">${(parseFloat(r.quantity)||0).toLocaleString('en-IN')}</td>
        <td style="text-align:right;color:var(--c-text2)">${fmt(r.unit_price)}</td>
        <td style="text-align:right;font-weight:700;color:var(--c-danger)">${fmt(r.amount)}</td>
        <td><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${statusColor(r.invoice_status)}22;color:${statusColor(r.invoice_status)};text-transform:capitalize">${esc(r.invoice_status||'—')}</span></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function _vpFilterHistory(q) {
  const status = document.getElementById('vp-hist-status')?.value || '';
  const rows = (window._vpHistory || []).filter(r => {
    const matchQ = !q ||
      r.product_name?.toLowerCase().includes(q.toLowerCase()) ||
      r.description?.toLowerCase().includes(q.toLowerCase()) ||
      r.invoice_number?.toLowerCase().includes(q.toLowerCase()) ||
      r.sku?.toLowerCase().includes(q.toLowerCase());
    const matchStatus = !status || r.invoice_status === status;
    return matchQ && matchStatus;
  });
  const wrap = document.getElementById('vp-history-table-wrap');
  if (wrap) wrap.innerHTML = _vpHistoryTableHTML(rows);
}

function _renderVendorExpensesTab(expenses, totalSpend) {
  if (!expenses.length) {
    return `<div class="empty-state" style="padding:48px 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="40" height="40"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      <h3>No expenses recorded</h3>
      <p>Expenses linked to this vendor will appear here</p>
    </div>`;
  }

  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <div style="position:relative;flex:1;min-width:200px;max-width:320px">
        <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--c-text3)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="form-input" id="vp-exp-search" placeholder="Search expenses…" style="padding-left:32px;height:34px;font-size:13px"
          oninput="_vpFilterExpenses(this.value)">
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <span style="font-size:12px;color:var(--c-text2)">${expenses.length} expenses · Total: <strong>${fmt(totalSpend)}</strong></span>
        <button class="btn btn-ghost btn-sm" onclick="_exportVendorExpenses()" style="font-size:12px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>
    </div>
    <div id="vp-expenses-table-wrap">
      ${_vpExpensesTableHTML(expenses)}
    </div>
    <div style="padding:12px 16px;background:var(--c-bg);border-top:1px solid var(--c-border);display:flex;justify-content:flex-end;gap:8px;border-radius:0 0 8px 8px;margin-top:1px">
      <span style="font-size:14px;font-weight:700">Total Spent: ${fmt(totalSpend)}</span>
    </div>`;
}

function _vpExpensesTableHTML(expenses) {
  if (!expenses.length) return `<div style="text-align:center;padding:40px;color:var(--c-text3);font-size:13px">No expenses match</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Reference</th><th>GST</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${[...expenses].sort((a,b) => new Date(b.date)-new Date(a.date)).map(e => `<tr>
        <td style="white-space:nowrap;color:var(--c-text2);font-size:12px">${new Date(e.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
        <td style="font-weight:500">${esc(e.description)}</td>
        <td style="text-transform:capitalize;color:var(--c-text2);font-size:12px">${esc(e.category||'other')}</td>
        <td class="mono" style="font-size:12px;color:var(--c-text2)">${esc(e.reference||'—')}</td>
        <td style="font-size:12px;color:var(--c-text2)">${e.gst_rate ? e.gst_rate+'%' : '—'}</td>
        <td style="text-align:right;font-weight:700;color:var(--c-danger)">${fmt(e.amount, e.currency)}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function _vpFilterExpenses(q) {
  const exps = (window._vpExpenses || []).filter(e =>
    !q ||
    e.description?.toLowerCase().includes(q.toLowerCase()) ||
    e.category?.toLowerCase().includes(q.toLowerCase()) ||
    e.reference?.toLowerCase().includes(q.toLowerCase())
  );
  const wrap = document.getElementById('vp-expenses-table-wrap');
  if (wrap) wrap.innerHTML = _vpExpensesTableHTML(exps);
}

// Refresh vendor profile without closing modal
async function _refreshVendorProfile(vendorId) {
  const btn = event?.target?.closest('button');
  if (btn) { btn.disabled = true; btn.textContent = 'Refreshing…'; }
  // Re-fetch vendors list too for accurate data
  try { _vendors = await API.getVendors(); } catch(e) {}
  const v = _vendors.find(x => x.id === vendorId);
  if (!v) { if (btn) { btn.disabled = false; } return; }
  const colors = ['purple','teal','blue','orange','green'];
  const colorIdx = Math.abs(v.name.charCodeAt(0)) % colors.length;

  const root = document.getElementById('vendor-profile-root');
  if (root) root.innerHTML = `<div class="loading-page" style="padding:60px 0"><div class="spinner spin-dark"></div></div>`;
  await _renderVendorProfile(vendorId, v, colorIdx);
  toast('Vendor data refreshed');
}

// Export helpers
function _exportVendorProducts() {
  const products = window._vpProducts || [];
  if (!products.length) return toast('No products to export', 'error');
  const rows = [['SKU','Product Name','Category','Supply Price','Selling Price','Stock Qty','Unit','Status','Primary Vendor']];
  products.forEach(p => rows.push([
    p.sku||'', p.name||'', p.category||'',
    p.supply_price||p.purchase_price||'', p.unit_price||'',
    p.stock_qty||0, p.unit||'',
    p.is_active ? 'Active' : 'Inactive',
    p.is_primary ? 'Yes' : 'No'
  ]));
  _downloadCSV(rows, 'vendor-products.csv');
}

function _exportVendorPurchaseHistory() {
  const rows = window._vpHistory || [];
  if (!rows.length) return toast('No history to export', 'error');
  const csv = [['Date','Invoice No.','Product','SKU','Description','Qty','Unit Price','Total Amount','Invoice Status','Customer']];
  rows.forEach(r => csv.push([
    r.date, r.invoice_number||'', r.product_name||'', r.sku||'', r.description||'',
    r.quantity||0, r.unit_price||0, r.amount||0, r.invoice_status||'', r.customer_name||''
  ]));
  _downloadCSV(csv, 'vendor-purchase-history.csv');
}

function _exportVendorExpenses() {
  const exps = window._vpExpenses || [];
  if (!exps.length) return toast('No expenses to export', 'error');
  const csv = [['Date','Description','Category','Reference','GST Rate','Amount','Currency']];
  exps.forEach(e => csv.push([e.date, e.description||'', e.category||'', e.reference||'', e.gst_rate||0, e.amount||0, e.currency||'INR']));
  _downloadCSV(csv, 'vendor-expenses.csv');
}

function _downloadCSV(rows, filename) {
  const content = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${filename}`);
}

async function _loadVendorDocs(vendorId) {
  const root = document.getElementById('vendor-docs-root');
  if (!root) return;
  let docs = [];
  try { docs = await API.getVendorDocs(vendorId); } catch(e) {}
  _renderVendorDocs(vendorId, docs);
}

function _renderVendorDocs(vendorId, docs) {
  const root = document.getElementById('vendor-docs-root');
  if (!root) return;
  const DOC_TYPES = ['invoice','agreement','contract','certificate','other'];
  const DOC_ICONS = { invoice:'🧾', agreement:'📄', contract:'📋', certificate:'🏆', other:'📎' };
  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <span style="font-size:13px;color:var(--c-text2)">${docs.length} document${docs.length!==1?'s':''} uploaded</span>
      <button class="btn btn-primary btn-sm" onclick="_openVendorDocUpload('${vendorId}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Upload Document
      </button>
    </div>
    ${docs.length === 0
      ? `<div class="empty-state" style="padding:40px 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="40" height="40"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <h3>No documents yet</h3>
          <p>Upload invoices, agreements, certificates and more</p>
        </div>`
      : `<div style="display:flex;flex-direction:column;gap:8px">
          ${docs.map(d => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--c-bg);border:1px solid var(--c-border);border-radius:10px">
              <span style="font-size:22px;flex-shrink:0">${DOC_ICONS[d.doc_type]||'📎'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:13px">${esc(d.name)}</div>
                <div style="font-size:11px;color:var(--c-text2);margin-top:2px">
                  <span style="text-transform:capitalize;background:var(--c-surface2);padding:1px 6px;border-radius:4px;margin-right:6px">${esc(d.doc_type||'other')}</span>
                  ${d.file_name ? esc(d.file_name)+' · ' : ''}
                  ${d.file_size ? _fmtFileSize(d.file_size)+' · ' : ''}
                  ${new Date(d.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                </div>
                ${d.notes ? `<div style="font-size:12px;color:var(--c-text2);margin-top:3px">${esc(d.notes)}</div>` : ''}
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                <a href="/api/vendors/${vendorId}/documents/${d.id}/download" target="_blank" class="btn btn-ghost btn-icon btn-sm" title="Download">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </a>
                <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="_deleteVendorDoc('${vendorId}','${d.id}','${esc(d.name)}')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </div>`).join('')}
        </div>`}
  `;
}

function _fmtFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

function _openVendorDocUpload(vendorId) {
  const DOC_TYPES = ['invoice','agreement','contract','certificate','other'];
  openModal({
    size: 'sm',
    title: 'Upload Vendor Document',
    body: `
      <div class="form-group"><label class="form-label req">Document Name</label>
        <input class="form-input" id="vdoc-name" placeholder="e.g. GST Certificate, Supply Agreement">
      </div>
      <div class="form-group"><label class="form-label">Document Type</label>
        <select class="form-input" id="vdoc-type">
          ${DOC_TYPES.map(t => `<option value="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label req">File</label>
        <input type="file" class="form-input" id="vdoc-file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls">
        <div style="font-size:11px;color:var(--c-text2);margin-top:4px">PDF, images, Word and Excel files supported</div>
      </div>
      <div class="form-group"><label class="form-label">Notes</label>
        <input class="form-input" id="vdoc-notes" placeholder="Optional notes about this document">
      </div>`,
    onSave: async () => {
      const name = document.getElementById('vdoc-name').value.trim();
      const fileInput = document.getElementById('vdoc-file');
      if (!name) { toast('Document name is required', 'error'); return false; }
      if (!fileInput.files[0]) { toast('Please select a file', 'error'); return false; }
      const file = fileInput.files[0];
      if (file.size > 5 * 1024 * 1024) { toast('File must be under 5MB', 'error'); return false; }
      // Read file as base64
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await API.uploadVendorDoc(vendorId, {
        name,
        doc_type: document.getElementById('vdoc-type').value,
        file_data: b64,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        notes: document.getElementById('vdoc-notes').value.trim(),
      });
      toast('Document uploaded');
      const docs = await API.getVendorDocs(vendorId);
      _renderVendorDocs(vendorId, docs);
    }
  });
}

async function _deleteVendorDoc(vendorId, docId, name) {
  confirmDel(`Delete document "${name}"?`, async () => {
    try {
      await API.deleteVendorDoc(vendorId, docId);
      toast('Document deleted');
      const docs = await API.getVendorDocs(vendorId);
      _renderVendorDocs(vendorId, docs);
    } catch(e) { toast(e.message, 'error'); }
  });
}

function _vpRow(label, value, mono = false) {
  if (!value) return '';
  return `<div style="display:flex;gap:12px">
    <span style="font-size:12px;color:var(--c-text2);min-width:120px;flex-shrink:0">${label}</span>
    <span style="font-size:13px;font-weight:500${mono ? ';font-family:monospace' : ''}">${esc(value)}</span>
  </div>`;
}

function _vendorProfileTab(tab, btn) {
  document.querySelectorAll('#vendor-profile-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['overview','products','history','expenses','documents'].forEach(t => {
    const el = document.getElementById(`vendor-tab-${t}`);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}

// ── VENDOR FORM (Create/Edit) ────────────────────────────────────────────────
function openVendorForm(v = null) {
  openModal({
    size: 'lg',
    title: v ? `Edit Vendor — ${v.name}` : 'New Vendor',
    body: `
      <div style="margin-bottom:16px">
        <div class="tabs" id="vf-tabs" style="margin-bottom:16px">
          <button class="tab-btn active" onclick="_vfTab('basic', this)">Basic Info</button>
          <button class="tab-btn" onclick="_vfTab('address', this)">Address</button>
          <button class="tab-btn" onclick="_vfTab('bank', this)">Bank Details</button>
        </div>

        <!-- BASIC INFO -->
        <div id="vf-section-basic">
          <div class="form-row cols-2">
            <div class="form-group"><label class="form-label req">Vendor Name</label><input class="form-input" id="vf-name" value="${esc(v?.name||'')}" placeholder="Supplier / Vendor name"></div>
            <div class="form-group"><label class="form-label">Company Name</label><input class="form-input" id="vf-company" value="${esc(v?.company_name||'')}" placeholder="Company / Business name"></div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group"><label class="form-label">Contact Person</label><input class="form-input" id="vf-contact" value="${esc(v?.contact_person||'')}" placeholder="Primary contact name"></div>
            <div class="form-group"><label class="form-label">Phone Number</label><input class="form-input" id="vf-phone" value="${esc(v?.phone||'')}" placeholder="+91 98765 43210"></div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group"><label class="form-label">Email Address</label><input class="form-input" id="vf-email" type="email" value="${esc(v?.email||'')}" placeholder="vendor@company.com"></div>
            <div class="form-group"><label class="form-label">GST Number (GSTIN)</label><input class="form-input" id="vf-gstin" value="${esc(v?.gstin||'')}" style="text-transform:uppercase" placeholder="22AAAAA0000A1Z5" maxlength="15"></div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group"><label class="form-label">Status</label>
              <select class="form-input" id="vf-status">
                <option value="active"${(v?.status||'active')==='active'?' selected':''}>Active</option>
                <option value="inactive"${v?.status==='inactive'?' selected':''}>Inactive</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">Notes</label><input class="form-input" id="vf-notes" value="${esc(v?.notes||'')}" placeholder="Additional notes"></div>
          </div>
        </div>

        <!-- ADDRESS -->
        <div id="vf-section-address" style="display:none">
          <div class="form-group"><label class="form-label">Street Address</label><textarea class="form-input" id="vf-street" rows="2" placeholder="Door No, Street Name, Area">${esc(v?.street||'')}</textarea></div>
          <div class="form-row cols-2">
            <div class="form-group"><label class="form-label">City</label><input class="form-input" id="vf-city" value="${esc(v?.city||'')}" placeholder="City"></div>
            <div class="form-group"><label class="form-label">State</label><input class="form-input" id="vf-state" value="${esc(v?.state||'')}" placeholder="State"></div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group"><label class="form-label">Pincode</label><input class="form-input" id="vf-pincode" value="${esc(v?.pincode||'')}" placeholder="600001" maxlength="6"></div>
            <div class="form-group"><label class="form-label">Country</label><input class="form-input" id="vf-country" value="${esc(v?.country||'India')}" placeholder="India"></div>
          </div>
        </div>

        <!-- BANK -->
        <div id="vf-section-bank" style="display:none">
          <div class="form-row cols-2">
            <div class="form-group"><label class="form-label">Account Number</label><input class="form-input" id="vf-bank" value="${esc(v?.bank_account||'')}" style="font-family:monospace" placeholder="Account number"></div>
            <div class="form-group"><label class="form-label">IFSC Code</label><input class="form-input" id="vf-ifsc" value="${esc(v?.ifsc||'')}" style="text-transform:uppercase;font-family:monospace" placeholder="SBIN0001234"></div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group"><label class="form-label">Bank Name</label><input class="form-input" id="vf-bank-name" value="${esc(v?.bank_name||'')}" placeholder="State Bank of India"></div>
            <div class="form-group"><label class="form-label">Branch</label><input class="form-input" id="vf-branch" value="${esc(v?.bank_branch||'')}" placeholder="Branch name"></div>
          </div>
        </div>
      </div>`,
    onSave: async () => {
      const name = document.getElementById('vf-name').value.trim();
      if (!name) { toast('Vendor name is required', 'error'); return false; }

      // Build address string from parts
      const street = document.getElementById('vf-street').value.trim();
      const city = document.getElementById('vf-city').value.trim();
      const state = document.getElementById('vf-state').value.trim();
      const pincode = document.getElementById('vf-pincode').value.trim();
      const country = document.getElementById('vf-country').value.trim();
      const addressParts = [street, city, state, pincode, country].filter(Boolean);
      const address = addressParts.join(', ');

      const data = {
        name,
        company_name: document.getElementById('vf-company').value.trim(),
        contact_person: document.getElementById('vf-contact').value.trim(),
        email: document.getElementById('vf-email').value.trim(),
        phone: document.getElementById('vf-phone').value.trim(),
        gstin: document.getElementById('vf-gstin').value.trim().toUpperCase(),
        address,
        street,
        city,
        state,
        pincode,
        country,
        bank_account: document.getElementById('vf-bank').value.trim(),
        ifsc: document.getElementById('vf-ifsc').value.trim().toUpperCase(),
        bank_name: document.getElementById('vf-bank-name').value.trim(),
        bank_branch: document.getElementById('vf-branch').value.trim(),
        status: document.getElementById('vf-status').value,
        notes: document.getElementById('vf-notes').value.trim(),
      };
      if (v) await API.updateVendor(v.id, data);
      else await API.createVendor(data);
      toast(v ? 'Vendor updated' : 'Vendor added');
      _vendors = await API.getVendors();
      _renderVendorTable(document.querySelector('.page-content'));
    }
  });
}

function _vfTab(tab, btn) {
  document.querySelectorAll('#vf-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['basic','address','bank'].forEach(t => {
    const el = document.getElementById(`vf-section-${t}`);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}

async function deleteVendor(id, name) {
  confirmDel(`Delete vendor "${name}"?`, async () => {
    try {
      await API.deleteVendor(id);
      toast('Vendor deleted');
      _vendors = await API.getVendors();
      _renderVendorTable(document.querySelector('.page-content'));
    } catch(e) { toast(e.message, 'error'); }
  });
}
