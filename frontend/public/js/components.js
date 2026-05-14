// js/components.js — Reusable UI components

// ── MODAL ─────────────────────────────────────
let _modalCallback = null;
let _modalSendCallback = null;

function openModal({ size = 'md', title, body, onSave, saveLabel = 'Save', cancelLabel = 'Cancel', hideSave = false, onOpen, onSaveAndSend }) {
  closeModal();
  _modalCallback = onSave;
  _modalSendCallback = onSaveAndSend || null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.innerHTML = `
    <div class="modal modal-${size}">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="closeModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">${cancelLabel}</button>
        ${(!hideSave && onSave) ? `<button class="btn btn-primary" id="modal-save-btn" onclick="_runModalSave()">
          <span id="modal-save-label">${saveLabel}</span>
        </button>` : ''}
        ${onSaveAndSend ? `<button class="btn btn-success" id="modal-save-send-btn" onclick="_runModalSaveAndSend()" style="display:flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          <span id="modal-save-send-label">Save &amp; Send</span>
        </button>` : ''}
      </div>
    </div>`;
  document.getElementById('modal-container').appendChild(overlay);
  setTimeout(() => {
    if (onOpen) onOpen();
    const first = overlay.querySelector('input:not([type=hidden]),select,textarea');
    if (first) first.focus();
  }, 60);
}

async function _runModalSave() {
  if (!_modalCallback) return;
  const btn = document.getElementById('modal-save-btn');
  const lbl = document.getElementById('modal-save-label');
  if (btn) { btn.disabled = true; lbl.innerHTML = `<span class="spinner"></span>`; }
  try {
    const result = await _modalCallback();
    if (result !== false) closeModal();
  } catch(e) {
    toast(e.message || 'Error occurred', 'error');
  } finally {
    if (btn) { btn.disabled = false; lbl.textContent = 'Save'; }
  }
}

async function _runModalSaveAndSend() {
  if (!_modalSendCallback) return;
  const btn = document.getElementById('modal-save-send-btn');
  const lbl = document.getElementById('modal-save-send-label');
  if (btn) { btn.disabled = true; lbl.innerHTML = `<span class="spinner"></span>`; }
  try {
    const result = await _modalSendCallback();
    if (result !== false) closeModal();
  } catch(e) {
    toast(e.message || 'Error occurred', 'error');
  } finally {
    if (btn) { btn.disabled = false; lbl.innerHTML = `Save &amp; Send`; }
  }
}

function closeModal() {
  const el = document.getElementById('modal-overlay');
  if (el) el.remove();
  _modalCallback = null;
  _modalSendCallback = null;
}

// ── ASSET CATALOG (for invoice item picker) ────
const CATALOG_ITEMS = [
  { sku: 'HW-001', name: 'Laptop Pro 2024', category: 'Hardware', price: 85000, tax: 18, hsn: '84713000' },
  { sku: 'HW-002', name: 'Mechanical Keyboard', category: 'Hardware', price: 4500, tax: 18, hsn: '84716060' },
  { sku: 'HW-003', name: 'USB-C Hub (7-Port)', category: 'Hardware', price: 2200, tax: 18, hsn: '84717090' },
  { sku: 'EL-001', name: 'Wireless Earbuds', category: 'Electronics', price: 3800, tax: 18, hsn: '85183000' },
  { sku: 'EL-002', name: '27" 4K Monitor', category: 'Electronics', price: 28000, tax: 18, hsn: '85285910' },
  { sku: 'EL-003', name: 'Webcam HD 1080p', category: 'Electronics', price: 3200, tax: 18, hsn: '85258090' },
  { sku: 'AP-001', name: 'Corporate T-Shirt', category: 'Apparel', price: 650, tax: 5, hsn: '61091000' },
  { sku: 'AP-002', name: 'Branded Cap', category: 'Apparel', price: 450, tax: 5, hsn: '65061000' },
  { sku: 'DG-001', name: 'Software License (Annual)', category: 'Digital', price: 12000, tax: 18, hsn: '99830000' },
  { sku: 'DG-002', name: 'Cloud Storage Plan (1TB)', category: 'Digital', price: 2400, tax: 18, hsn: '99830000' },
  { sku: 'DG-003', name: 'Design Template Pack', category: 'Digital', price: 1800, tax: 18, hsn: '99830000' },
];

