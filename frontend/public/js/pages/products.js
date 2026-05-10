// js/pages/products.js
let _products = [], _prodSearch = '', _prodCategoryFilter = 'all', _prodStatusFilter = 'all', _prodView = 'table';
let _allVendors = [];

const PRODUCT_CATEGORIES = [
  'general','electronics','clothing','food','medicine','furniture',
  'stationery','software','hardware','services','spare parts','other'
];

const PRODUCT_UNITS = ['pcs','kg','g','litre','ml','metre','cm','box','pack','pair','set','dozen','unit'];

const WARRANTY_TYPES = [
  { value: 'none',         label: 'No Warranty' },
  { value: 'manufacturer', label: 'Manufacturer Warranty' },
  { value: 'seller',       label: 'Seller Warranty' },
  { value: 'extended',     label: 'Extended Warranty' },
];

const GUARANTEE_TYPES = [
  { value: 'none',         label: 'No Guarantee' },
  { value: 'money_back',   label: 'Money-Back Guarantee' },
  { value: 'satisfaction', label: 'Satisfaction Guarantee' },
  { value: 'performance',  label: 'Performance Guarantee' },
];

// ── SKU AUTO-GENERATION ───────────────────────
async function generateSKU(brand) {
  const b = (brand || 'PROD').toUpperCase().trim().replace(/[^A-Z0-9]/g, '') || 'PROD';
  try {
    const d = await API.get(`/api/products/sku/generate?brand=${encodeURIComponent(b)}`);
    if (d.sku) return d.sku;
  } catch(e) {}
  // fallback: local generation
  const prefix = `SKU-${b}-`;
  const existing = _products.filter(p => p.sku && p.sku.startsWith(prefix));
  let max = 0;
  existing.forEach(p => {
    const parts = (p.sku || '').split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num) && num > max) max = num;
  });
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

// ── QR CODE GENERATION ────────────────────────
function renderQRCode(containerId, text, size = 120) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(el, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
  } else {
    el.innerHTML = `<div style="font-size:10px;color:#999;text-align:center;padding:8px">QR lib not loaded</div>`;
  }
}

function renderBarcode(svgId, text) {
  const el = document.getElementById(svgId);
  if (!el) return;
  if (typeof JsBarcode !== 'undefined') {
    try {
      JsBarcode(el, text, { format: 'CODE128', width: 1.6, height: 50, displayValue: true, fontSize: 11, margin: 4 });
    } catch(e) {
      el.parentElement.innerHTML = `<div style="font-size:10px;color:#999;padding:4px">Barcode error: ${e.message}</div>`;
    }
  } else {
    el.parentElement.innerHTML = `<div style="font-size:10px;color:#999;padding:4px">Barcode lib not loaded</div>`;
  }
}

function downloadQR(containerId, filename) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const img = el.querySelector('img') || el.querySelector('canvas');
  if (!img) return;
  const a = document.createElement('a');
  if (img.tagName === 'CANVAS') {
    a.href = img.toDataURL('image/png');
  } else {
    a.href = img.src;
  }
  a.download = filename + '-qr.png';
  a.click();
}

function downloadBarcode(svgId, filename) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename + '-barcode.svg';
  a.click();
}


async function renderProducts(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  [_products, _allVendors] = await Promise.all([API.getProducts(), API.getVendors()]);
  _renderProductsPage(el);
}

function _prodStats() {
  const total = _products.length;
  const active = _products.filter(p => p.is_active).length;
  const lowStock = _products.filter(p => p.is_active && p.stock_qty <= p.low_stock_alert && p.stock_qty > 0).length;
  const outOfStock = _products.filter(p => p.is_active && p.stock_qty <= 0).length;
  const totalValue = _products.reduce((s, p) => s + (p.stock_qty * p.unit_price), 0);
  return { total, active, lowStock, outOfStock, totalValue };
}