// ── ASSET CATALOG (powered by live Products API) ────
// Legacy static items kept as fallback if no products exist
const CATALOG_ITEMS_FALLBACK = [
  { sku: 'HW-001', name: 'Laptop Pro 2024', category: 'hardware', price: 85000, tax: 18, hsn: '84713000' },
  { sku: 'EL-001', name: 'Wireless Earbuds', category: 'electronics', price: 3800, tax: 18, hsn: '85183000' },
  { sku: 'DG-001', name: 'Software License (Annual)', category: 'software', price: 12000, tax: 18, hsn: '99830000' },
];

async function openCatalogPicker(itemId) {
  // Load live products
  let liveProducts = [];
  try { liveProducts = await API.getProducts(); } catch(e) { /* fallback below */ }
  const items = liveProducts.length > 0
    ? liveProducts.filter(p => p.is_active).map(p => ({
        id: p.id, sku: p.sku||p.id, name: p.name, category: p.category||'general',
        price: p.unit_price, tax: p.tax_rate, hsn: p.hsn_code||'',
        brand: p.brand, stock: p.stock_qty, unit: p.unit,
        warranty_type: p.warranty_type, warranty_duration: p.warranty_duration,
        warranty_unit: p.warranty_unit,
        guarantee_type: p.guarantee_type, guarantee_duration: p.guarantee_duration,
        guarantee_unit: p.guarantee_unit,
      }))
    : CATALOG_ITEMS_FALLBACK;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'catalog-picker-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const cats = ['All', ...new Set(items.map(c => c.category).filter(Boolean))];

  overlay.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <div class="modal-title" style="display:flex;align-items:center;gap:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Product Catalog — Pick Item
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="document.getElementById('catalog-picker-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="padding-bottom:0">
        <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
          <div class="search-wrap" style="flex:1;min-width:200px">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="form-input search-input" placeholder="Search by name, SKU, brand…" oninput="window._pickerSearch=this.value;window._renderPickerList()">
          </div>
          <div class="pill-tabs" style="flex-shrink:0">
            ${cats.map((c,i) => `<button class="pill-tab${i===0?' active':''}" onclick="window._pickerCat='${c}';document.querySelectorAll('#catalog-picker-overlay .pill-tab').forEach(b=>b.classList.remove('active'));this.classList.add('active');window._renderPickerList()">${c==='all'?'All':c.charAt(0).toUpperCase()+c.slice(1)}</button>`).join('')}
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Product</th>
              <th>SKU / HSN</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:center">GST%</th>
              <th style="text-align:center">Stock</th>
              <th>Warranty / Guarantee</th>
            </tr></thead>
            <tbody id="cat-picker-body"></tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('catalog-picker-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById('modal-container').appendChild(overlay);

  window._pickerSearch = '';
  window._pickerCat = 'All';
  window._pickerItems = items;
  window._renderPickerList = function() {
    const s = (window._pickerSearch || '').toLowerCase();
    const cat = window._pickerCat || 'All';
    const filtered = window._pickerItems.filter(c => {
      const ms = !s || c.name.toLowerCase().includes(s) || (c.sku||'').toLowerCase().includes(s) || (c.brand||'').toLowerCase().includes(s);
      const mc = cat === 'All' || c.category === cat;
      return ms && mc;
    });
    const tbody = document.getElementById('cat-picker-body');
    if (!tbody) return;
    tbody.innerHTML = filtered.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--c-text3)">No products found</td></tr>`
      : filtered.map(c => {
          const stockColor = c.stock <= 0 ? 'color:#ef4444' : c.stock <= 5 ? 'color:#f59e0b' : 'color:#22c55e';
          const wLabel = c.warranty_type && c.warranty_type !== 'none'
            ? `<div style="display:flex;align-items:center;gap:4px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span style="font-size:11px;color:#3b82f6">${c.warranty_duration} ${c.warranty_unit}</span></div>` : '';
          const gLabel = c.guarantee_type && c.guarantee_type !== 'none'
            ? `<div style="display:flex;align-items:center;gap:4px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span style="font-size:11px;color:#22c55e">${c.guarantee_duration} ${c.guarantee_unit}</span></div>` : '';
          return `<tr class="cat-picker-row" onclick="selectCatalogItem(${itemId},'${esc(c.sku||c.id)}',window._pickerItems)">
            <td>
              <div style="font-weight:600;font-size:13px">${esc(c.name)}</div>
              ${c.brand ? `<div style="font-size:11px;color:var(--c-text3)">${esc(c.brand)}</div>` : ''}
            </td>
            <td>
              <div style="font-family:monospace;font-size:12px">${esc(c.sku||'—')}</div>
              <div style="font-size:11px;color:var(--c-text3)">HSN: ${esc(c.hsn||'—')}</div>
            </td>
            <td style="text-align:right;font-weight:600">${fmt(c.price)}</td>
            <td style="text-align:center;color:var(--c-text2)">${c.tax}%</td>
            <td style="text-align:center">
              ${c.stock !== undefined ? `<span style="font-weight:600;font-size:12px;${stockColor}">${c.stock <= 0 ? 'Out' : c.stock}</span>${c.unit ? `<div style="font-size:10px;color:var(--c-text3)">${esc(c.unit)}</div>` : ''}` : '—'}
            </td>
            <td>
              ${wLabel || gLabel
                ? `<div style="display:flex;flex-direction:column;gap:3px">${wLabel}${gLabel}</div>`
                : `<span style="color:var(--c-text3);font-size:11px">—</span>`}
            </td>
          </tr>`;
        }).join('');
  };
  window._renderPickerList();
}

function selectCatalogItem(itemId, sku, items) {
  const allItems = items || window._pickerItems || [];
  const cat = allItems.find(c => (c.sku || c.id) === sku);
  if (!cat) return;
  const it = _items.find(x => String(x.id) === String(itemId));
  if (!it) return;
  it.desc = cat.name;
  it.hsn = cat.hsn || '';
  it.price = cat.price;
  it.taxRate = cat.tax;
  it.sku = cat.sku || '';
  it.pid = cat.id || '';
  renderItemsTable();
  updateTotals();
  const overlay = document.getElementById('catalog-picker-overlay');
  if (overlay) overlay.remove();
  toast(`"${cat.name}" added from catalog`);
}

// ── INVOICE ITEMS TABLE ───────────────────────
let _items = [];

function initItems(items = []) {
  _items = items.length ? items.map((it, i) => ({
    id: i, desc: it.description || '', hsn: it.hsn_code || '',
    qty: it.quantity || 1, price: it.unit_price || 0, taxRate: it.tax_rate ?? 18,
    sku: it.sku || '', pid: it.product_id || ''
  })) : [{ id: 0, desc: '', hsn: '', qty: 1, price: 0, taxRate: 18, sku: '', pid: '' }];
  renderItemsTable();
  updateTotals();
}

function getItems() {
  return _items.map(it => ({
    description: it.desc, hsn_code: it.hsn, sku: it.sku || '',
    quantity: safeNum(it.qty), unit_price: safeNum(it.price), tax_rate: safeNum(it.taxRate),
    product_id: it.pid || ''
  }));
}

function addItemRow() {
  const id = Date.now();
  _items.push({ id, desc: '', hsn: '', qty: 1, price: 0, taxRate: 18, sku: '', pid: '' });
  renderItemsTable();
  updateTotals();
  document.querySelector(`.item-desc-${id}`)?.focus();
}

function removeItemRow(id) {
  if (_items.length <= 1) { toast('At least one item is required', 'error'); return; }
  _items = _items.filter(x => x.id !== id);
  renderItemsTable();
  updateTotals();
}

function syncItem(id, field, val) {
  const it = _items.find(x => x.id === id);
  if (!it) return;
  it[field] = (field === 'desc' || field === 'hsn' || field === 'sku') ? val : safeNum(val);
  const { total } = calcLine(it.qty, it.price, it.taxRate);
  const el = document.getElementById(`item-amt-${id}`);
  if (el) el.textContent = fmt(total);
  updateTotals();
}