function _renderProductsPage(el) {
  document.getElementById('topbar-actions').innerHTML =
    `<div style="display:flex;align-items:center;gap:8px">
      <button class="btn btn-secondary" onclick="openProductScanner()" style="display:flex;align-items:center;gap:6px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
        Scan Product
      </button>
      <button class="btn btn-secondary" onclick="openProductForm()" style="display:flex;align-items:center;gap:6px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Product
      </button>
      <button class="btn btn-primary" onclick="openBulkUpload()" style="display:flex;align-items:center;gap:6px">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Bulk Upload
      </button>
    </div>`;

  const stats = _prodStats();

  const categories = ['all', ...new Set(_products.map(p => p.category).filter(Boolean))];

  let filtered = _products.filter(p => {
    const matchCat = _prodCategoryFilter === 'all' || p.category === _prodCategoryFilter;
    const matchStatus = _prodStatusFilter === 'all'
      || (_prodStatusFilter === 'active' && p.is_active)
      || (_prodStatusFilter === 'inactive' && !p.is_active)
      || (_prodStatusFilter === 'low_stock' && p.is_active && p.stock_qty <= p.low_stock_alert && p.stock_qty > 0)
      || (_prodStatusFilter === 'out_of_stock' && p.stock_qty <= 0);
    const matchSearch = !_prodSearch
      || p.name?.toLowerCase().includes(_prodSearch.toLowerCase())
      || p.sku?.toLowerCase().includes(_prodSearch.toLowerCase())
      || p.hsn_code?.toLowerCase().includes(_prodSearch.toLowerCase())
      || p.brand?.toLowerCase().includes(_prodSearch.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  el.innerHTML = `
    <!-- STATS -->
    <div class="inv-stats-grid" style="margin-bottom:20px">
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Total Products</span>
          <div class="inv-stat-row"><span class="inv-stat-value">${stats.total}</span><span class="inv-stat-sub">${stats.active} Active</span></div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Inventory Value</span>
          <div class="inv-stat-row"><span class="inv-stat-value">${fmt(stats.totalValue)}</span><span class="inv-stat-sub">Selling Price</span></div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Low Stock</span>
          <div class="inv-stat-row"><span class="inv-stat-value">${stats.lowStock}</span><span class="inv-stat-sub">Need Reorder</span></div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Out of Stock</span>
          <div class="inv-stat-row"><span class="inv-stat-value">${stats.outOfStock}</span><span class="inv-stat-sub">Items</span></div>
        </div>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="inv-filter-bar" style="margin-bottom:16px">
      <div class="inv-filter-left" style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
        <div class="inv-search-wrap" style="flex:1;max-width:320px">
          <svg class="inv-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="inv-search-input" type="text" placeholder="Search name, SKU, HSN, brand…"
            value="${esc(_prodSearch)}" oninput="_prodSearchChange(this.value)">
        </div>
        <select class="form-input" style="width:auto;min-width:130px;padding:7px 12px;font-size:13px;flex-shrink:0"
          onchange="_prodCategoryFilter=this.value;_renderProductsPage(document.querySelector('.page-content'))">
          ${categories.map(c => `<option value="${c}"${_prodCategoryFilter===c?' selected':''}>${c==='all'?'All Categories':c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="inv-filter-right" style="display:flex;align-items:center;gap:10px">
        <div class="pill-tabs">
          ${[['all','All'],['active','Active'],['inactive','Inactive'],['low_stock','Low Stock'],['out_of_stock','Out of Stock']].map(([v,l]) =>
            `<button class="pill-tab${_prodStatusFilter===v?' active':''}" onclick="_prodStatusFilter='${v}';_renderProductsPage(document.querySelector('.page-content'))">${l}</button>`
          ).join('')}
        </div>
        <div class="view-toggle-bar">
          <button class="view-toggle-btn${_prodView==='table'?' active':''}" title="Table View" onclick="_prodView='table';_renderProductsPage(document.querySelector('.page-content'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
          </button>
          <button class="view-toggle-btn${_prodView==='card'?' active':''}" title="Card View" onclick="_prodView='card';_renderProductsPage(document.querySelector('.page-content'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- PRODUCTS CONTENT -->
    ${filtered.length === 0 ? `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <h3>No products found</h3>
        <p>${_prodSearch ? 'Try a different search term' : 'Add your first product to get started'}</p>
        <button class="btn btn-primary btn-sm" onclick="openProductForm()" style="margin-top:12px;font-size:13px;padding:8px 18px">${ICONS.plus} Add Product</button>
      </div>
    ` : _prodView === 'card' ? `
      <div class="card-grid">
        ${filtered.map(p => {
          const stockClass = p.stock_qty <= 0 ? 'red' : p.stock_qty <= p.low_stock_alert ? 'orange' : 'green';
          const stockLabel = p.stock_qty <= 0 ? 'Out of Stock' : p.stock_qty <= p.low_stock_alert ? `Low (${p.stock_qty})` : `${p.stock_qty} ${esc(p.unit||'')}`;
          const stockColor = p.stock_qty <= 0 ? '#ef4444' : p.stock_qty <= p.low_stock_alert ? '#f59e0b' : '#22c55e';
          const wLabel = p.warranty_type === 'none' ? '—' : `${p.warranty_duration} ${p.warranty_unit} (${p.warranty_type.replace('_',' ')})`;
          const gLabel = p.guarantee_type === 'none' ? '—' : `${p.guarantee_duration} ${p.guarantee_unit} (${p.guarantee_type.replace('_',' ')})`;
          const avatarColors = ['blue','green','purple','orange','teal'];
          const avatarColor = avatarColors[Math.abs(p.name.charCodeAt(0)) % avatarColors.length];
          return `
          <div class="item-card">
            <div class="item-card-header">
              <div style="display:flex;gap:12px;align-items:flex-start;min-width:0">
                <div class="item-card-avatar ${avatarColor}">${esc(p.name[0].toUpperCase())}</div>
                <div style="min-width:0">
                  <div class="item-card-title">${esc(p.name)}</div>
                  <div class="item-card-sub">${p.brand ? esc(p.brand) : esc(p.category||'general')}</div>
                </div>
              </div>
              <span class="item-card-badge" style="background:${p.is_active?'var(--c-green-lt)':'var(--c-surface2)'};color:${p.is_active?'var(--c-green)':'var(--c-text2)'};white-space:nowrap">${p.is_active?'Active':'Inactive'}</span>
            </div>
            <hr class="item-card-divider">
            <div class="item-card-fields">
              <div class="item-card-field">
                <span class="item-card-field-label">Price</span>
                <span class="item-card-field-val" style="font-weight:700">${fmt(p.unit_price)} <span style="font-size:10px;color:var(--c-text3)">+${p.tax_rate}% GST</span></span>
              </div>
              <div class="item-card-field">
                <span class="item-card-field-label">Stock</span>
                <span class="item-card-field-val" style="color:${stockColor};font-weight:600">${stockLabel}</span>
              </div>
              <div class="item-card-field">
                <span class="item-card-field-label">Product ID</span>
                <span class="item-card-field-val mono" style="color:var(--c-primary);font-weight:600;font-size:11px">${esc(p.unique_id||'—')}</span>
              </div>
              <div class="item-card-field">
                <span class="item-card-field-label">SKU</span>
                <span class="item-card-field-val mono">${esc(p.sku||'—')}</span>
              </div>
              <div class="item-card-field">
                <span class="item-card-field-label">HSN</span>
                <span class="item-card-field-val mono">${esc(p.hsn_code||'—')}</span>
              </div>
              ${p.warranty_type !== 'none' ? `
              <div class="item-card-field">
                <span class="item-card-field-label">Warranty</span>
                <span class="item-card-field-val" style="color:#3b82f6">${wLabel}</span>
              </div>` : ''}
              ${p.guarantee_type !== 'none' ? `
              <div class="item-card-field">
                <span class="item-card-field-label">Guarantee</span>
                <span class="item-card-field-val" style="color:#22c55e">${gLabel}</span>
              </div>` : ''}
            </div>
            <div class="item-card-actions">
              <button class="btn btn-ghost btn-sm" onclick="viewProductDetails('${p.id}')" title="View">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View
              </button>
              <button class="btn btn-ghost btn-sm" onclick="openStockAdjust('${p.id}','${esc(p.name)}')" title="Stock">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Stock
              </button>
              <button class="btn btn-ghost btn-sm" onclick="openProductForm('${p.id}')" title="Edit">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit
              </button>
              <button class="btn btn-ghost btn-sm" onclick="deleteProduct('${p.id}','${esc(p.name)}')" style="color:var(--c-red)" title="Delete">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>
    ` : `
      <div class="card">
        <div class="card-body-p0">
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>Product</th><th>Product ID</th><th>SKU / HSN</th><th>Category</th>
                <th style="text-align:right">Price</th><th style="text-align:right">Stock</th>
                <th>Warranty</th><th>Guarantee</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                ${filtered.map(p => {
                  const stockClass = p.stock_qty <= 0 ? 'color:#ef4444' : p.stock_qty <= p.low_stock_alert ? 'color:#f59e0b' : 'color:#22c55e';
                  const stockLabel = p.stock_qty <= 0 ? 'Out of Stock' : p.stock_qty <= p.low_stock_alert ? `Low (${p.stock_qty})` : p.stock_qty;
                  const wLabel = p.warranty_type === 'none' ? '—' : `${p.warranty_duration} ${p.warranty_unit}`;
                  const gLabel = p.guarantee_type === 'none' ? '—' : `${p.guarantee_duration} ${p.guarantee_unit}`;
                  return `<tr>
                    <td>
                      <div style="font-weight:600;color:var(--c-text)">${esc(p.name)}</div>
                      ${p.brand ? `<div style="font-size:11px;color:var(--c-text3)">${esc(p.brand)}${p.model_number?' · '+esc(p.model_number):''}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-family:monospace;font-size:11px;font-weight:600;color:var(--c-primary);background:var(--c-primary-lt,#eff6ff);padding:2px 7px;border-radius:5px;display:inline-block">${esc(p.unique_id||'—')}</div>
                    </td>
                    <td>
                      <div style="font-family:monospace;font-size:12px">${esc(p.sku||'—')}</div>
                      <div style="font-size:11px;color:var(--c-text3)">HSN: ${esc(p.hsn_code||'—')}</div>
                    </td>
                    <td><span class="badge badge-neutral" style="text-transform:capitalize">${esc(p.category||'general')}</span></td>
                    <td style="text-align:right">
                      <div style="font-weight:600">${fmt(p.unit_price)}</div>
                      <div style="font-size:11px;color:var(--c-text3)">GST ${p.tax_rate}%</div>
                    </td>
                    <td style="text-align:right">
                      <span style="font-weight:600;${stockClass}">${stockLabel}</span>
                      <div style="font-size:11px;color:var(--c-text3)">${esc(p.unit)}</div>
                    </td>
                    <td>
                      ${p.warranty_type !== 'none'
                        ? `<div style="display:flex;align-items:center;gap:5px">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span style="font-size:12px;color:#3b82f6;font-weight:500">${wLabel}</span>
                          </div>
                          <div style="font-size:10px;color:var(--c-text3);text-transform:capitalize">${p.warranty_type.replace('_',' ')}</div>`
                        : '<span style="color:var(--c-text3);font-size:12px">—</span>'}
                    </td>
                    <td>
                      ${p.guarantee_type !== 'none'
                        ? `<div style="display:flex;align-items:center;gap:5px">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                            <span style="font-size:12px;color:#22c55e;font-weight:500">${gLabel}</span>
                          </div>
                          <div style="font-size:10px;color:var(--c-text3);text-transform:capitalize">${p.guarantee_type.replace('_',' ')}</div>`
                        : '<span style="color:var(--c-text3);font-size:12px">—</span>'}
                    </td>
                    <td>
                      <span class="badge ${p.is_active ? 'badge-success' : 'badge-neutral'}">${p.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>
                      <div style="display:flex;gap:6px;align-items:center">
                        <button class="btn btn-ghost btn-sm" title="View Details" onclick="viewProductDetails('${p.id}')" style="padding:4px 8px">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm" title="Adjust Stock" onclick="openStockAdjust('${p.id}','${esc(p.name)}')" style="padding:4px 8px">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm" title="Edit" onclick="openProductForm('${p.id}')" style="padding:4px 8px">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm" title="Delete" onclick="deleteProduct('${p.id}','${esc(p.name)}')" style="padding:4px 8px;color:var(--c-red)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `}
  `;
}

function _prodSearchChange(val) {
  _prodSearch = val;
  _renderProductsPage(document.querySelector('.page-content'));
}

// ── PRODUCT FORM ──────────────────────────────
async function openProductForm(id) {
  let editing = null;
  if (id) {
    editing = await API.getProduct(id);
  }

  openModal({
    title: editing ? `Edit Product — ${esc(editing.name)}` : 'Add New Product',
    size: 'xl',
    body: `
      <!-- BASIC INFO -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--c-border)">Basic Information</div>
      <div class="form-row cols-3">
        <div class="form-group" style="grid-column:1/3">
          <label class="form-label req">Product Name</label>
          <input class="form-input" id="pf-name" value="${esc(editing?.name||'')}" placeholder="e.g. Samsung Galaxy S24">
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-input" id="pf-active">
            <option value="1"${(!editing||editing.is_active)?' selected':''}>Active</option>
            <option value="0"${(editing&&!editing.is_active)?' selected':''}>Inactive</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">SKU / Item Code</label>
          <div style="display:flex;gap:6px">
            <input class="form-input" id="pf-sku" value="${esc(editing?.sku||'')}" placeholder="e.g. SKU-SAMSUNG-0001" style="flex:1;font-family:monospace;font-size:13px">
            <button type="button" class="btn btn-secondary btn-sm" style="white-space:nowrap;padding:0 10px;flex-shrink:0" onclick="_autoFillSKU()" title="Auto-generate SKU from brand">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:3px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Auto
            </button>
          </div>
          <div style="font-size:10px;color:var(--c-text3);margin-top:3px">Format: SKU-BRAND-0001 · Click Auto to generate</div>
        </div>
        <div class="form-group">
          <label class="form-label">HSN Code</label>
          <input class="form-input" id="pf-hsn" value="${esc(editing?.hsn_code||'')}" placeholder="e.g. 8517">
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-input" id="pf-category">
            ${PRODUCT_CATEGORIES.map(c=>`<option value="${c}"${(editing?.category||'general')===c?' selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">Brand</label>
          <input class="form-input" id="pf-brand" value="${esc(editing?.brand||'')}" placeholder="e.g. Samsung">
        </div>
        <div class="form-group">
          <label class="form-label">Model Number</label>
          <input class="form-input" id="pf-model" value="${esc(editing?.model_number||'')}" placeholder="e.g. SM-S928B">
        </div>
        <div class="form-group">
          <label class="form-label">Unit of Measure</label>
          <select class="form-input" id="pf-unit">
            ${PRODUCT_UNITS.map(u=>`<option value="${u}"${(editing?.unit||'pcs')===u?' selected':''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="pf-desc" rows="2" placeholder="Product description, features, specifications…">${esc(editing?.description||'')}</textarea>
      </div>

      <!-- PRICING & STOCK -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--c-border)">Pricing & Stock</div>
      <div class="form-row cols-4">
        <div class="form-group">
          <label class="form-label req">Selling Price (₹)</label>
          <input class="form-input" type="number" id="pf-price" min="0" step="0.01" value="${editing?.unit_price||0}">
        </div>
        <div class="form-group">
          <label class="form-label">Purchase Price (₹)</label>
          <input class="form-input" type="number" id="pf-purchase" min="0" step="0.01" value="${editing?.purchase_price||0}">
        </div>
        <div class="form-group">
          <label class="form-label">GST Rate (%)</label>
          <select class="form-input" id="pf-tax">${GST_HTML.replace(`value="${editing?.tax_rate??18}"`, `value="${editing?.tax_rate??18}" selected`)}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Current Stock</label>
          <input class="form-input" type="number" id="pf-stock" min="0" step="any" value="${editing?.stock_qty||0}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Low Stock Alert Threshold</label>
          <input class="form-input" type="number" id="pf-lowstock" min="0" step="any" value="${editing?.low_stock_alert||5}" placeholder="5">
        </div>
        <div class="form-group">
          <label class="form-label">Image URL</label>
          <input class="form-input" id="pf-image" value="${esc(editing?.image_url||'')}" placeholder="https://example.com/image.jpg">
        </div>
      </div>

      <!-- WARRANTY -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Warranty
      </div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">Warranty Type</label>
          <select class="form-input" id="pf-wtype" onchange="_toggleWarrantyFields()">
            ${WARRANTY_TYPES.map(w=>`<option value="${w.value}"${(editing?.warranty_type||'none')===w.value?' selected':''}>${w.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="pf-wduration-wrap">
          <label class="form-label">Duration</label>
          <div style="display:flex;gap:8px">
            <input class="form-input" type="number" id="pf-wduration" min="0" value="${editing?.warranty_duration||0}" style="flex:1">
            <select class="form-input" id="pf-wunit" style="width:110px">
              <option value="months"${(editing?.warranty_unit||'months')==='months'?' selected':''}>Months</option>
              <option value="years"${editing?.warranty_unit==='years'?' selected':''}>Years</option>
            </select>
          </div>
        </div>
        <div class="form-group" id="pf-wterms-wrap">
          <label class="form-label">Warranty Terms / Notes</label>
          <input class="form-input" id="pf-wterms" value="${esc(editing?.warranty_terms||'')}" placeholder="e.g. Covers manufacturing defects only">
        </div>
      </div>

      <!-- GUARANTEE -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Guarantee
      </div>
      <div class="form-row cols-3">
        <div class="form-group">
          <label class="form-label">Guarantee Type</label>
          <select class="form-input" id="pf-gtype" onchange="_toggleGuaranteeFields()">
            ${GUARANTEE_TYPES.map(g=>`<option value="${g.value}"${(editing?.guarantee_type||'none')===g.value?' selected':''}>${g.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="pf-gduration-wrap">
          <label class="form-label">Duration</label>
          <div style="display:flex;gap:8px">
            <input class="form-input" type="number" id="pf-gduration" min="0" value="${editing?.guarantee_duration||0}" style="flex:1">
            <select class="form-input" id="pf-gunit" style="width:110px">
              <option value="days"${(editing?.guarantee_unit||'days')==='days'?' selected':''}>Days</option>
              <option value="months"${editing?.guarantee_unit==='months'?' selected':''}>Months</option>
            </select>
          </div>
        </div>
        <div class="form-group" id="pf-gterms-wrap">
          <label class="form-label">Guarantee Terms / Notes</label>
          <input class="form-input" id="pf-gterms" value="${esc(editing?.guarantee_terms||'')}" placeholder="e.g. 30-day money-back, no questions asked">
        </div>
      </div>

      <!-- VENDOR / SUPPLIER -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 6v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        Vendor / Supplier
      </div>
      <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:10px;padding:14px" id="pf-vendor-section">
        <div class="form-row cols-3" style="margin-bottom:10px">
          <div class="form-group" style="grid-column:1/3">
            <label class="form-label">Select Vendor</label>
            <select class="form-input" id="pf-vendor-select">
              <option value="">— No vendor —</option>
              ${_allVendors.map(v => `<option value="${v.id}" data-code="${esc(v.vendor_id||'')}" data-phone="${esc(v.phone||'')}" data-email="${esc(v.email||'')}">${esc(v.vendor_id ? v.vendor_id+' — ' : '')}${esc(v.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Supply Price (₹)</label>
            <input class="form-input" type="number" id="pf-supply-price" min="0" step="0.01" placeholder="0.00" value="0">
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label class="form-label">Notes (optional)</label>
            <input class="form-input" id="pf-vendor-notes" placeholder="e.g. lead time 3 days">
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:2px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:500">
              <input type="checkbox" id="pf-vendor-primary" style="width:16px;height:16px;accent-color:var(--c-primary)">
              Set as primary supplier
            </label>
          </div>
        </div>
        ${editing ? `<div id="pf-existing-vendors" style="margin-top:10px"></div>` : ''}
      </div>
    `,
    onOpen: () => {
      setTimeout(() => {
        _toggleWarrantyFields();
        _toggleGuaranteeFields();
        if (editing) _loadExistingProductVendors(editing.id);
      }, 80);
    },
    onSave: async () => {
      const name = document.getElementById('pf-name').value.trim();
      if (!name) { toast('Product name is required', 'error'); return false; }
      const price = safeNum(document.getElementById('pf-price').value);
      if (price < 0) { toast('Price cannot be negative', 'error'); return false; }

      const payload = {
        name,
        sku:              document.getElementById('pf-sku').value.trim(),
        hsn_code:         document.getElementById('pf-hsn').value.trim(),
        description:      document.getElementById('pf-desc').value.trim(),
        category:         document.getElementById('pf-category').value,
        unit:             document.getElementById('pf-unit').value,
        unit_price:       price,
        purchase_price:   safeNum(document.getElementById('pf-purchase').value),
        tax_rate:         safeNum(document.getElementById('pf-tax').value),
        stock_qty:        safeNum(document.getElementById('pf-stock').value),
        low_stock_alert:  safeNum(document.getElementById('pf-lowstock').value),
        image_url:        document.getElementById('pf-image').value.trim(),
        brand:            document.getElementById('pf-brand').value.trim(),
        model_number:     document.getElementById('pf-model').value.trim(),
        is_active:        document.getElementById('pf-active').value === '1',
        warranty_type:     document.getElementById('pf-wtype').value,
        warranty_duration: safeNum(document.getElementById('pf-wduration').value),
        warranty_unit:     document.getElementById('pf-wunit').value,
        warranty_terms:    document.getElementById('pf-wterms').value.trim(),
        guarantee_type:     document.getElementById('pf-gtype').value,
        guarantee_duration: safeNum(document.getElementById('pf-gduration').value),
        guarantee_unit:     document.getElementById('pf-gunit').value,
        guarantee_terms:    document.getElementById('pf-gterms').value.trim(),
      };

      let savedId;
      if (editing) {
        await API.updateProduct(editing.id, payload);
        savedId = editing.id;
      } else {
        const res = await API.createProduct(payload);
        savedId = res.id;
      }

      // Save vendor if selected
      const vendorSel = document.getElementById('pf-vendor-select');
      if (vendorSel && vendorSel.value) {
        const selectedVendorId = vendorSel.value;
        const isPrimary = document.getElementById('pf-vendor-primary')?.checked;
        const supplyPrice = parseFloat(document.getElementById('pf-supply-price')?.value) || 0;
        const vendorNotes = document.getElementById('pf-vendor-notes')?.value?.trim() || '';
        // Check if this vendor is already linked to avoid duplicates
        let existingLinks = [];
        try { existingLinks = await API.getProductVendors(savedId); } catch(e) {}
        const alreadyLinked = existingLinks.find(pv => pv.vendor_id === selectedVendorId);
        if (!alreadyLinked) {
          try {
            await API.addProductVendor(savedId, {
              vendor_id: selectedVendorId,
              supply_price: supplyPrice,
              is_primary: isPrimary,
              notes: vendorNotes,
            });
          } catch(vendorErr) {
            toast('Product saved, but vendor link failed: ' + (vendorErr.message || 'Unknown error'), 'error');
          }
        }
      }

      toast(editing ? 'Product updated' : 'Product created');
      [_products, _allVendors] = await Promise.all([API.getProducts(), API.getVendors()]);
      _renderProductsPage(document.querySelector('.page-content'));
    }
  });
}

async function _loadExistingProductVendors(productId) {
  const wrap = document.getElementById('pf-existing-vendors');
  if (!wrap) return;
  try {
    const pvs = await API.getProductVendors(productId);
    if (!pvs.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-text3);margin-bottom:8px">Current Vendor History</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${pvs.map(pv => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:8px;font-size:12px">
            <div style="flex:1">
              <span style="font-weight:600;color:var(--c-primary)">${esc(pv.vendor_code||'')}</span>
              ${pv.vendor_code ? '<span style="color:var(--c-text3);margin:0 4px">—</span>' : ''}
              <button onclick="navigateToVendor('${pv.vendor_id}')" style="background:none;border:none;cursor:pointer;color:var(--c-primary);font-weight:600;padding:0;font-size:12px;text-decoration:underline;text-underline-offset:2px" title="View vendor profile">${esc(pv.vendor_name||'Unknown')}</button>
              ${pv.vendor_phone ? `<span style="color:var(--c-text2);margin-left:8px">${esc(pv.vendor_phone)}</span>` : ''}
              ${pv.supply_price > 0 ? `<span style="margin-left:8px;color:var(--c-green);font-weight:500">₹${pv.supply_price.toLocaleString('en-IN')}</span>` : ''}
              ${pv.is_primary ? `<span style="margin-left:8px;background:#ede9fe;color:#7c3aed;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:700">PRIMARY</span>` : ''}
            </div>
            <button class="btn btn-danger btn-icon btn-sm" title="Remove" onclick="_removeProductVendor('${productId}','${pv.id}',this)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`).join('')}
      </div>`;
  } catch(e) { wrap.innerHTML = ''; }
}

async function _removeProductVendor(productId, pvId, btn) {
  btn.disabled = true;
  try {
    await API.removeProductVendor(productId, pvId);
    await _loadExistingProductVendors(productId);
  } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
}

function _toggleWarrantyFields() {
  const type = document.getElementById('pf-wtype')?.value;
  const show = type && type !== 'none';
  const d = document.getElementById('pf-wduration-wrap');
  const t = document.getElementById('pf-wterms-wrap');
  if (d) d.style.opacity = show ? '1' : '0.4';
  if (t) t.style.opacity = show ? '1' : '0.4';
}

function _toggleGuaranteeFields() {
  const type = document.getElementById('pf-gtype')?.value;
  const show = type && type !== 'none';
  const d = document.getElementById('pf-gduration-wrap');
  const t = document.getElementById('pf-gterms-wrap');
  if (d) d.style.opacity = show ? '1' : '0.4';
  if (t) t.style.opacity = show ? '1' : '0.4';
}

// ── SKU AUTO-GENERATE (from form) ─────────────
async function _autoFillSKU() {
  const skuEl = document.getElementById('pf-sku');
  const brandEl = document.getElementById('pf-brand');
  if (!skuEl) return;
  const brand = brandEl?.value?.trim() || 'PROD';
  skuEl.value = '…';
  skuEl.disabled = true;
  const sku = await generateSKU(brand);
  skuEl.value = sku;
  skuEl.disabled = false;
  skuEl.style.color = 'var(--c-primary)';
  skuEl.style.fontWeight = '600';
  setTimeout(() => { skuEl.style.color = ''; skuEl.style.fontWeight = ''; }, 2000);
}

// ── STOCK ADJUSTMENT ──────────────────────────
function openStockAdjust(id, name) {
  openModal({
    title: `Adjust Stock — ${name}`,
    size: 'sm',
    body: `
      <div style="margin-bottom:16px;padding:12px;background:var(--c-surface2);border-radius:var(--radius);font-size:13px;color:var(--c-text2)">
        Enter a positive number to add stock, or a negative number to deduct stock.
      </div>
      <div class="form-group">
        <label class="form-label req">Quantity Change</label>
        <input class="form-input" type="number" id="sa-delta" step="any" placeholder="e.g. 10 or -5" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Reason / Note</label>
        <input class="form-input" id="sa-note" placeholder="e.g. Received from supplier">
      </div>
    `,
    onSave: async () => {
      const delta = safeNum(document.getElementById('sa-delta').value);
      if (delta === 0) { toast('Enter a non-zero quantity', 'error'); return false; }
      await API.adjustStock(id, delta);
      toast(`Stock ${delta > 0 ? 'added' : 'deducted'} successfully`);
      _products = await API.getProducts();
      _renderProductsPage(document.querySelector('.page-content'));
    }
  });
}

// ── PRODUCT DETAILS ───────────────────────────
async function viewProductDetails(id) {
  const p = await API.getProduct(id);

  const wBadge = p.warranty_type !== 'none'
    ? `<div style="display:flex;align-items:center;gap:8px;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:10px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div>
          <div style="font-weight:600;color:#1d4ed8;font-size:13px">Warranty: ${p.warranty_duration} ${p.warranty_unit} — ${WARRANTY_TYPES.find(w=>w.value===p.warranty_type)?.label||p.warranty_type}</div>
          ${p.warranty_terms ? `<div style="font-size:12px;color:#3b82f6;margin-top:2px">${esc(p.warranty_terms)}</div>` : ''}
        </div>
      </div>`
    : `<div style="padding:10px 12px;background:var(--c-surface2);border-radius:8px;font-size:12px;color:var(--c-text3);margin-bottom:10px">No warranty provided</div>`;

  const gBadge = p.guarantee_type !== 'none'
    ? `<div style="display:flex;align-items:center;gap:8px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <div>
          <div style="font-weight:600;color:#15803d;font-size:13px">Guarantee: ${p.guarantee_duration} ${p.guarantee_unit} — ${GUARANTEE_TYPES.find(g=>g.value===p.guarantee_type)?.label||p.guarantee_type}</div>
          ${p.guarantee_terms ? `<div style="font-size:12px;color:#22c55e;margin-top:2px">${esc(p.guarantee_terms)}</div>` : ''}
        </div>
      </div>`
    : `<div style="padding:10px 12px;background:var(--c-surface2);border-radius:8px;font-size:12px;color:var(--c-text3)">No guarantee provided</div>`;

  const stockColor = p.stock_qty <= 0 ? '#ef4444' : p.stock_qty <= p.low_stock_alert ? '#f59e0b' : '#22c55e';
  const margin = p.purchase_price > 0 ? (((p.unit_price - p.purchase_price) / p.purchase_price) * 100).toFixed(1) : null;

  openModal({
    title: `Product Details — ${esc(p.name)}`,
    size: 'lg',
    hideSave: true,
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin-bottom:10px">Product Info</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            ${[
              ['Product ID', p.unique_id||'—'],
              ['Name', p.name],
              ['SKU', p.sku||'—'],
              ['HSN Code', p.hsn_code||'—'],
              ['Category', (p.category||'general')],
              ['Brand', p.brand||'—'],
              ['Model', p.model_number||'—'],
              ['Unit', p.unit||'pcs'],
              ['Description', p.description||'—'],
            ].map(([k,v]) => `<tr style="border-bottom:1px solid var(--c-border)">
              <td style="padding:7px 0;color:var(--c-text3);width:110px">${k}</td>
              <td style="padding:7px 0;font-weight:500">${esc(String(v))}</td>
            </tr>`).join('')}
          </table>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin-bottom:10px">Pricing & Stock</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            ${[
              ['Selling Price', fmt(p.unit_price)],
              ['Purchase Price', p.purchase_price > 0 ? fmt(p.purchase_price) : '—'],
              ['Margin', margin ? `${margin}%` : '—'],
              ['GST Rate', `${p.tax_rate}%`],
              ['Stock Qty', `${p.stock_qty} ${p.unit}`],
              ['Low Stock At', `${p.low_stock_alert} ${p.unit}`],
              ['Stock Value', fmt(p.stock_qty * p.unit_price)],
              ['Status', p.is_active ? 'Active' : 'Inactive'],
            ].map(([k,v]) => `<tr style="border-bottom:1px solid var(--c-border)">
              <td style="padding:7px 0;color:var(--c-text3);width:110px">${k}</td>
              <td style="padding:7px 0;font-weight:500;${k==='Stock Qty'?`color:${stockColor}`:''}">${esc(String(v))}</td>
            </tr>`).join('')}
          </table>
        </div>
      </div>

      <div style="margin-top:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin-bottom:10px">Warranty & Guarantee</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>${wBadge}</div>
          <div>${gBadge}</div>
        </div>
      </div>

      ${p.sku ? `
      <div style="margin-top:20px;padding:16px;background:var(--c-surface2);border-radius:12px;border:1px solid var(--c-border)">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin-bottom:14px;display:flex;align-items:center;gap:6px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>
          QR Code &amp; Barcode — SKU: <span style="font-family:monospace;color:var(--c-primary)">${esc(p.sku)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
          <div style="text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--c-text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">QR Code</div>
            <div id="prod-detail-qr" style="display:inline-block;background:#fff;padding:8px;border-radius:8px;border:1px solid var(--c-border)"></div>
            <div style="margin-top:8px">
              <button class="btn btn-ghost btn-sm" onclick="downloadQR('prod-detail-qr','${esc(p.sku)}')" style="font-size:11px">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download QR
              </button>
            </div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--c-text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Barcode</div>
            <div style="background:#fff;padding:8px;border-radius:8px;border:1px solid var(--c-border);display:inline-block">
              <svg id="prod-detail-barcode"></svg>
            </div>
            <div style="margin-top:8px">
              <button class="btn btn-ghost btn-sm" onclick="downloadBarcode('prod-detail-barcode','${esc(p.sku)}')" style="font-size:11px">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Barcode
              </button>
            </div>
          </div>
        </div>
      </div>` : `
      <div style="margin-top:20px;padding:14px;background:var(--c-surface2);border-radius:10px;border:1px dashed var(--c-border2);font-size:12px;color:var(--c-text3);text-align:center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:middle"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        No SKU assigned — <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px" onclick="closeModal();openProductForm('${p.id}')">Add SKU to generate QR &amp; Barcode</button>
      </div>`}

      <!-- SUPPLIED BY SECTION -->
      <div style="margin-top:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--c-text3);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 6v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          Supplied By
        </div>
        <div id="prod-detail-vendors">
          <div style="display:flex;align-items:center;justify-content:center;padding:14px;color:var(--c-text3);font-size:13px">
            <span class="spinner" style="margin-right:8px"></span> Loading vendors…
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-primary" onclick="closeModal();openProductForm('${p.id}')">Edit Product</button>
        <button class="btn btn-ghost" onclick="closeModal();openStockAdjust('${p.id}','${esc(p.name)}')">Adjust Stock</button>
      </div>
    `,
    onOpen: () => {
      if (p.sku) {
        setTimeout(() => {
          renderQRCode('prod-detail-qr', p.sku, 120);
          renderBarcode('prod-detail-barcode', p.sku);
        }, 80);
      }
      _loadProductVendorDetails(p.id);
    }
  });
}

async function _loadProductVendorDetails(productId) {
  const wrap = document.getElementById('prod-detail-vendors');
  if (!wrap) return;
  try {
    const pvs = await API.getProductVendors(productId);
    if (!pvs.length) {
      wrap.innerHTML = `<div style="padding:12px 14px;background:var(--c-surface2);border-radius:8px;font-size:13px;color:var(--c-text3);text-align:center">
        No vendors linked. <button class="btn btn-ghost btn-sm" style="font-size:12px;padding:2px 8px" onclick="closeModal();openProductForm('${productId}')">Add a vendor</button>
      </div>`;
      return;
    }
    const primary = pvs.find(v => v.is_primary) || pvs[0];
    const others = pvs.filter(v => v.id !== primary.id);
    const borderColor = (isPrimary) => isPrimary ? '#c4b5fd' : 'var(--c-border)';
    const bgColor = (isPrimary) => isPrimary ? '#ede9fe' : 'var(--c-surface)';
    const strokeColor = (isPrimary) => isPrimary ? '#7c3aed' : 'var(--c-text2)';
    const vendorCard = (pv, isPrimary) => {
      const bc = borderColor(isPrimary);
      const bg = bgColor(isPrimary);
      const sc = strokeColor(isPrimary);
      const spFormatted = pv.supply_price > 0 ? pv.supply_price.toLocaleString('en-IN') : null;
      const dateStr = pv.created_at ? new Date(pv.created_at).toLocaleDateString('en-IN') : '';
      return `<div style="display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:12px;padding:12px 14px;background:var(--c-surface2);border:1px solid ${bc};border-radius:10px;margin-bottom:8px">
        <div style="width:36px;height:36px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;border:1px solid ${bc}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${sc}" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 6v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${pv.vendor_code ? `<span style="font-family:monospace;font-size:11px;font-weight:700;color:var(--c-primary);background:var(--c-surface);padding:1px 6px;border-radius:4px;border:1px solid var(--c-border)">${esc(pv.vendor_code)}</span>` : ''}
            <button onclick="closeModal();navigateToVendor('${pv.vendor_id}')" style="font-weight:700;font-size:14px;background:none;border:none;cursor:pointer;color:var(--c-primary);padding:0;text-decoration:underline;text-underline-offset:2px" title="View vendor profile">${esc(pv.vendor_name||'Unknown Vendor')}</button>
            ${isPrimary ? '<span style="background:#ede9fe;color:#7c3aed;border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;letter-spacing:.04em">PRIMARY</span>' : ''}
          </div>
          <div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">
            ${pv.vendor_email ? `<span style="font-size:12px;color:var(--c-text2)">${esc(pv.vendor_email)}</span>` : ''}
            ${pv.vendor_phone ? `<span style="font-size:12px;color:var(--c-text2)">${esc(pv.vendor_phone)}</span>` : ''}
            ${spFormatted ? `<span style="font-size:12px;color:var(--c-green);font-weight:600">Supply: \u20b9${spFormatted}</span>` : ''}
            ${pv.notes ? `<span style="font-size:12px;color:var(--c-text3)">${esc(pv.notes)}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div style="font-size:11px;color:var(--c-text3);white-space:nowrap">${dateStr}</div>
          <button onclick="closeModal();navigateToVendor('${pv.vendor_id}')" class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px" title="Open vendor page">View Profile →</button>
        </div>
      </div>`;
    };
    wrap.innerHTML = vendorCard(primary, true) + others.map(v => vendorCard(v, false)).join('');
  } catch(e) {
    wrap.innerHTML = '<div style="font-size:13px;color:var(--c-text3);padding:10px">Could not load vendor info.</div>';
  }
}

// ── DELETE ────────────────────────────────────
async function deleteProduct(id, name) {
  confirmDel(`Delete product "${name}"? This cannot be undone.`, async () => {
    try {
      await API.deleteProduct(id);
      toast('Product deleted');
      _products = await API.getProducts();
      _renderProductsPage(document.querySelector('.page-content'));
    } catch(e) { toast(e.message, 'error'); }
  });
}

// ── PRODUCT SCANNER ────────────────────────────
function openProductScanner() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'product-scanner-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px;width:100%">
      <div class="modal-header">
        <div class="modal-title" style="display:flex;align-items:center;gap:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
          Scan Product Barcode / QR
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="closeProductScanner()">✕</button>
      </div>
      <div class="modal-body" style="padding:20px">
        <div style="background:#f0f4f8;border-radius:10px;padding:14px;margin-bottom:16px;font-size:12px;color:#5a6478;display:flex;align-items:flex-start;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Scan any barcode or QR code. Existing products will be shown instantly. New products will be <strong>auto-filled from an online product database</strong> so you only need to review and save.</span>
        </div>
        <div id="prod-qr-reader" style="width:100%;border-radius:10px;overflow:hidden;border:2px solid var(--c-border);min-height:220px;background:#000;display:flex;align-items:center;justify-content:center">
          <div style="color:white;font-size:12px;opacity:0.5">Starting camera…</div>
        </div>

        <!-- Upload image option -->
        <div style="margin-top:12px;display:flex;gap:8px">
          <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;background:var(--c-surface2);border:2px dashed var(--c-border2);border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;color:var(--c-text2);transition:border-color .15s" onmouseenter="this.style.borderColor='var(--c-primary)'" onmouseleave="this.style.borderColor='var(--c-border2)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Barcode / QR Image
            <input type="file" accept="image/*" style="display:none" onchange="scanProductUploadedImage(this)">
          </label>
        </div>

        <!-- Manual SKU search -->
        <div style="margin-top:16px">
          <div style="font-size:11px;font-weight:600;color:var(--c-text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Or search by SKU / Product Name</div>
          <div style="display:flex;gap:8px">
            <input class="form-input" id="prod-scanner-manual" placeholder="e.g. ELEC-001 or Samsung" style="flex:1"
              onkeydown="if(event.key==='Enter'){event.preventDefault();prodScannerManualSearch(this.value)}"
              onclick="event.stopPropagation()">
            <button class="btn btn-primary" onclick="prodScannerManualSearch(document.getElementById('prod-scanner-manual').value)">Search</button>
          </div>
        </div>
        <div id="prod-scanner-result" style="margin-top:14px"></div>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeProductScanner(); });
  overlay.querySelector('.modal').addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(overlay);

  // Start camera scanner
  setTimeout(() => {
    const el = document.getElementById('prod-qr-reader');
    if (!el || typeof Html5Qrcode === 'undefined') {
      const resEl = document.getElementById('prod-scanner-result');
      if (resEl) resEl.innerHTML = `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px;font-size:12px;color:#92400e">QR scanner library not loaded. Use the upload or manual search below.</div>`;
      return;
    }
    try {
      const scanner = new Html5Qrcode('prod-qr-reader');
      window._productScannerInstance = scanner;
      let _scanning = false; // prevent duplicate scans

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 200 } },
        (decodedText) => {
          if (_scanning) return; // already processing
          _scanning = true;

          // Show "Scanned!" flash on the camera area
          const camEl = document.getElementById('prod-qr-reader');
          if (camEl) camEl.style.border = '3px solid #22c55e';

          if (window.navigator?.vibrate) window.navigator.vibrate(150);

          // Pause safely
          try { scanner.pause(true); } catch(e) {}

          // Run lookup
          handleScannedProductValue(decodedText).finally(() => {
            // Resume after 4 seconds
            setTimeout(() => {
              _scanning = false;
              if (camEl) camEl.style.border = '2px solid var(--c-border)';
              try { scanner.resume(); } catch(e) {}
            }, 4000);
          });
        },
        (errorMsg) => {
          // This fires constantly when no QR is in frame — intentionally ignore
        }
      ).then(() => {
        // Scanner started successfully — update the placeholder text
        const placeholder = el.querySelector('div[style*="Starting camera"]');
        if (placeholder) placeholder.remove();
      }).catch((err) => {
        // Camera access failed
        el.innerHTML = `<div style="color:#fca5a5;font-size:12px;padding:16px;text-align:center">
          <div style="font-size:20px;margin-bottom:8px">📷</div>
          Camera access denied or unavailable.<br>
          <span style="opacity:0.7;font-size:11px">Use "Upload Image" or type SKU manually below.</span>
        </div>`;
      });
    } catch(e) {
      const resEl = document.getElementById('prod-scanner-result');
      if (resEl) resEl.innerHTML = `<div style="color:#d63d3d;font-size:12px;padding:10px">Scanner error: ${e.message}. Use manual search below.</div>`;
    }
  }, 300);
}

// Lookup barcode via Open Food Facts and Open Product Data APIs
async function _lookupBarcodeOnline(barcode) {
  // Try Open Food Facts first (great for consumer goods)
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`);
    if (r.ok) {
      const d = await r.json();
      if (d.status === 1 && d.product) {
        const p = d.product;
        return {
          name: p.product_name || p.product_name_en || '',
          brand: p.brands || '',
          description: p.generic_name || p.categories || '',
          category: 'food',
          barcode: barcode,
          sku: barcode,
        };
      }
    }
  } catch(e) {}

  // Try Open Product Data (broader product database)
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`);
    if (r.ok) {
      const d = await r.json();
      const item = (d.items || [])[0];
      if (item) {
        return {
          name: item.title || item.description || '',
          brand: item.brand || '',
          description: item.description || '',
          category: (item.category || '').toLowerCase().includes('food') ? 'food' : 'general',
          barcode: barcode,
          sku: barcode,
          unit_price: item.lowest_recorded_price || 0,
        };
      }
    }
  } catch(e) {}

  return null;
}

// Handle scanned barcode/QR — find or pre-fill product
async function handleScannedProductValue(decoded) {
  const resEl = document.getElementById('prod-scanner-result');
  if (!resEl) return;

  const code = decoded.trim();

  // Always refresh products from DB so newly-added products are found
  try { _products = await API.getProducts(); } catch(e) {}

  // Show debug info + spinner so user can see what was scanned
  resEl.innerHTML = `
    <div style="background:#1e1e2e;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-family:monospace;font-size:11px;color:#cdd6f4">
      <div style="color:#a6e3a1;font-weight:700;margin-bottom:4px">📷 Scanned:</div>
      <div style="color:#f9e2af;word-break:break-all">"${esc(code)}"</div>
      <div style="color:#6c7086;margin-top:4px">Length: ${code.length} · Products loaded: ${_products.length}</div>
      <div style="color:#6c7086;margin-top:2px">SKUs in DB: ${_products.filter(p=>p.sku).map(p=>`"${p.sku}"`).join(', ') || 'none'}</div>
    </div>
    <div style="text-align:center;padding:10px;color:var(--c-text2);font-size:12px">
      <div class="spinner spin-dark" style="margin:0 auto 8px"></div>Matching…</div>`;

  await new Promise(r => setTimeout(r, 100)); // let UI paint

  // 1. Exact SKU match
  let match = _products.find(p => p.sku?.trim().toLowerCase() === code.toLowerCase());

  // 2. Partial SKU match
  if (!match) match = _products.find(p =>
    p.sku && p.sku.trim().toLowerCase().includes(code.toLowerCase())
  );

  // 3. Code contains SKU (QR might have extra data)
  if (!match) match = _products.find(p =>
    p.sku && code.toLowerCase().includes(p.sku.trim().toLowerCase())
  );

  // 4. Barcode or name match
  if (!match) match = _products.find(p =>
    p.barcode?.trim().toLowerCase() === code.toLowerCase() ||
    p.name?.trim().toLowerCase() === code.toLowerCase()
  );

  if (match) {
    // Existing product found — show full details card
    const stockColor = match.stock_qty <= 0 ? '#ef4444' : match.stock_qty <= match.low_stock_alert ? '#f59e0b' : '#22c55e';
    const stockLabel = match.stock_qty <= 0 ? 'Out of Stock' : match.stock_qty <= match.low_stock_alert ? `Low Stock (${match.stock_qty})` : `${match.stock_qty} ${match.unit || 'pcs'}`;
    const wLabel = match.warranty_type && match.warranty_type !== 'none' ? `${match.warranty_duration} ${match.warranty_unit} warranty` : null;
    const gLabel = match.guarantee_type && match.guarantee_type !== 'none' ? `${match.guarantee_duration} ${match.guarantee_unit} guarantee` : null;

    const debugPanel = resEl.querySelector('div[style*="1e1e2e"]');
    const debugHTML = debugPanel ? debugPanel.outerHTML : '';

    resEl.innerHTML = debugHTML + `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#15803d,#16a34a);padding:12px 14px;display:flex;align-items:center;gap:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span style="font-weight:700;color:#fff;font-size:13px">Product Found!</span>
          <span style="margin-left:auto;background:rgba(255,255,255,.2);color:#fff;font-size:10px;padding:2px 8px;border-radius:20px">${match.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div style="padding:14px">
          <div style="font-weight:700;font-size:15px;margin-bottom:2px">${esc(match.name)}</div>
          ${match.brand ? `<div style="font-size:12px;color:var(--c-text2);margin-bottom:10px">${esc(match.brand)}${match.model_number ? ' · ' + esc(match.model_number) : ''} · ${esc(match.category || 'general')}</div>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
            <div style="background:var(--c-surface);border-radius:8px;padding:8px">
              <div style="font-size:10px;color:var(--c-text3);font-weight:600;text-transform:uppercase;margin-bottom:2px">Selling Price</div>
              <div style="font-weight:700;font-size:15px;color:var(--c-primary)">${fmt(match.unit_price)}</div>
              <div style="font-size:10px;color:var(--c-text3)">+${match.tax_rate}% GST</div>
            </div>
            <div style="background:var(--c-surface);border-radius:8px;padding:8px">
              <div style="font-size:10px;color:var(--c-text3);font-weight:600;text-transform:uppercase;margin-bottom:2px">Stock</div>
              <div style="font-weight:700;font-size:15px;color:${stockColor}">${stockLabel}</div>
            </div>
          </div>
          <div style="font-size:11px;color:var(--c-text2);margin-bottom:4px;display:flex;gap:16px;flex-wrap:wrap">
            <span>SKU: <strong style="font-family:monospace">${esc(match.sku || '—')}</strong></span>
            ${match.hsn_code ? `<span>HSN: <strong>${esc(match.hsn_code)}</strong></span>` : ''}
            ${match.purchase_price > 0 ? `<span>Purchase: <strong>${fmt(match.purchase_price)}</strong></span>` : ''}
          </div>
          ${wLabel || gLabel ? `<div style="font-size:11px;color:var(--c-text2);margin-top:4px">
            ${wLabel ? `🛡️ ${wLabel}` : ''} ${gLabel ? `✅ ${gLabel}` : ''}
          </div>` : ''}
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-primary btn-sm" style="flex:1" onclick="closeProductScanner();viewProductDetails('${match.id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Full Details
            </button>
            <button class="btn btn-ghost btn-sm" style="flex:1" onclick="closeProductScanner();openProductForm('${match.id}')">Edit</button>
            <button class="btn btn-ghost btn-sm" style="flex:1" onclick="closeProductScanner();openStockAdjust('${match.id}','${esc(match.name)}')">Stock</button>
          </div>
        </div>
      </div>`;
  } else {
    // 2. No local match — try a direct backend search by SKU as last resort
    let backendMatch = null;
    try {
      const allProds = await API.getProducts();
      backendMatch = allProds.find(p =>
        p.sku?.trim().toLowerCase() === code.toLowerCase() ||
        (p.sku && code.toLowerCase().includes(p.sku.trim().toLowerCase())) ||
        (p.sku && p.sku.trim().toLowerCase().includes(code.toLowerCase()))
      );
      if (backendMatch) {
        return handleScannedProductValue(backendMatch.sku); // re-run with canonical SKU
      }
    } catch(e) {}

    const debugPanel = resEl.querySelector('div[style*="1e1e2e"]');
    const debugHTML = debugPanel ? debugPanel.outerHTML : '';

    // Only try online lookup for numeric barcodes (EAN/UPC), NOT for SKU-format codes
    const looksLikeInternalSKU = /^SKU-/i.test(code) || /^[A-Z]{2,}-[A-Z0-9]+-\d{3,}$/i.test(code);
    const looksLikeBarcode = /^\d{8,14}$/.test(code);

    if (looksLikeBarcode && !looksLikeInternalSKU) {
      resEl.innerHTML = debugHTML + `<div style="text-align:center;padding:14px;color:var(--c-text2);font-size:12px">
        <div class="spinner spin-dark" style="margin:0 auto 8px"></div>Searching online product database…</div>`;

      const onlinePromise = _lookupBarcodeOnline(code);
      const timeoutPromise = new Promise(res => setTimeout(() => res(null), 4000));
      const online = await Promise.race([onlinePromise, timeoutPromise]);

      if (online && online.name) {
        resEl.innerHTML = debugHTML + `
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <span style="font-weight:700;color:#0369a1;font-size:13px">Found Online — Not in Catalog Yet</span>
            </div>
            <div style="font-weight:600;font-size:14px;margin-bottom:2px">${esc(online.name)}</div>
            ${online.brand ? `<div style="font-size:12px;color:var(--c-text2);margin-bottom:6px">${esc(online.brand)}</div>` : ''}
            <p style="font-size:11px;color:#0369a1;margin-bottom:10px">✓ Details will be auto-filled. Set the price and save.</p>
            <button class="btn btn-primary btn-sm" style="width:100%" onclick="closeProductScanner();openProductFormWithData(${JSON.stringify(online).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;')})">
              ${ICONS.plus} Add to Catalog (Auto-filled)
            </button>
          </div>`;
        return;
      }
    }

    // Not found anywhere — show debug + offer to create
    resEl.innerHTML = debugHTML + `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style="font-weight:700;color:#92400e;font-size:13px">Product Not Found</span>
        </div>
        <div style="font-size:12px;color:var(--c-text2);margin-bottom:10px">
          No product matched: <strong style="font-family:monospace">${esc(code)}</strong><br>
          Check the debug panel above — compare the scanned value with the SKUs in DB.
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" style="flex:1" onclick="closeProductScanner();openProductFormWithSKU('${esc(code)}')">
            ${ICONS.plus} Add as New Product
          </button>
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="document.getElementById('prod-scanner-result').innerHTML='';document.getElementById('prod-scanner-manual').value=''">
            Try Again
          </button>
        </div>
      </div>`;
  }

  // Resume scanner after showing result
  setTimeout(() => {
    if (window._productScannerInstance) {
      try { window._productScannerInstance.resume(); } catch(e) {}
    }
  }, 4000);
}

// Scan from uploaded image
async function scanProductUploadedImage(input) {
  const file = input.files[0];
  if (!file) return;
  // Reset input so the same file can be re-selected
  input.value = '';

  const resEl = document.getElementById('prod-scanner-result');
  if (resEl) resEl.innerHTML = `<div style="text-align:center;padding:14px;color:var(--c-text2);font-size:12px">
    <div class="spinner spin-dark" style="margin:0 auto 8px"></div>Reading image…</div>`;

  if (typeof Html5Qrcode === 'undefined') {
    if (resEl) resEl.innerHTML = `<div style="color:#d63d3d;font-size:12px;padding:10px">QR scanner library not loaded.</div>`;
    return;
  }

  // Method 1: Html5Qrcode.scanFile with a 6-second timeout
  try {
    const scanPromise = Html5Qrcode.scanFile(file, true);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 6000)
    );
    const decoded = await Promise.race([scanPromise, timeoutPromise]);
    if (decoded) {
      handleScannedProductValue(decoded);
      return;
    }
  } catch(e) {
    // timeout or decode failure — try fallback
  }

  // Method 2: Draw image on canvas, try reading via createImageBitmap + Html5Qrcode
  try {
    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    // Scale down large images for faster decode
    const MAX = 1200;
    const scale = Math.min(1, MAX / Math.max(imageBitmap.width, imageBitmap.height));
    canvas.width = imageBitmap.width * scale;
    canvas.height = imageBitmap.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and try again
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const resizedFile = new File([blob], 'scan.png', { type: 'image/png' });
    const decoded2 = await Promise.race([
      Html5Qrcode.scanFile(resizedFile, true),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    if (decoded2) {
      handleScannedProductValue(decoded2);
      return;
    }
  } catch(e) {
    // fallback also failed
  }

  // Method 3: Try jsQR library if available (reads raw pixel data directly)
  try {
    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (typeof jsQR !== 'undefined') {
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result && result.data) {
        handleScannedProductValue(result.data);
        return;
      }
    }
  } catch(e) {}

  // All methods failed
  if (resEl) resEl.innerHTML = `
    <div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:10px;padding:14px">
      <div style="font-weight:700;color:#d63d3d;margin-bottom:6px;font-size:13px">⚠️ Could not read QR/Barcode</div>
      <div style="font-size:12px;color:var(--c-text2);margin-bottom:10px">
        Tips for better scanning:<br>
        • Make sure the QR/barcode fills most of the image<br>
        • Use a screenshot of the QR code from the product details page<br>
        • Try the camera scanner instead<br>
        • Or type the SKU manually in the search box below
      </div>
    </div>`;
}

// Manual search by SKU/name
function prodScannerManualSearch(query) {
  if (!query?.trim()) return;
  const match = _products.find(p =>
    p.sku?.toLowerCase().includes(query.toLowerCase()) ||
    p.name?.toLowerCase().includes(query.toLowerCase()) ||
    p.brand?.toLowerCase().includes(query.toLowerCase())
  );
  handleScannedProductValue(query.trim());
}

// Close the product scanner
function closeProductScanner() {
  if (window._productScannerInstance) {
    try {
      if (window._productScannerInstance.isScanning) {
        window._productScannerInstance.stop().then(() => {
          window._productScannerInstance.clear();
          window._productScannerInstance = null;
        }).catch(() => {});
      } else {
        window._productScannerInstance.clear();
        window._productScannerInstance = null;
      }
    } catch(e) { window._productScannerInstance = null; }
  }
  const overlay = document.getElementById('product-scanner-overlay');
  if (overlay) overlay.remove();
}

// Open product form with a pre-filled SKU (from scanner)
function openProductFormWithSKU(sku) {
  openProductForm(); // open blank form
  setTimeout(() => {
    const skuInput = document.getElementById('pf-sku');
    if (skuInput) {
      skuInput.value = sku;
      skuInput.focus();
    }
  }, 200);
}

// Open product form with all details auto-filled from barcode scan
function openProductFormWithData(data) {
  openProductForm(); // open blank form
  setTimeout(() => {
    // Fill all available fields
    if (data.name)        { const el = document.getElementById('pf-name');    if (el) el.value = data.name; }
    if (data.sku)         { const el = document.getElementById('pf-sku');     if (el) el.value = data.sku; }
    if (data.brand)       { const el = document.getElementById('pf-brand');   if (el) el.value = data.brand; }
    if (data.description) { const el = document.getElementById('pf-desc');    if (el) el.value = data.description; }
    if (data.unit_price && data.unit_price > 0) {
                            const el = document.getElementById('pf-price');   if (el) el.value = data.unit_price; }
    if (data.category) {
      const catEl = document.getElementById('pf-category');
      if (catEl) {
        const cat = data.category.toLowerCase();
        const validCat = PRODUCT_CATEGORIES.includes(cat) ? cat : 'general';
        catEl.value = validCat;
      }
    }
    // Focus on price field since that's most likely missing from online data
    const priceEl = document.getElementById('pf-price');
    if (priceEl) priceEl.focus();

    // Show a helpful toast inside the form
    const nameEl = document.getElementById('pf-name');
    if (nameEl) {
      const toast = document.createElement('div');
      toast.style.cssText = 'background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:8px 12px;font-size:12px;color:#0369a1;margin-bottom:12px;display:flex;align-items:center;gap:8px';
      toast.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5"><path d="M9 11l3 3L22 4"/></svg> Product details auto-filled from barcode scan. Please review and set the price before saving.';
      nameEl.closest('.form-group')?.parentElement?.insertBefore(toast, nameEl.closest('.form-group'));
      setTimeout(() => toast.remove(), 6000);
    }
  }, 250);
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK UPLOAD PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

let _bulkRows = [];       // parsed rows from file
let _bulkErrors = [];     // per-row validation errors

function openBulkUpload() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'bulk-upload-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:900px;width:100%;max-height:90vh;display:flex;flex-direction:column" id="bulk-upload-modal">
      <div class="modal-header" style="flex-shrink:0">
        <div class="modal-title" style="display:flex;align-items:center;gap:10px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Bulk Upload Products
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="closeBulkUpload()">✕</button>
      </div>
      <div class="modal-body" style="overflow-y:auto;flex:1;padding:20px" id="bulk-upload-body">
        ${_bulkUploadStep1HTML()}
      </div>
      <div class="modal-footer" style="flex-shrink:0;padding:14px 20px;border-top:1px solid var(--c-border);display:flex;justify-content:space-between;align-items:center" id="bulk-upload-footer">
        <div id="bulk-footer-left" style="font-size:12px;color:var(--c-text3)">Upload a CSV or Excel file to get started</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="closeBulkUpload()">Cancel</button>
          <button class="btn btn-primary" id="bulk-confirm-btn" onclick="confirmBulkUpload()" style="display:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            Upload Products
          </button>
        </div>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeBulkUpload(); });
  document.body.appendChild(overlay);
}

function _bulkUploadStep1HTML() {
  return `
    <!-- TEMPLATE DOWNLOAD -->
    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--c-surface2);border:1px solid var(--c-border);border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:10px;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div>
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">Download Sample Template</div>
          <div style="font-size:12px;color:var(--c-text3)">Use this template to fill in your product data. Required columns are marked with *</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="_downloadBulkTemplate('csv')" style="font-size:12px;display:flex;align-items:center;gap:5px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
        <button class="btn btn-ghost btn-sm" onclick="_downloadBulkTemplate('xlsx')" style="font-size:12px;display:flex;align-items:center;gap:5px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Excel
        </button>
      </div>
    </div>

    <!-- DRAG & DROP FILE UPLOAD -->
    <div id="bulk-drop-zone"
      style="border:2px dashed var(--c-border2);border-radius:14px;padding:40px 20px;text-align:center;cursor:pointer;transition:all .2s;background:var(--c-surface2)"
      ondragover="_bulkDragOver(event)" ondragleave="_bulkDragLeave(event)" ondrop="_bulkDrop(event)"
      onclick="document.getElementById('bulk-file-input').click()">
      <div style="width:52px;height:52px;border-radius:14px;background:var(--c-primary-lt,#eff6ff);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-primary)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </div>
      <div style="font-weight:600;font-size:14px;margin-bottom:6px">Drag & drop your file here</div>
      <div style="font-size:12px;color:var(--c-text3);margin-bottom:14px">or click to browse — CSV or Excel (.xlsx) — Max 5MB</div>
      <span class="btn btn-secondary btn-sm" style="pointer-events:none;font-size:12px">Browse File</span>
      <input type="file" id="bulk-file-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="_bulkFileSelected(this)">
    </div>

    <!-- REQUIRED FIELDS INFO -->
    <div style="margin-top:20px;padding:14px 18px;background:var(--c-surface2);border-radius:10px;border:1px solid var(--c-border)">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--c-text3);margin-bottom:10px">Required Columns in File</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px">
        ${[
          ['Product Name*','Required'],
          ['SKU','Auto-generated if empty'],
          ['Brand','Optional'],
          ['Category','Default: general'],
          ['Model Number','Optional'],
          ['Purchase Price','Default: 0'],
          ['Selling Price*','Required'],
          ['Stock Quantity','Default: 0'],
          ['GST Rate','Default: 18'],
          ['Warranty Period','Optional'],
          ['Guarantee','Optional'],
        ].map(([col, note]) => `
          <div style="display:flex;flex-direction:column;gap:2px;background:var(--c-surface);padding:8px 10px;border-radius:7px;border:1px solid var(--c-border)">
            <span style="font-size:12px;font-weight:600;color:var(--c-text)">${col}</span>
            <span style="font-size:10px;color:var(--c-text3)">${note}</span>
          </div>`).join('')}
      </div>
    </div>
  `;
}

function _bulkDragOver(e) {
  e.preventDefault();
  const dz = document.getElementById('bulk-drop-zone');
  if (dz) { dz.style.borderColor = 'var(--c-primary)'; dz.style.background = 'var(--c-primary-lt,#eff6ff)'; }
}
function _bulkDragLeave(e) {
  const dz = document.getElementById('bulk-drop-zone');
  if (dz) { dz.style.borderColor = 'var(--c-border2)'; dz.style.background = 'var(--c-surface2)'; }
}
function _bulkDrop(e) {
  e.preventDefault();
  _bulkDragLeave(e);
  const file = e.dataTransfer?.files?.[0];
  if (file) _processBulkFile(file);
}
function _bulkFileSelected(input) {
  const file = input.files?.[0];
  if (file) _processBulkFile(file);
  input.value = '';
}

async function _processBulkFile(file) {
  // Size check: 5MB
  if (file.size > 5 * 1024 * 1024) {
    _bulkShowError('File is too large. Maximum allowed size is 5MB.');
    return;
  }

  const body = document.getElementById('bulk-upload-body');
  if (body) body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--c-text2)"><div class="spinner spin-dark" style="margin:0 auto 14px"></div><div style="font-size:14px">Reading file…</div></div>`;

  try {
    const ext = file.name.split('.').pop().toLowerCase();
    let rows = [];

    if (ext === 'csv') {
      const text = await file.text();
      rows = _parseCSV(text);
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = await _parseXLSX(file);
    } else {
      _bulkShowError('Unsupported file type. Please upload a CSV or Excel (.xlsx) file.');
      return;
    }

    if (rows.length === 0) { _bulkShowError('No data found in the file.'); return; }

    // Validate & normalize rows
    _bulkRows = rows.map((r, i) => _normalizeBulkRow(r, i));
    _bulkErrors = _bulkRows.map(r => r._errors);

    _renderBulkPreview();
  } catch(e) {
    _bulkShowError('Failed to read file: ' + e.message);
  }
}

function _parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  return lines.slice(1).map(line => {
    // Handle quoted fields
    const vals = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else cur += line[i];
    }
    vals.push(cur.trim());

    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

async function _parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        if (typeof XLSX === 'undefined') {
          // Fallback: load SheetJS from CDN
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload = () => {
            try {
              const wb = XLSX.read(e.target.result, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
              resolve(data.map(r => {
                const out = {};
                Object.keys(r).forEach(k => { out[k.toLowerCase().trim()] = String(r[k]).trim(); });
                return out;
              }));
            } catch(err) { reject(err); }
          };
          s.onerror = () => reject(new Error('Failed to load XLSX library'));
          document.head.appendChild(s);
        } else {
          const wb = XLSX.read(e.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(data.map(r => {
            const out = {};
            Object.keys(r).forEach(k => { out[k.toLowerCase().trim()] = String(r[k]).trim(); });
            return out;
          }));
        }
      } catch(err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

function _normalizeBulkRow(raw, idx) {
  const errors = [];

  // Map common column name aliases
  const get = (...keys) => {
    for (const k of keys) {
      const v = raw[k] || raw[k.replace(/ /g, '_')] || raw[k.replace(/_/g, ' ')];
      if (v !== undefined && v !== '') return String(v).trim();
    }
    return '';
  };

  const name = get('product name', 'name', 'product');
  const sku = get('sku', 'sku / item code', 'item code', 'code');
  const brand = get('brand');
  const category = get('category');
  const model_number = get('model number', 'model', 'model no');
  const purchase_price = get('purchase price', 'cost price', 'purchase');
  const unit_price = get('selling price', 'price', 'unit price', 'sale price');
  const stock_qty = get('stock quantity', 'stock', 'quantity', 'qty');
  const tax_rate = get('gst rate', 'gst', 'tax', 'tax rate');
  const warranty_duration = get('warranty period', 'warranty', 'warranty duration');
  const guarantee = get('guarantee', 'guarantee period');

  if (!name) errors.push('Product Name is required');
  if (!unit_price || isNaN(parseFloat(unit_price))) errors.push('Selling Price must be a number');
  if (purchase_price && isNaN(parseFloat(purchase_price))) errors.push('Purchase Price must be a number');
  if (stock_qty && isNaN(parseFloat(stock_qty))) errors.push('Stock Quantity must be a number');
  if (tax_rate && isNaN(parseFloat(tax_rate))) errors.push('GST Rate must be a number');

  return {
    _idx: idx,
    _errors: errors,
    name,
    sku,
    brand,
    category: PRODUCT_CATEGORIES.includes((category||'').toLowerCase()) ? category.toLowerCase() : 'general',
    model_number,
    purchase_price: parseFloat(purchase_price) || 0,
    unit_price: parseFloat(unit_price) || 0,
    stock_qty: parseFloat(stock_qty) || 0,
    tax_rate: parseFloat(tax_rate) || 18,
    warranty_duration,
    guarantee,
  };
}

function _renderBulkPreview() {
  const body = document.getElementById('bulk-upload-body');
  const footer = document.getElementById('bulk-footer-left');
  const confirmBtn = document.getElementById('bulk-confirm-btn');
  if (!body) return;

  // Check for duplicate SKUs within upload
  const skuMap = {};
  _bulkRows.forEach((r, i) => {
    if (r.sku) {
      const key = r.sku.toLowerCase();
      if (skuMap[key] !== undefined) {
        if (!_bulkErrors[i]) _bulkErrors[i] = [];
        _bulkErrors[i].push(`Duplicate SKU in file (row ${skuMap[key] + 1})`);
      } else {
        skuMap[key] = i;
      }
    }
  });

  const validCount = _bulkRows.filter((_, i) => !_bulkErrors[i]?.length).length;
  const errorCount = _bulkRows.length - validCount;

  if (footer) footer.innerHTML = `
    <span style="color:var(--c-green);font-weight:600">${validCount} valid</span>
    ${errorCount > 0 ? `&nbsp;·&nbsp;<span style="color:var(--c-red);font-weight:600">${errorCount} with errors</span>` : ''}
    &nbsp;·&nbsp;${_bulkRows.length} total rows
  `;

  if (confirmBtn) confirmBtn.style.display = validCount > 0 ? 'flex' : 'none';

  body.innerHTML = `
    <div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-weight:700;font-size:15px">Preview — ${_bulkRows.length} Products</div>
        <div style="font-size:12px;color:var(--c-text3);margin-top:2px">Review and edit rows before uploading. Red rows have errors.</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="_resetBulkUpload()" style="font-size:12px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.4"/></svg>
        Choose Different File
      </button>
    </div>

    ${errorCount > 0 ? `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <div style="font-size:12px;color:#92400e">${errorCount} row(s) have errors and will be skipped. You can edit them below or remove them, then upload.</div>
    </div>` : ''}

    <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--c-border)">
      <table style="width:100%;border-collapse:collapse;min-width:800px;font-size:12px">
        <thead>
          <tr style="background:var(--c-surface2)">
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:var(--c-text2);white-space:nowrap">#</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:var(--c-text2)">Product Name *</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:var(--c-text2)">SKU</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:var(--c-text2)">Brand</th>
            <th style="padding:9px 12px;text-align:left;font-weight:600;color:var(--c-text2)">Category</th>
            <th style="padding:9px 12px;text-align:right;font-weight:600;color:var(--c-text2)">Price (₹) *</th>
            <th style="padding:9px 12px;text-align:right;font-weight:600;color:var(--c-text2)">Stock</th>
            <th style="padding:9px 12px;text-align:right;font-weight:600;color:var(--c-text2)">GST%</th>
            <th style="padding:9px 12px;text-align:center;font-weight:600;color:var(--c-text2)">Status</th>
            <th style="padding:9px 12px;text-align:center;font-weight:600;color:var(--c-text2)">Actions</th>
          </tr>
        </thead>
        <tbody id="bulk-preview-tbody">
          ${_bulkRows.map((r, i) => _renderBulkRow(r, i)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function _renderBulkRow(r, i) {
  const hasError = _bulkErrors[i]?.length > 0;
  const errorMsg = hasError ? _bulkErrors[i].join(', ') : '';
  const rowBg = hasError ? 'background:#fef2f2' : (i % 2 === 0 ? '' : 'background:var(--c-surface2)');

  if (r._editing) {
    return `<tr id="bulk-row-${i}" style="${rowBg}">
      <td style="padding:6px 8px;color:var(--c-text3)">${i + 1}</td>
      <td style="padding:4px 6px"><input class="form-input" style="font-size:12px;padding:5px 8px;min-width:120px" value="${esc(r.name)}" oninput="_bulkUpdateField(${i},'name',this.value)" placeholder="Product Name *"></td>
      <td style="padding:4px 6px"><input class="form-input" style="font-size:12px;padding:5px 8px;font-family:monospace;width:120px" value="${esc(r.sku)}" oninput="_bulkUpdateField(${i},'sku',this.value)" placeholder="Auto"></td>
      <td style="padding:4px 6px"><input class="form-input" style="font-size:12px;padding:5px 8px;width:100px" value="${esc(r.brand)}" oninput="_bulkUpdateField(${i},'brand',this.value)"></td>
      <td style="padding:4px 6px">
        <select class="form-input" style="font-size:12px;padding:5px 8px" onchange="_bulkUpdateField(${i},'category',this.value)">
          ${PRODUCT_CATEGORIES.map(c => `<option value="${c}"${r.category===c?' selected':''}>${c}</option>`).join('')}
        </select>
      </td>
      <td style="padding:4px 6px"><input class="form-input" style="font-size:12px;padding:5px 8px;width:90px;text-align:right" type="number" value="${r.unit_price}" oninput="_bulkUpdateField(${i},'unit_price',this.value)"></td>
      <td style="padding:4px 6px"><input class="form-input" style="font-size:12px;padding:5px 8px;width:70px;text-align:right" type="number" value="${r.stock_qty}" oninput="_bulkUpdateField(${i},'stock_qty',this.value)"></td>
      <td style="padding:4px 6px"><input class="form-input" style="font-size:12px;padding:5px 8px;width:60px;text-align:right" type="number" value="${r.tax_rate}" oninput="_bulkUpdateField(${i},'tax_rate',this.value)"></td>
      <td style="padding:6px;text-align:center">
        <button class="btn btn-primary btn-sm" style="font-size:11px;padding:4px 10px" onclick="_bulkSaveEdit(${i})">Save</button>
      </td>
      <td style="padding:6px;text-align:center">
        <button class="btn btn-ghost btn-sm" style="font-size:11px;color:var(--c-text3)" onclick="_bulkCancelEdit(${i})">✕</button>
      </td>
    </tr>`;
  }

  return `<tr id="bulk-row-${i}" style="${rowBg};transition:background .15s">
    <td style="padding:8px 12px;color:var(--c-text3);font-size:11px">${i + 1}</td>
    <td style="padding:8px 12px">
      <div style="font-weight:600">${esc(r.name) || '<span style="color:#ef4444;font-style:italic">Missing!</span>'}</div>
      ${hasError ? `<div style="font-size:10px;color:#ef4444;margin-top:2px">⚠ ${esc(errorMsg)}</div>` : ''}
    </td>
    <td style="padding:8px 12px;font-family:monospace;color:var(--c-text2)">${esc(r.sku) || '<span style="color:var(--c-text3);font-style:italic;font-family:sans-serif;font-size:11px">Auto</span>'}</td>
    <td style="padding:8px 12px;color:var(--c-text2)">${esc(r.brand) || '—'}</td>
    <td style="padding:8px 12px"><span class="badge badge-neutral" style="text-transform:capitalize;font-size:11px">${esc(r.category)}</span></td>
    <td style="padding:8px 12px;text-align:right;font-weight:600">${r.unit_price > 0 ? '₹' + r.unit_price.toLocaleString('en-IN') : '<span style="color:#ef4444">—</span>'}</td>
    <td style="padding:8px 12px;text-align:right;color:var(--c-text2)">${r.stock_qty}</td>
    <td style="padding:8px 12px;text-align:right;color:var(--c-text2)">${r.tax_rate}%</td>
    <td style="padding:8px 12px;text-align:center">
      ${hasError
        ? '<span style="font-size:11px;color:#ef4444;font-weight:600">⚠ Error</span>'
        : '<span style="font-size:11px;color:#22c55e;font-weight:600">✓ Valid</span>'}
    </td>
    <td style="padding:8px 12px;text-align:center">
      <div style="display:flex;gap:4px;justify-content:center">
        <button class="btn btn-ghost btn-sm" title="Edit row" style="padding:3px 7px;font-size:11px" onclick="_bulkEditRow(${i})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-ghost btn-sm" title="Remove row" style="padding:3px 7px;font-size:11px;color:var(--c-red)" onclick="_bulkRemoveRow(${i})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </td>
  </tr>`;
}

function _bulkEditRow(i) {
  _bulkRows[i]._editing = true;
  _refreshBulkRow(i);
}
function _bulkCancelEdit(i) {
  _bulkRows[i]._editing = false;
  _refreshBulkRow(i);
}
function _bulkSaveEdit(i) {
  _bulkRows[i]._editing = false;
  // Re-validate
  const r = _bulkRows[i];
  const errors = [];
  if (!r.name) errors.push('Product Name is required');
  if (!r.unit_price || r.unit_price <= 0) errors.push('Selling Price must be greater than 0');
  _bulkErrors[i] = errors;
  _refreshBulkRow(i);
  // Refresh counts
  const validCount = _bulkRows.filter((_, j) => !_bulkErrors[j]?.length).length;
  const footer = document.getElementById('bulk-footer-left');
  if (footer) footer.innerHTML = `
    <span style="color:var(--c-green);font-weight:600">${validCount} valid</span>
    ${(_bulkRows.length - validCount) > 0 ? `&nbsp;·&nbsp;<span style="color:var(--c-red);font-weight:600">${_bulkRows.length - validCount} with errors</span>` : ''}
    &nbsp;·&nbsp;${_bulkRows.length} total rows
  `;
  const confirmBtn = document.getElementById('bulk-confirm-btn');
  if (confirmBtn) confirmBtn.style.display = validCount > 0 ? 'flex' : 'none';
}
function _bulkUpdateField(i, field, val) {
  _bulkRows[i][field] = field === 'unit_price' || field === 'stock_qty' || field === 'tax_rate' || field === 'purchase_price'
    ? parseFloat(val) || 0 : val;
}
function _bulkRemoveRow(i) {
  _bulkRows.splice(i, 1);
  _bulkErrors.splice(i, 1);
  _renderBulkPreview();
}
function _refreshBulkRow(i) {
  const tr = document.getElementById(`bulk-row-${i}`);
  if (tr) tr.outerHTML = _renderBulkRow(_bulkRows[i], i);
}

function _resetBulkUpload() {
  _bulkRows = [];
  _bulkErrors = [];
  const body = document.getElementById('bulk-upload-body');
  if (body) body.innerHTML = _bulkUploadStep1HTML();
  const footer = document.getElementById('bulk-footer-left');
  if (footer) footer.textContent = 'Upload a CSV or Excel file to get started';
  const btn = document.getElementById('bulk-confirm-btn');
  if (btn) btn.style.display = 'none';
}

function _bulkShowError(msg) {
  const body = document.getElementById('bulk-upload-body');
  if (body) body.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div style="width:52px;height:52px;border-radius:14px;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#ef4444">Upload Error</div>
      <div style="font-size:13px;color:var(--c-text2);margin-bottom:20px">${esc(msg)}</div>
      <button class="btn btn-secondary btn-sm" onclick="_resetBulkUpload()">Try Again</button>
    </div>`;
}

async function confirmBulkUpload() {
  const validRows = _bulkRows.filter((_, i) => !_bulkErrors[i]?.length);
  if (validRows.length === 0) { toast('No valid rows to upload', 'error'); return; }

  const btn = document.getElementById('bulk-confirm-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:6px"></div>Uploading…'; }

  const body = document.getElementById('bulk-upload-body');
  if (body) body.innerHTML = `
    <div style="padding:30px 20px">
      <div style="font-weight:700;font-size:15px;margin-bottom:20px;text-align:center">Uploading ${validRows.length} Products…</div>
      <div style="background:var(--c-surface2);border-radius:10px;height:12px;overflow:hidden;margin-bottom:10px">
        <div id="bulk-progress-bar" style="height:100%;background:linear-gradient(90deg,var(--c-primary),#6366f1);border-radius:10px;width:0%;transition:width .3s"></div>
      </div>
      <div id="bulk-progress-text" style="text-align:center;font-size:12px;color:var(--c-text3)">0 / ${validRows.length}</div>
    </div>`;

  // Animate progress bar
  let fakeProgress = 0;
  const progressInterval = setInterval(() => {
    fakeProgress = Math.min(fakeProgress + Math.random() * 15, 80);
    const bar = document.getElementById('bulk-progress-bar');
    if (bar) bar.style.width = fakeProgress + '%';
  }, 200);

  try {
    const result = await API.post('/api/products/bulk', { products: validRows });

    clearInterval(progressInterval);
    const bar = document.getElementById('bulk-progress-bar');
    if (bar) bar.style.width = '100%';

    // Refresh product list
    _products = await API.getProducts();

    // Show result
    setTimeout(() => {
      if (body) body.innerHTML = `
        <div style="text-align:center;padding:30px 20px">
          <div style="width:60px;height:60px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div style="font-weight:700;font-size:18px;margin-bottom:8px;color:var(--c-text)">Upload Complete!</div>
          <div style="font-size:14px;color:var(--c-text2);margin-bottom:6px">
            <span style="color:#22c55e;font-weight:700">${result.succeeded}</span> product${result.succeeded !== 1 ? 's' : ''} uploaded successfully
          </div>
          ${result.failed > 0 ? `
          <div style="font-size:13px;color:#ef4444;margin-bottom:16px">${result.failed} failed — <button class="btn btn-ghost btn-sm" style="font-size:12px;color:#ef4444;text-decoration:underline" onclick="_downloadErrorReport(${JSON.stringify(result.failedRows||[])})">Download Error Report</button></div>
          ` : '<div style="font-size:12px;color:var(--c-text3);margin-bottom:16px">All rows processed successfully.</div>'}
          <button class="btn btn-primary" onclick="closeBulkUpload()" style="margin-top:8px">Done</button>
        </div>`;
      const footer = document.getElementById('bulk-footer-left');
      if (footer) footer.innerHTML = '';
      if (btn) btn.style.display = 'none';
      _renderProductsPage(document.querySelector('.page-content'));
    }, 400);
  } catch(e) {
    clearInterval(progressInterval);
    toast('Upload failed: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Upload Products'; }
    _renderBulkPreview();
  }
}

function _downloadErrorReport(failedRows) {
  const lines = ['Row,Product Name,Error'];
  failedRows.forEach(r => lines.push(`${r.row},"${(r.name||'').replace(/"/g,'""')}","${(r.error||'').replace(/"/g,'""')}"`));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bulk-upload-errors.csv';
  a.click();
}

function _downloadBulkTemplate(format) {
  const headers = ['Product Name*','SKU','Brand','Category','Model Number','Purchase Price','Selling Price*','Stock Quantity','GST Rate','Warranty Period','Guarantee'];
  const sample = ['Samsung Galaxy S25','SKU-SAMSUNG-0001','Samsung','electronics','SM-S931B','70000','89000','10','18','12 months','30 days'];

  if (format === 'csv') {
    const csv = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'billflow-product-template.csv';
    a.click();
  } else {
    // Simple Excel via data URI (CSV that Excel can open)
    const tsv = [headers.join('\t'), sample.join('\t')].join('\n');
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'billflow-product-template.xlsx';
    a.click();
  }
}

function closeBulkUpload() {
  const overlay = document.getElementById('bulk-upload-overlay');
  if (overlay) overlay.remove();
}