function renderItemsTable() {
  const wrap = document.getElementById('items-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="items-catalog-header">
      <span style="font-size:11px;font-weight:600;color:var(--c-text2)">Line Items</span>
      <button type="button" class="btn btn-ghost btn-sm" onclick="openCatalogPicker(_items[0]?.id)" style="font-size:11px;gap:5px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        Browse Catalog
      </button>
    </div>
    <div class="items-grid">
      <div class="items-head">
        <span>Item / Description</span>
        <span>SKU</span>
        <span>HSN Code</span>
        <span>Qty</span>
        <span>Unit Price (₹)</span>
        <span>Tax %</span>
        <span>Amount</span>
        <span></span>
      </div>
      ${_items.map(it => {
        const { total } = calcLine(it.qty, it.price, it.taxRate);
        return `<div class="item-row">
          <div style="display:flex;align-items:center;border-right:1px solid var(--c-border);position:relative">
            <input class="item-desc-${it.id}" value="${esc(it.desc)}" placeholder="Item description" oninput="syncItem(${it.id},'desc',this.value)" style="flex:1;border:none;min-width:0">
            <button type="button" class="item-catalog-btn" title="Pick from catalog" onclick="openCatalogPicker(${it.id})">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </button>
          </div>
          <input value="${esc(it.sku || '')}" placeholder="SKU" oninput="syncItem(${it.id},'sku',this.value)" style="border-right:1px solid var(--c-border);font-family:monospace;font-size:12px">
          <input value="${esc(it.hsn)}" placeholder="HSN" oninput="syncItem(${it.id},'hsn',this.value)" style="border-right:1px solid var(--c-border)">
          <input type="number" min="0" step="any" value="${it.qty}" oninput="syncItem(${it.id},'qty',this.value)" style="border-right:1px solid var(--c-border)">
          <input type="number" min="0" step="0.01" value="${it.price}" oninput="syncItem(${it.id},'price',this.value)" style="border-right:1px solid var(--c-border)">
          <select oninput="syncItem(${it.id},'taxRate',this.value)" style="border-right:1px solid var(--c-border);padding:7px 6px">${GST_HTML.replace(`value="${it.taxRate}"`, `value="${it.taxRate}" selected`)}</select>
          <div class="item-amount" id="item-amt-${it.id}">${fmt(total)}</div>
          <button class="remove-item" onclick="removeItemRow(${it.id})">✕</button>
        </div>`;
      }).join('')}
    </div>
    <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addItemRow()">
      ${ICONS.plus} Add Line Item
    </button>`;
}

function updateTotals() {
  const discPctEl = document.getElementById('inv-discount-pct');
  const discPct = safeNum(discPctEl?.value || 0);
  let subtotal = 0, taxTotal = 0;
  _items.forEach(it => {
    const { base, tax } = calcLine(it.qty, it.price, it.taxRate);
    subtotal += base; taxTotal += tax;
  });
  const discAmt = subtotal * discPct / 100;
  const total = subtotal - discAmt + taxTotal;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('inv-subtotal-display', fmt(subtotal));
  set('inv-tax-display', fmt(taxTotal));
  set('inv-disc-display', discPct > 0 ? `− ${fmt(discAmt)}` : '—');
  set('inv-total-display', fmt(total));
}

// ── SEARCH INPUT ──────────────────────────────
function searchInput(placeholder, onInput, value = '') {
  return `<div class="search-wrap">
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input class="form-input search-input" placeholder="${esc(placeholder)}" value="${esc(value)}" oninput="${onInput}(this.value)">
  </div>`;
}

// ── CURRENCY SELECT ───────────────────────────
function currencySelect(id, selected = 'INR', label = 'Currency') {
  return `<div class="form-group">
    <label class="form-label">${label}</label>
    <select class="form-input" id="${id}">
      ${CURRENCIES.map(c => `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`).join('')}
    </select>
  </div>`;
}

// ── STATE SELECT ──────────────────────────────
function stateSelect(id, selected = '', label = 'State') {
  return `<div class="form-group">
    <label class="form-label">${label}</label>
    <select class="form-input" id="${id}">
      <option value="">— Select State —</option>
      ${INDIAN_STATES.map(s => `<option value="${esc(s)}"${s === selected ? ' selected' : ''}>${esc(s)}</option>`).join('')}
    </select>
  </div>`;
}
