// js/pages/invoices.js
let _invoices = [], _customers_inv = [], _invStatusFilter = 'all', _invSearch = '', _invView = 'table';

function _invViewToggleHTML() {
  return `
    <div class="view-toggle-bar">
      <button class="view-toggle-btn ${_invView==='table'?'active':''}" title="Table view" onclick="_invView='table';_renderInvoiceTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>
      <button class="view-toggle-btn ${_invView==='card'?'active':''}" title="Card view" onclick="_invView='card';_renderInvoiceTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      </button>
    </div>`;
}

async function renderInvoices(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  [_invoices, _customers_inv] = await Promise.all([API.getInvoices(), API.getCustomers()]);
  _renderInvoiceTable(el);
}

function _invStats() {
  const total = _invoices.length;
  const paid = _invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = _invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
  const overdue = _invoices.filter(i => i.status === 'overdue').length;
  const currency = _invoices[0]?.currency || 'INR';
  return { total, paid, outstanding, overdue, currency };
}

function _renderInvoiceTable(el) {
  document.getElementById('topbar-actions').innerHTML =
    `<div style="display:flex;align-items:center;gap:8px">
      <button class="btn btn-primary" onclick="openInvoiceForm()" style="display:flex;align-items:center;gap:6px">${ICONS.plus} New Invoice</button>
    </div>`;

  const statuses = ['all','draft','sent','paid','overdue','cancelled'];
  const filtered = _invoices.filter(inv =>
    (_invStatusFilter === 'all' || inv.status === _invStatusFilter) &&
    (!_invSearch || inv.number?.toLowerCase().includes(_invSearch.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(_invSearch.toLowerCase()))
  );

  const stats = _invStats();

  el.innerHTML = `
    <!-- ── STATS CARDS ── -->
    <div class="inv-stats-grid">
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Total Invoices</span>
          <div class="inv-stat-row">
            <span class="inv-stat-value">${stats.total}</span>
            <span class="inv-stat-sub">Records</span>
          </div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Collected</span>
          <div class="inv-stat-row">
            <span class="inv-stat-value">${fmt(stats.paid, stats.currency)}</span>
            <span class="inv-stat-sub">Paid</span>
          </div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--orange">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Outstanding</span>
          <div class="inv-stat-row">
            <span class="inv-stat-value">${fmt(stats.outstanding, stats.currency)}</span>
            <span class="inv-stat-sub">Due</span>
          </div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon inv-stat-icon--red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="inv-stat-body">
          <span class="inv-stat-label">Overdue</span>
          <div class="inv-stat-row">
            <span class="inv-stat-value">${stats.overdue}</span>
            <span class="inv-stat-sub">Alerts</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── QUICK POS / SCANNER BANNER (from InvenPiolot Asset Catalog) ── -->
    <div class="inv-quick-pos-banner">
      <div class="inv-quick-pos-glow"></div>
      <div class="inv-quick-pos-left">
        <div class="inv-quick-pos-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
        </div>
        <div>
          <div class="inv-quick-pos-title">Quick Invoice Scanner</div>
          <div class="inv-quick-pos-sub">Scan a barcode or QR code to instantly look up any invoice</div>
        </div>
      </div>
      <div class="inv-quick-pos-actions">
        <button class="btn inv-qpos-btn-scan" onclick="openInvoiceScanner()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
          Scan &amp; Lookup
        </button>
        <button class="btn inv-qpos-btn-new" onclick="openInvoiceForm()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Invoice
        </button>
        <button class="btn inv-qpos-btn-export" onclick="exportInvoicesCSV()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
        <button class="btn" style="background:#7c3aed;color:white;border:none" onclick="openReceiptSearch()">
          🧾 Find Receipt
        </button>
      </div>
    </div>

    <!-- ── FILTER / SEARCH BAR ── -->
    <div class="inv-filter-bar">
      <div class="inv-filter-left">
        <div class="inv-search-wrap">
          <svg class="inv-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            class="inv-search-input"
            type="text"
            placeholder="Search by invoice # or customer…"
            value="${esc(_invSearch)}"
            oninput="_invSearchChange(this.value)"
          >
        </div>
      </div>
      <div class="inv-filter-right" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="pill-tabs">
          ${statuses.map(s => `<button class="pill-tab${_invStatusFilter===s?' active':''}" onclick="_invStatusFilter='${s}';_renderInvoiceTable(document.querySelector('.page-content'))">
            ${s.charAt(0).toUpperCase()+s.slice(1)} (${s==='all'?_invoices.length:_invoices.filter(i=>i.status===s).length})
          </button>`).join('')}
        </div>
        ${_invViewToggleHTML()}
      </div>
    </div>

    <!-- ── INVOICE TABLE / CARD ── -->
    ${_invView === 'card' ? `
      ${filtered.length === 0
        ? `<div class="card"><div class="card-body-p0"><div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>No invoices found</h3><p>${_invSearch ? 'No results' : 'Create your first invoice'}</p>
           </div></div></div>`
        : `<div class="card-grid">
            ${filtered.map((inv,i) => {
              const colors = ['blue','green','orange','purple','teal'];
              return `<div class="item-card">
                <div class="item-card-header">
                  <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
                    <div class="item-card-avatar ${colors[i%colors.length]}">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div style="min-width:0">
                      <div class="item-card-title" style="cursor:pointer;color:var(--c-primary)" onclick="previewInvoice('${inv.id}')">${esc(inv.number)}</div>
                      <div class="item-card-sub">${esc(inv.customer_name)}</div>
                    </div>
                  </div>
                  <div>${statusBadge(inv.status)}</div>
                </div>
                <hr class="item-card-divider"/>
                <div class="item-card-fields">
                  <div class="item-card-field"><span class="item-card-field-label">Invoice Date</span><span class="item-card-field-val">${fmtDate(inv.date)}</span></div>
                  <div class="item-card-field"><span class="item-card-field-label">Due Date</span><span class="item-card-field-val" style="${inv.status==='overdue'?'color:var(--c-red);font-weight:600':''}">${fmtDate(inv.due_date)}</span></div>
                  <div class="item-card-field"><span class="item-card-field-label">Amount</span><span class="item-card-amount">${fmt(inv.total, inv.currency)}</span></div>
                </div>
                <hr class="item-card-divider"/>
                <div class="item-card-actions" style="justify-content:flex-end">
                  <button class="btn btn-ghost btn-icon btn-sm" title="Preview" onclick="previewInvoice('${inv.id}')">${ICONS.eye}</button>
                  ${inv.status === 'draft' ? `
                    <button class="btn btn-primary btn-sm" onclick="sendInvoice('${inv.id}')" style="display:flex;align-items:center;gap:5px;padding:4px 10px;font-size:11px">${ICONS.send} Send</button>
                    <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick="openInvoiceForm('${inv.id}')">${ICONS.edit}</button>
                  ` : ''}
                  ${['sent','overdue'].includes(inv.status) ? `
                    <button class="btn btn-success btn-icon btn-sm" title="Record Payment" onclick="openPaymentModal('${inv.id}')">${ICONS.payment}</button>
                  ` : ''}
                  <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteInvoice('${inv.id}','${esc(inv.number)}')">${ICONS.trash}</button>
                </div>
              </div>`;
            }).join('')}
           </div>`}
    ` : `
    <div class="card">
      <div class="card-body-p0">
        <div class="table-wrap">
          ${filtered.length === 0 ? `<div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>No invoices found</h3><p>${_invSearch ? 'No results' : 'Create your first invoice'}</p>
          </div>` :
          `<table>
            <thead><tr><th>Invoice #</th><th>Customer</th><th>Invoice Date</th><th>Due Date</th><th>Status</th><th>Shipment</th><th style="text-align:right">Amount</th><th>Actions</th></tr></thead>
            <tbody>
              ${filtered.map(inv => `<tr>
                <td><span class="inv-num-link" onclick="previewInvoice('${inv.id}')">${esc(inv.number)}</span></td>
                <td>${esc(inv.customer_name)}</td>
                <td>${fmtDate(inv.date)}</td>
                <td style="${inv.status==='overdue'?'color:var(--c-red);font-weight:500':''}">  ${fmtDate(inv.due_date)}</td>
                <td>${statusBadge(inv.status)}</td>
                <td>${shipmentBadge(inv.shipment_status)}</td>
                <td style="text-align:right;font-weight:600">${fmt(inv.total, inv.currency)}</td>
                <td>
                  <div class="tbl-actions">
                    <button class="btn btn-ghost btn-icon btn-sm" title="Preview" onclick="previewInvoice('${inv.id}')">${ICONS.eye}</button>
                    ${inv.status === 'draft' ? `
                      <button class="btn btn-primary btn-sm" title="Send Invoice" onclick="sendInvoice('${inv.id}')" style="display:flex;align-items:center;gap:5px;padding:4px 10px;font-size:11px">${ICONS.send} Send</button>
                      <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick="openInvoiceForm('${inv.id}')">${ICONS.edit}</button>
                    ` : ''}
                    ${['sent','overdue'].includes(inv.status) ? `
                      <button class="btn btn-success btn-icon btn-sm" title="Record Payment" onclick="openPaymentModal('${inv.id}')">${ICONS.payment}</button>
                    ` : ''}
                    <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteInvoice('${inv.id}','${esc(inv.number)}')">  ${ICONS.trash}</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>`}
        </div>
      </div>
    </div>`}`;
}

function _invSearchChange(v) { _invSearch = v; _renderInvoiceTable(document.querySelector('.page-content')); }

// ── SHARED SEARCHABLE DROPDOWN ENGINE ─────────────────────────
// Each dropdown list has .sd-opt items with data-id, data-name, data-key.
// Selection is handled via delegated mousedown on the list container.
// This avoids inline-handler quoting issues entirely.

function _sdHighlight(text, term) {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) +
    '<mark style="background:#fef3c7;color:#92400e;border-radius:3px;padding:0 2px">' +
    text.slice(idx, idx + term.length) + '</mark>' +
    text.slice(idx + term.length);
}

function _sdOpen(id) {
  const list   = document.getElementById(id + '-list');
  const box    = document.getElementById(id + '-inputbox');
  const chev   = document.getElementById(id + '-chevron');
  const sel    = document.getElementById(id);
  const search = document.getElementById(id + '-search');
  if (!list) return;

  // Attach delegated mousedown once (remove old one first)
  if (list._sdHandler) list.removeEventListener('mousedown', list._sdHandler);
  list._sdHandler = function(ev) {
    ev.preventDefault(); // prevent input blur before selection
    const opt = ev.target.closest('.sd-opt');
    if (!opt) return;
    const key = opt.dataset.key || id;
    _sdSelect(key, opt.dataset.id || '', opt.dataset.name || '');
  };
  list.addEventListener('mousedown', list._sdHandler);

  // Reset: show all items, clear highlights
  list.querySelectorAll('.sd-opt').forEach(opt => {
    opt.style.display = 'flex';
    const nameEl = opt.querySelector('.sd-name');
    if (nameEl) nameEl.innerHTML = nameEl.textContent;
    opt.style.background = opt.dataset.id === (sel ? sel.value : '') ? '#eff6ff' : '';
    delete opt.dataset.focused;
  });
  const emptyEl = list.querySelector('.sd-empty');
  if (emptyEl) emptyEl.style.display = 'none';

  // Clear search box so user sees all options
  if (search && !(sel && sel.value)) search.value = '';

  list.style.display = 'block';
  if (box)  box.style.borderColor  = 'var(--c-primary)';
  if (chev) chev.style.transform   = 'rotate(180deg)';

  // Close on outside click
  const closer = (ev) => {
    const wrap = document.getElementById(id + '-wrap');
    if (wrap && wrap.contains(ev.target)) {
      document.addEventListener('click', closer, { once: true });
    } else {
      _sdClose(id);
    }
  };
  setTimeout(() => document.addEventListener('click', closer, { once: true }), 0);
}

function _sdClose(id) {
  const list   = document.getElementById(id + '-list');
  const box    = document.getElementById(id + '-inputbox');
  const chev   = document.getElementById(id + '-chevron');
  const sel    = document.getElementById(id);
  const search = document.getElementById(id + '-search');
  if (list) { list.style.display = 'none'; }
  if (box)  box.style.borderColor  = '';
  if (chev) chev.style.transform   = '';
  // Restore displayed name to the currently selected value
  if (sel && search) {
    if (sel.value) {
      const opt = sel.querySelector('option[value="' + sel.value + '"]');
      if (opt) search.value = opt.text;
    } else {
      search.value = '';
    }
  }
}

function _sdFilter(id, q) {
  const list = document.getElementById(id + '-list');
  if (!list) return;
  list.style.display = 'block';
  const term = q.trim();
  let count = 0;
  list.querySelectorAll('.sd-opt').forEach(opt => {
    if (!opt.dataset.name && opt.dataset.id === '') {
      // "No vendor" / clear option — always show
      opt.style.display = 'flex';
      count++;
      return;
    }
    const name = opt.dataset.name || '';
    const visible = !term || name.toLowerCase().includes(term.toLowerCase());
    opt.style.display = visible ? 'flex' : 'none';
    if (visible) {
      count++;
      const nameEl = opt.querySelector('.sd-name');
      if (nameEl) nameEl.innerHTML = _sdHighlight(name, term);
    }
  });
  const emptyEl = list.querySelector('.sd-empty');
  if (emptyEl) emptyEl.style.display = count === 0 ? 'block' : 'none';
}

function _sdKey(id, ev) {
  const list = document.getElementById(id + '-list');
  if (!list || list.style.display === 'none') {
    if (ev.key === 'ArrowDown' || ev.key === 'Enter') _sdOpen(id);
    return;
  }
  const opts = [...list.querySelectorAll('.sd-opt')].filter(o => o.style.display !== 'none');
  const cur  = list.querySelector('.sd-opt[data-focused]');
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    const idx = cur ? opts.indexOf(cur) + 1 : 0;
    if (cur) { delete cur.dataset.focused; cur.style.background = ''; }
    if (opts[idx]) { opts[idx].dataset.focused = '1'; opts[idx].style.background = '#eff6ff'; opts[idx].scrollIntoView({ block: 'nearest' }); }
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    const idx = cur ? opts.indexOf(cur) - 1 : opts.length - 1;
    if (cur) { delete cur.dataset.focused; cur.style.background = ''; }
    if (opts[idx]) { opts[idx].dataset.focused = '1'; opts[idx].style.background = '#eff6ff'; opts[idx].scrollIntoView({ block: 'nearest' }); }
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    if (cur) _sdSelect(id, cur.dataset.id || '', cur.dataset.name || '');
  } else if (ev.key === 'Escape') {
    _sdClose(id);
  }
}

function _sdSelect(id, val, label) {
  const sel    = document.getElementById(id);
  const search = document.getElementById(id + '-search');
  if (sel)    sel.value    = val;
  if (search) search.value = label;
  _sdClose(id);
}

// ── EXPORT INVOICES CSV ──────────────────────────
function exportInvoicesCSV() {
  const rows = [['Invoice #','Customer','Date','Due Date','Status','Amount','Currency']];
  _invoices.forEach(inv => {
    rows.push([
      inv.number || '',
      inv.customer_name || '',
      inv.date || '',
      inv.due_date || '',
      inv.status || '',
      (inv.total || 0).toFixed(2),
      inv.currency || 'INR'
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'invoices-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  toast('Invoices exported as CSV');
}

// ── INVOICE SCANNER ────────────────────────────
function openInvoiceScanner() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'invoice-scanner-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px;width:100%">
      <div class="modal-header">
        <div class="modal-title" style="display:flex;align-items:center;gap:8px">
          ${ICONS.scan} Invoice / QR Scanner
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="closeInvoiceScanner()">✕</button>
      </div>
      <div class="modal-body" style="padding:20px">
        <div style="background:#f0f4f8;border-radius:10px;padding:14px;margin-bottom:16px;font-size:12px;color:#5a6478;display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Scan a QR code to instantly view full invoice details, product info, warranty &amp; guarantee.
        </div>
        <div id="inv-qr-reader" style="width:100%;border-radius:10px;overflow:hidden;border:2px solid var(--c-border);min-height:220px;background:#000;display:flex;align-items:center;justify-content:center">
          <div style="color:white;font-size:12px;opacity:0.5">Starting camera…</div>
        </div>

        <!-- ── UPLOAD RECEIPT BUTTON ── -->
        <div style="margin-top:12px;display:flex;gap:8px">
          <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;background:var(--c-surface2);border:2px dashed var(--c-border2);border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;color:var(--c-text2);transition:border-color .15s" onmouseenter="this.style.borderColor='var(--c-primary)'" onmouseleave="this.style.borderColor='var(--c-border2)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Invoice Receipt / QR Image
            <input type="file" accept="image/*" style="display:none" onchange="scanUploadedQRImage(this)">
          </label>
        </div>

        <div style="margin-top:16px">
          <div style="font-size:11px;font-weight:600;color:var(--c-text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Or search by Invoice # or Customer</div>
          <div style="display:flex;gap:8px">
            <input class="form-input" id="scanner-manual-input" placeholder="e.g. INV-0042 or customer name" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();scannerManualSearch(this.value)}" onclick="event.stopPropagation()">
            <button class="btn btn-primary" onclick="scannerManualSearch(document.getElementById('scanner-manual-input').value)">Search</button>
          </div>
        </div>
        <div id="scanner-result" style="margin-top:14px"></div>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeInvoiceScanner(); });
  overlay.querySelector('.modal').addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(overlay);

  // Start QR/barcode scanner
  setTimeout(() => {
    const el = document.getElementById('inv-qr-reader');
    if (!el || typeof Html5Qrcode === 'undefined') return;
    try {
      const scanner = new Html5Qrcode('inv-qr-reader');
      window._invoiceScannerInstance = scanner;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 180 } },
        (decoded) => {
          scanner.pause();
          if (window.navigator?.vibrate) window.navigator.vibrate(150);
          handleScannedQRValue(decoded);
        },
        () => {}
      ).catch(() => {});
    } catch(e) {}
  }, 300);
}

// Handle a scanned/decoded QR value — QR codes now contain only the invoice number
async function handleScannedQRValue(decoded) {
  const resEl = document.getElementById('scanner-result');
  if (!resEl) return;
  resEl.innerHTML = `<div style="text-align:center;padding:14px;color:var(--c-text2);font-size:12px">
    <div class="spinner spin-dark" style="margin:0 auto 8px"></div>Looking up invoice…</div>`;

  const invoiceNumber = decoded.trim();

  // Search locally by invoice number (fast, no network needed)
  const found = _invoices.find(inv =>
    (inv.number || '').toLowerCase() === invoiceNumber.toLowerCase()
  );
  if (found) {
    closeInvoiceScanner();
    previewInvoice(found.id);
    return;
  }

  // Fallback: try server lookup by invoice number via QR endpoint
  try {
    const resp = await fetch(`/api/qr/invoice/${encodeURIComponent(invoiceNumber)}`);
    if (resp.ok) {
      const data = await resp.json();
      showScannerFullResult(data);
      return;
    }
  } catch(e) {}

  if (resEl) resEl.innerHTML = `<div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:10px;font-size:12px;color:#d63d3d">
    No invoice found for: <strong>${esc(invoiceNumber)}</strong></div>`;
  if (window._invoiceScannerInstance) {
    try { window._invoiceScannerInstance.resume(); } catch(e) {}
  }
}

// Show full invoice details including product warranty/guarantee inside scanner
function showScannerFullResult(data) {
  const { invoice, payments, paid_total, balance, org } = data;
  const resEl = document.getElementById('scanner-result');
  if (!resEl) return;

  const warrantyHTML = (invoice.items || []).filter(it => it.product && it.product.warranty_type !== 'none').map(it => {
    const p = it.product;
    return `<div style="border:1px solid var(--c-border);border-radius:8px;padding:10px;margin-top:8px">
      <div style="font-weight:600;font-size:12px;margin-bottom:6px">${esc(it.description)}</div>
      ${p.brand ? `<div style="font-size:11px;color:var(--c-text2)">Brand: <strong>${esc(p.brand)}</strong>${p.model_number ? ' · Model: <strong>' + esc(p.model_number) + '</strong>' : ''}</div>` : ''}
      ${p.warranty_type !== 'none' ? `<div style="font-size:11px;margin-top:4px;display:flex;align-items:center;gap:6px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a8754" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style="color:#0a8754;font-weight:600">Warranty:</span> ${esc(p.warranty_duration)} ${esc(p.warranty_unit)} (${esc(p.warranty_type)})
        ${p.warranty_terms ? `<span style="color:var(--c-text2)">— ${esc(p.warranty_terms)}</span>` : ''}
      </div>` : ''}
      ${p.guarantee_type !== 'none' ? `<div style="font-size:11px;margin-top:4px;display:flex;align-items:center;gap:6px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a6be8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 11 12 14 22 4"/></svg>
        <span style="color:#1a6be8;font-weight:600">Guarantee:</span> ${esc(p.guarantee_duration)} ${esc(p.guarantee_unit)} (${esc(p.guarantee_type)})
        ${p.guarantee_terms ? `<span style="color:var(--c-text2)">— ${esc(p.guarantee_terms)}</span>` : ''}
      </div>` : ''}
    </div>`;
  }).join('');

  resEl.innerHTML = `
    <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:12px;padding:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--c-primary)">${esc(invoice.number)}</div>
          <div style="font-size:11px;color:var(--c-text2)">${esc(invoice.customer_name)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:13px">${fmt(invoice.total, invoice.currency)}</div>
          <div style="font-size:11px;color:${balance > 0 ? '#d63d3d' : '#0a8754'}">${balance > 0 ? 'Balance: ' + fmt(balance) : '✓ Fully Paid'}</div>
        </div>
      </div>

      <!-- Items -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.05em;margin-bottom:6px">Items Purchased</div>
      ${(invoice.items || []).map(it => `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--c-border)">
          <span>${esc(it.description)} <span style="color:var(--c-text2)">× ${it.quantity}</span></span>
          <span style="font-weight:600">${fmt(it.amount, invoice.currency)}</span>
        </div>`).join('')}

      <!-- Warranty / Guarantee -->
      ${warrantyHTML ? `<div style="margin-top:10px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.05em;margin-bottom:4px">Warranty &amp; Guarantee</div>
        ${warrantyHTML}
      </div>` : ''}

      <!-- Payment history -->
      ${payments.length > 0 ? `<div style="margin-top:10px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.05em;margin-bottom:4px">Payments</div>
        ${payments.map(p => `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--c-text2);padding:3px 0">
          <span>${fmtDate(p.date)} · ${p.method.replace(/_/g,' ')}</span>
          <span style="font-weight:600;color:#0a8754">+ ${fmt(p.amount)}</span>
        </div>`).join('')}
      </div>` : ''}

      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="closeInvoiceScanner();previewInvoice('${invoice.id}')">View Full Invoice</button>
      </div>
    </div>`;
}

// Scan a QR code from uploaded image
function scanUploadedQRImage(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const resEl = document.getElementById('scanner-result');
  if (resEl) resEl.innerHTML = `<div style="text-align:center;padding:14px;color:var(--c-text2);font-size:12px">
    <div class="spinner spin-dark" style="margin:0 auto 8px"></div>Scanning image…</div>`;

  if (typeof jsQR === 'undefined') {
    if (resEl) resEl.innerHTML = `<div style="color:#d63d3d;font-size:12px;padding:10px">QR scanner library not loaded.</div>`;
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });
      if (result && result.data) {
        handleScannedQRValue(result.data);
      } else {
        if (resEl) resEl.innerHTML = `<div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:10px;font-size:12px;color:#d63d3d">
          No QR code found. Make sure you are uploading the downloaded QR image.</div>`;
      }
    };
    img.onerror = function() {
      if (resEl) resEl.innerHTML = `<div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:10px;font-size:12px;color:#d63d3d">
        Could not read the image file. Please try again.</div>`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function closeInvoiceScanner() {
  if (window._invoiceScannerInstance) {
    try {
      if (window._invoiceScannerInstance.isScanning) {
        window._invoiceScannerInstance.stop().then(() => {
          window._invoiceScannerInstance.clear();
          window._invoiceScannerInstance = null;
        }).catch(() => {});
      } else {
        window._invoiceScannerInstance.clear();
        window._invoiceScannerInstance = null;
      }
    } catch(e) { window._invoiceScannerInstance = null; }
  }
  const overlay = document.getElementById('invoice-scanner-overlay');
  if (overlay) overlay.remove();
}

function scannerManualSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const res = document.getElementById('scanner-result');
  if (!res || !q) return;
  const found = _invoices.find(inv =>
    inv.number?.toLowerCase().includes(q) ||
    inv.customer_name?.toLowerCase().includes(q)
  );
  if (found) {
    // Fetch full details via QR endpoint
    handleScannedQRValue(found.id);
  } else {
    res.innerHTML = `<div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:10px;font-size:12px;color:#d63d3d">No invoice found matching <strong>${esc(q)}</strong></div>`;
  }
}


// Helper: collects and saves the invoice form. Returns the saved invoice ID or false on validation failure.
async function _saveInvoiceForm(editing) {
  const custSel = document.getElementById('if-customer');
  const customer_id = custSel.value;
  const customer_name = custSel.options[custSel.selectedIndex]?.dataset.name || '';
  const number = document.getElementById('if-number').value.trim();
  const date = document.getElementById('if-date').value;
  const due_date = document.getElementById('if-due').value;
  if (!customer_id) { toast('Please select a customer', 'error'); return false; }
  if (!number) { toast('Invoice number required', 'error'); return false; }
  if (!date || !due_date) { toast('Dates are required', 'error'); return false; }

  const discPct = safeNum(document.getElementById('inv-discount-pct').value);
  const items = getItems();
  let subtotal = 0, taxTotal = 0;
  items.forEach(it => {
    const { base, tax } = calcLine(it.quantity, it.unit_price, it.tax_rate);
    subtotal += base; taxTotal += tax;
  });
  const discAmt = subtotal * discPct / 100;
  const total = subtotal - discAmt + taxTotal;

  const payload = {
    customer_id, customer_name, number, date, due_date,
    currency: document.getElementById('if-currency').value,
    place_of_supply: document.getElementById('if-pos').value,
    items, subtotal, discount_pct: discPct,
    discount_amount: discAmt, tax: taxTotal, total,
    notes: document.getElementById('if-notes').value.trim(),
    terms: document.getElementById('if-terms').value.trim(),
  };

  let savedId;
  if (editing) {
    await API.updateInvoice(editing.id, payload);
    savedId = editing.id;
    toast('Invoice updated');
  } else {
    const created = await API.createInvoice(payload);
    savedId = created?.id || created;
    toast('Invoice created');
  }
  _invoices = await API.getInvoices();
  _renderInvoiceTable(document.querySelector('.page-content'));
  return savedId;
}

async function openInvoiceForm(invId = null) {
  const org = APP.org;
  let editing = null;
  if (invId) {
    editing = await API.getInvoice(invId);
  }
  const nextNum = (org?.inv_prefix || 'INV-') + String(org?.next_inv_no || 1).padStart(4, '0');

  openModal({
    size: 'xl',
    title: editing ? `Edit Invoice — ${editing.number}` : 'New Invoice',
    body: `
      <div class="form-row cols-3">
        <div class="form-group"><label class="form-label req">Customer</label>
          <select id="if-customer" style="display:none">
            <option value="">— Select Customer —</option>
            ${_customers_inv.map(c => `<option value="${c.id}" data-name="${esc(c.name)}"${editing?.customer_id===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}
          </select>
          <div id="if-customer-wrap" style="position:relative">
            <div style="position:relative;display:flex;align-items:center;border:1.5px solid var(--c-border2);border-radius:var(--radius);background:#fff;transition:border-color .15s" id="if-customer-inputbox">
              <svg style="position:absolute;left:10px;pointer-events:none;color:#9aa3b2;flex-shrink:0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                id="if-customer-search"
                type="text"
                autocomplete="off"
                placeholder="Search or select customer…"
                style="flex:1;border:none;outline:none;background:transparent;padding:8px 32px 8px 30px;font-size:13px;color:var(--c-text)"
                value="${editing ? esc(_customers_inv.find(c=>c.id===editing.customer_id)?.name||'') : ''}"
                onfocus="_sdOpen('if-customer')"
                oninput="_sdFilter('if-customer',this.value)"
                onkeydown="_sdKey('if-customer',event)"
              >
              <svg id="if-customer-chevron" style="position:absolute;right:10px;pointer-events:none;color:#9aa3b2;transition:transform .2s" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div id="if-customer-list" style="display:none;position:absolute;top:calc(100% + 2px);left:0;right:0;z-index:1000;background:#fff;border:1.5px solid var(--c-primary);border-radius:10px;max-height:220px;overflow-y:auto;box-shadow:0 8px 28px rgba(26,107,232,.15)">
              <div style="padding:8px 10px;border-bottom:1px solid #f0f4f8;position:sticky;top:0;background:#f8fafc">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9aa3b2">${_customers_inv.length} Customer${_customers_inv.length!==1?'s':''}</div>
              </div>
              ${_customers_inv.map((c) => {
                const initials = (c.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
                return '<div class="sd-opt" data-id="' + c.id + '" data-name="' + esc(c.name) + '" data-key="if-customer" style="padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f8f9fb;transition:background .1s">' +
                  '<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#1a6be8,#6b3fd4);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + initials + '</div>' +
                  '<div style="min-width:0"><div class="sd-name" style="font-size:13px;font-weight:500;color:var(--c-text)">' + esc(c.name) + '</div></div>' +
                  '</div>';
              }).join('')}
              <div class="sd-empty" style="display:none;padding:14px;text-align:center;font-size:12px;color:#9aa3b2">No customers found</div>
            </div>
          </div>
        </div>
        <div class="form-group"><label class="form-label req">Invoice Number</label>
          <input class="form-input" id="if-number" value="${esc(editing?.number || nextNum)}">
        </div>
        <div class="form-group"><label class="form-label">Currency</label>
          <select class="form-input" id="if-currency">${CURRENCIES.map(c=>`<option value="${c}"${(editing?.currency||org?.currency||'INR')===c?' selected':''}>${c}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group"><label class="form-label req">Invoice Date</label>
          <input class="form-input" type="date" id="if-date" value="${editing?.date || today()}">
        </div>
        <div class="form-group"><label class="form-label req">Due Date</label>
          <input class="form-input" type="date" id="if-due" value="${editing?.due_date || addDays(today(), 30)}">
        </div>
        <div class="form-group"><label class="form-label">Place of Supply</label>
          <select class="form-input" id="if-pos"><option value="">— Select State —</option>
            ${INDIAN_STATES.map(s=>`<option value="${esc(s)}"${(editing?.place_of_supply||org?.state||'')===s?' selected':''}>${esc(s)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="items-table-wrap" style="margin-bottom:14px"></div>

      <div style="display:flex;gap:20px;align-items:flex-start">
        <div style="flex:1">
          <div class="form-group"><label class="form-label">Notes (visible to customer)</label>
            <textarea class="form-input" id="if-notes" rows="2">${esc(editing?.notes || org?.default_notes || '')}</textarea>
          </div>
          <div class="form-group"><label class="form-label">Terms & Conditions</label>
            <textarea class="form-input" id="if-terms" rows="2">${esc(editing?.terms || org?.default_terms || '')}</textarea>
          </div>
        </div>
        <div style="min-width:260px">
          <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:var(--radius);padding:14px">
            <div class="total-row"><span class="total-label">Subtotal</span><span id="inv-subtotal-display">₹0.00</span></div>
            <div class="total-row">
              <span class="total-label">Discount <input type="number" id="inv-discount-pct" value="${editing?.discount_pct||0}" min="0" max="100" style="width:44px;border:1px solid var(--c-border2);border-radius:4px;padding:2px 4px;font-size:12px" oninput="updateTotals()"> %</span>
              <span id="inv-disc-display" style="color:var(--c-green)">—</span>
            </div>
            <div class="total-row"><span class="total-label">Tax (GST)</span><span id="inv-tax-display">₹0.00</span></div>
            <div class="total-row grand"><span>Total</span><span id="inv-total-display" style="color:var(--c-primary);font-size:18px">₹0.00</span></div>
          </div>
        </div>
      </div>`,
    onSave: async () => {
      await _saveInvoiceForm(editing);
    },
    onSaveAndSend: async () => {
      const savedId = await _saveInvoiceForm(editing);
      if (savedId === false) return false;
      // Mark as sent
      await API.updateInvStatus(savedId, 'sent');
      toast('Invoice saved and sent to customer!', 'success');
      _invoices = await API.getInvoices();
      _renderInvoiceTable(document.querySelector('.page-content'));
    }
  });

  setTimeout(() => {
    initItems(editing?.items || []);
    updateTotals();
  }, 80);
}

async function sendInvoice(id) {
  if (!confirm('Mark this invoice as Sent?')) return;
  try {
    await API.updateInvStatus(id, 'sent');
    toast('Invoice marked as sent');
    _invoices = await API.getInvoices();
    _renderInvoiceTable(document.querySelector('.page-content'));
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteInvoice(id, num) {
  confirmDel(`Delete invoice ${num}?`, async () => {
    try {
      await API.deleteInvoice(id);
      toast('Invoice deleted');
      _invoices = await API.getInvoices();
      _renderInvoiceTable(document.querySelector('.page-content'));
    } catch(e) { toast(e.message, 'error'); }
  });
}


// ============================================================
// RECEIPT SEARCH by Transaction ID
// ============================================================
async function openReceiptSearch() {
  openModal({
    size: 'sm',
    title: '🔍 Find Receipt by Transaction ID',
    body: `
      <div class="form-group">
        <label class="form-label">Transaction ID</label>
        <input class="form-input" id="rs-txn" placeholder="e.g. TXN-AB12CD34" style="font-family:monospace;font-size:14px;letter-spacing:.05em">
      </div>
      <div id="rs-result"></div>`,
    saveLabel: 'Search',
    onSave: async () => {
      const txn = document.getElementById('rs-txn').value.trim();
      if (!txn) { toast('Enter a Transaction ID', 'error'); return false; }
      const res = document.getElementById('rs-result');
      res.innerHTML = `<div style="text-align:center;padding:16px"><div class="spinner spin-dark" style="margin:0 auto"></div></div>`;
      try {
        const data = await API.searchReceipt(txn);
        const p = data.payment;
        const txnId = 'TXN-' + p.id.replace(/-/g,'').slice(-8).toUpperCase();
        res.innerHTML = `
          <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:8px;padding:14px;font-size:13px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="font-weight:700;color:var(--c-primary);font-size:15px">${txnId}</span>
              <span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">PAID</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--c-text2)">Invoice</span><span>${esc(p.invoice_number)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--c-text2)">Customer</span><span>${esc(p.customer_name)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--c-text2)">Amount Paid</span><span style="font-weight:700;color:var(--c-green)">${fmt(p.amount)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="color:var(--c-text2)">Date</span><span>${fmtDate(p.date)}</span></div>
            <button class="btn btn-primary" style="width:100%" onclick="this.closest('.modal-overlay').remove();previewInvoice('${p.invoice_id}')">View Full Receipt →</button>
          </div>`;
        return false; // keep modal open
      } catch(e) {
        res.innerHTML = `<div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:12px;font-size:13px;color:#d63d3d">❌ ${esc(e.message || 'Transaction not found')}</div>`;
        return false;
      }
    }
  });
}

// ============================================================
// SHIPMENT STATUS HELPERS
// ============================================================
const SHIPMENT_STEPS = ['not_shipped','processing','shipped','delivered'];
const SHIPMENT_LABELS = { not_shipped:'Not Shipped', processing:'Processing', shipped:'Shipped', delivered:'Delivered' };
const SHIPMENT_COLORS = { not_shipped:'#9aa3b2', processing:'#f59e0b', shipped:'#3b82f6', delivered:'#10b981' };

function shipmentBadge(status) {
  const s = status || 'not_shipped';
  const col = SHIPMENT_COLORS[s] || '#9aa3b2';
  return `<span style="background:${col}22;color:${col};border:1px solid ${col}44;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${SHIPMENT_LABELS[s]||s}</span>`;
}

function shipmentProgressBar(status) {
  const cur = SHIPMENT_STEPS.indexOf(status || 'not_shipped');
  return `<div style="display:flex;gap:0;margin:10px 0 6px">
    ${SHIPMENT_STEPS.map((s,i) => {
      const done = i <= cur;
      const col = done ? SHIPMENT_COLORS[s] : 'var(--c-border)';
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:100%;height:4px;background:${col};border-radius:${i===0?'4px 0 0 4px':i===3?'0 4px 4px 0':'0'}"></div>
        <div style="width:10px;height:10px;border-radius:50%;background:${col};margin-top:-7px;border:2px solid var(--c-bg)"></div>
        <div style="font-size:9px;color:${done?col:'var(--c-text3)'};font-weight:${done?'700':'400'};text-transform:uppercase;letter-spacing:.04em;white-space:nowrap">${SHIPMENT_LABELS[s]}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ============================================================
// PREVIEW INVOICE (with Receipt Tab + Shipment Section)
// ============================================================
async function previewInvoice(id) {
  const inv = await API.getInvoice(id);
  const org = APP.org;
  const payments = inv.payments || [];
  const paidTotal = payments.reduce((s,p) => s + p.amount, 0);
  const txnIds = payments.map(p => 'TXN-' + p.id.replace(/-/g,'').slice(-8).toUpperCase());
  const lastPayment = payments[payments.length - 1];
  const shipStatus = inv.shipment_status || 'not_shipped';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'inv-preview-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.innerHTML = `
    <div class="modal modal-xl" style="max-height:92vh;display:flex;flex-direction:column">
      <div class="modal-header" style="flex-shrink:0">
        <div class="modal-title">Invoice — ${esc(inv.number)}</div>
        <div style="display:flex;gap:8px;align-items:center">
          ${['sent','overdue'].includes(inv.status) ? `<button class="btn btn-success btn-sm" onclick="this.closest('.modal-overlay').remove();openPaymentModal('${id}')">${ICONS.payment} Record Payment</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="printInvoice('${id}')">${ICONS.print} Print PDF</button>
          <button class="btn btn-secondary btn-sm" onclick="downloadReceipt('${id}')" title="Download Receipt PDF">🧾 Receipt PDF</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:0;border-bottom:1px solid var(--c-border);flex-shrink:0;padding:0 20px">
        <button class="inv-tab-btn active" id="tab-invoice" onclick="_invTab('invoice')" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid var(--c-primary);font-weight:600;cursor:pointer;font-size:13px;color:var(--c-primary)">📄 Invoice</button>
        <button class="inv-tab-btn" id="tab-receipt" onclick="_invTab('receipt')" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;font-weight:600;cursor:pointer;font-size:13px;color:var(--c-text2)">🧾 Receipt</button>
        <button class="inv-tab-btn" id="tab-shipment" onclick="_invTab('shipment')" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;font-weight:600;cursor:pointer;font-size:13px;color:var(--c-text2)">🚚 Shipment</button>
      </div>

      <div class="modal-body" style="overflow-y:auto;flex:1">

        <!-- ══ TAB: INVOICE ══ -->
        <div id="inv-tab-invoice">
          <div class="inv-preview">
            <div class="inv-preview-header">
              <div>
                <div class="inv-biz-name">${esc(org?.name || 'Business Name')}</div>
                ${org?.address ? `<div style="font-size:12px;color:var(--c-text2);white-space:pre-line;margin-top:3px">${esc(org.address)}</div>` : ''}
                ${org?.gstin ? `<div style="font-size:12px;color:var(--c-text2)">GSTIN: ${esc(org.gstin)}</div>` : ''}
                ${org?.email ? `<div style="font-size:12px;color:var(--c-text2)">${esc(org.email)}</div>` : ''}
                ${org?.phone ? `<div style="font-size:12px;color:var(--c-text2)">${esc(org.phone)}</div>` : ''}
              </div>
              <div style="text-align:right">
                <div class="inv-meta-title">TAX INVOICE</div>
                <div class="inv-meta-num">${esc(inv.number)}</div>
                <div style="font-size:12px;color:var(--c-text2);margin-top:4px">Date: ${fmtDate(inv.date)}</div>
                <div style="font-size:12px;color:var(--c-text2)">Due: ${fmtDate(inv.due_date)}</div>
                <div style="margin-top:6px">${statusBadge(inv.status)}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
              <div>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:4px">BILL TO</div>
                <div style="font-weight:600;font-size:14px">${esc(inv.customer_name)}</div>
                ${inv.customer_phone ? `<div style="font-size:12px;color:var(--c-text2)">📞 ${esc(inv.customer_phone)}</div>` : ''}
                ${inv.customer_email ? `<div style="font-size:12px;color:var(--c-text2)">✉ ${esc(inv.customer_email)}</div>` : ''}
              </div>
              ${inv.place_of_supply ? `<div>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:4px">PLACE OF SUPPLY</div>
                <div style="font-size:13px">${esc(inv.place_of_supply)}</div>
              </div>` : ''}
            </div>

            ${(() => {
              // Collect unique vendors across all items
              const vendorMap = {};
              (inv.items || []).forEach(it => {
                if (it.vendor_id && it.vendor_name && !vendorMap[it.vendor_id]) {
                  vendorMap[it.vendor_id] = it;
                }
              });
              const vendors = Object.values(vendorMap);
              if (vendors.length === 0) return '';
              const allApproved = (inv.items||[]).filter(i=>i.vendor_name).every(i=>i.vendor_approved);
              return `<div style="background:var(--c-bg);border:1px solid var(--c-border);border-radius:10px;padding:14px 16px;margin-bottom:16px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--c-text2)">Vendors on this Invoice</div>
                  <span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:700;background:${allApproved?'rgba(16,185,129,.12)':'rgba(245,158,11,.1)'};color:${allApproved?'#10b981':'#f59e0b'}">
                    ${allApproved ? '✓ All Approved' : '⏳ Awaiting Approval'}
                  </span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:10px">
                  ${vendors.map(it => `
                    <div style="display:flex;align-items:center;gap:8px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:8px;padding:8px 12px;min-width:200px">
                      <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${esc(it.vendor_name?.charAt(0)||'?')}</div>
                      <div>
                        <div style="font-weight:600;font-size:13px">${esc(it.vendor_name)}</div>
                        <div style="font-size:11px;color:var(--c-text2)">Supplier</div>
                      </div>
                    </div>`).join('')}
                </div>
              </div>`;
            })()}

            <div class="table-wrap" style="margin-bottom:16px">
              <table class="inv-table">
                <thead><tr><th>#</th><th>Description</th><th>SKU</th><th>HSN</th><th>Vendor</th><th style="text-align:center">Vendor Approved</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:center">Tax %</th><th style="text-align:right">Amount</th></tr></thead>
                <tbody>
                  ${(inv.items || []).map((it, i) => `<tr>
                    <td style="color:var(--c-text2)">${i + 1}</td>
                    <td><strong>${esc(it.description)}</strong></td>
                    <td class="mono" style="font-size:11px;color:var(--c-primary)">${esc(it.sku || '—')}</td>
                    <td class="mono">${esc(it.hsn_code || '—')}</td>
                    <td style="font-size:12px">
                      ${it.vendor_name
                        ? `<span style="font-weight:500">${esc(it.vendor_name)}</span>`
                        : `<span style="color:var(--c-text2)">—</span>`}
                    </td>
                    <td style="text-align:center">
                      ${it.vendor_name
                        ? `<button onclick="_toggleVendorApproval('${inv.id}','${it.id}',${it.vendor_approved?1:0})"
                            title="${it.vendor_approved ? 'Click to revoke approval' : 'Click to mark vendor approved/shipped'}"
                            style="border:none;background:none;cursor:pointer;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;
                              background:${it.vendor_approved ? 'rgba(16,185,129,.12)' : 'rgba(156,163,175,.1)'};
                              color:${it.vendor_approved ? '#10b981' : '#9ca3af'}">
                            ${it.vendor_approved ? '✓ Approved' : '○ Pending'}
                          </button>`
                        : `<span style="color:var(--c-text2);font-size:11px">—</span>`}
                    </td>
                    <td style="text-align:center">${it.quantity}</td>
                    <td style="text-align:right">${fmt(it.unit_price, inv.currency)}</td>
                    <td style="text-align:center;color:var(--c-text2)">${it.tax_rate}%</td>
                    <td style="text-align:right;font-weight:500">${fmt(it.amount, inv.currency)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>

            <div class="inv-total-section">
              <div style="min-width:260px">
                <div class="total-row"><span class="total-label">Subtotal</span><span>${fmt(inv.subtotal, inv.currency)}</span></div>
                ${inv.discount_amount > 0 ? `<div class="total-row"><span class="total-label">Discount (${inv.discount_pct}%)</span><span class="amt-green">− ${fmt(inv.discount_amount, inv.currency)}</span></div>` : ''}
                <div class="total-row"><span class="total-label">Tax (GST)</span><span>${fmt(inv.tax, inv.currency)}</span></div>
                <div class="total-row grand"><span>Total</span><span style="color:var(--c-primary)">${fmt(inv.total, inv.currency)}</span></div>
                ${paidTotal > 0 ? `<div class="total-row" style="margin-top:8px;border-top:1px solid var(--c-border);padding-top:8px"><span class="total-label">Paid</span><span class="amt-green">${fmt(paidTotal, inv.currency)}</span></div>` : ''}
                ${paidTotal > 0 && paidTotal < inv.total ? `<div class="total-row"><span class="total-label" style="color:var(--c-red)">Balance Due</span><span style="color:var(--c-red);font-weight:700">${fmt(inv.total - paidTotal, inv.currency)}</span></div>` : ''}
              </div>
            </div>

            ${inv.notes ? `<div style="border-top:1px solid var(--c-border);padding-top:14px;margin-top:8px"><strong style="font-size:12px">Notes:</strong><div style="font-size:12px;color:var(--c-text2);margin-top:3px">${esc(inv.notes)}</div></div>` : ''}
            ${inv.terms ? `<div style="padding-top:10px"><strong style="font-size:12px">Terms & Conditions:</strong><div style="font-size:12px;color:var(--c-text2);margin-top:3px">${esc(inv.terms)}</div></div>` : ''}

            <div style="border-top:1px solid var(--c-border);padding-top:16px;margin-top:12px;display:flex;align-items:flex-start;gap:20px">
              <div>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:8px">SCAN FOR DETAILS</div>
                <div id="inv-preview-qr" style="background:#fff;padding:8px;border:1px solid var(--c-border);border-radius:8px;display:inline-block"></div>
                <div style="margin-top:8px">
                  <button class="btn btn-secondary btn-sm" style="font-size:11px;width:100%;display:flex;align-items:center;justify-content:center;gap:5px" onclick="downloadInvoiceQR('${id}')">
                    ⬇ Download QR
                  </button>
                </div>
              </div>
              <div style="padding-top:20px;font-size:11px;color:var(--c-text2)">
                Scan this QR code to instantly view full invoice details, payment status, product warranty &amp; guarantee information.
              </div>
            </div>
          </div>
        </div>

        <!-- ══ TAB: RECEIPT ══ -->
        <div id="inv-tab-receipt" style="display:none">
          ${payments.length === 0 ? `
            <div style="text-align:center;padding:48px 24px;color:var(--c-text2)">
              <div style="font-size:48px;margin-bottom:12px">🧾</div>
              <div style="font-size:16px;font-weight:600;margin-bottom:8px">No Payment Recorded</div>
              <div style="font-size:13px">Record a payment on this invoice to generate a receipt.</div>
              ${['sent','overdue'].includes(inv.status) ? `<button class="btn btn-primary" style="margin-top:16px" onclick="document.getElementById('inv-preview-overlay').remove();openPaymentModal('${id}')">Record Payment</button>` : ''}
            </div>
          ` : (() => {
            const balance = Math.max(0, (inv.total || 0) - paidTotal);
            const isEMI = payments.length > 1;

            // ── COMBINED RECEIPT CARD ────────────────────────────────
            return `<div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:12px;padding:24px;margin-bottom:20px;position:relative;overflow:hidden">
              <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,var(--c-primary),#7c3aed)"></div>

              <!-- Header -->
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
                <div>
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.08em;margin-bottom:4px">${isEMI ? 'EMI Payment Receipt' : 'Payment Receipt'}</div>
                  <div style="font-size:20px;font-weight:800;color:var(--c-primary)">${esc(inv.number)}</div>
                  <div style="font-size:11px;color:var(--c-text2);margin-top:2px">${isEMI ? payments.length + ' instalments recorded' : fmtDate(payments[0].date)}</div>
                </div>
                <div style="text-align:right">
                  ${balance <= 0
                    ? `<span style="background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block">✓ FULLY PAID</span>`
                    : `<span style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block">⏳ PARTIAL</span>`}
                  <div style="margin-top:8px;font-size:11px;color:var(--c-text2)">${esc(inv.customer_name)}</div>
                </div>
              </div>

              <!-- Customer & Invoice info -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;padding:14px;background:var(--c-bg);border-radius:8px;border:1px solid var(--c-border)">
                <div>
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:4px">Customer</div>
                  <div style="font-weight:600">${esc(inv.customer_name)}</div>
                  ${inv.customer_phone ? `<div style="font-size:12px;color:var(--c-text2)">📞 ${esc(inv.customer_phone)}</div>` : ''}
                  ${inv.customer_email ? `<div style="font-size:12px;color:var(--c-text2)">✉ ${esc(inv.customer_email)}</div>` : ''}
                </div>
                <div>
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:4px">Invoice</div>
                  <div style="font-weight:600">${esc(inv.number)}</div>
                  <div style="font-size:12px;color:var(--c-text2)">${fmtDate(inv.date)}</div>
                </div>
              </div>

              <!-- Items Purchased -->
              <div style="margin-bottom:16px">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:8px">Items Purchased</div>
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                  <thead>
                    <tr style="background:var(--c-primary);color:white">
                      <th style="padding:6px 10px;text-align:left;border-radius:6px 0 0 6px">Product</th>
                      <th style="padding:6px 10px;text-align:left">SKU</th>
                      <th style="padding:6px 10px;text-align:left">Vendor</th>
                      <th style="padding:6px 10px;text-align:center">Status</th>
                      <th style="padding:6px 10px;text-align:center">Qty</th>
                      <th style="padding:6px 10px;text-align:right">Price</th>
                      <th style="padding:6px 10px;text-align:right;border-radius:0 6px 6px 0">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(inv.items || []).map((it,i) => `<tr style="border-bottom:1px solid var(--c-border);background:${i%2===0?'var(--c-bg)':'var(--c-surface2)'}">
                      <td style="padding:7px 10px;font-weight:600">${esc(it.description)}</td>
                      <td style="padding:7px 10px;font-family:monospace;font-size:11px;color:var(--c-primary)">${esc(it.sku || '—')}</td>
                      <td style="padding:7px 10px;color:var(--c-text2)">${esc(it.vendor_name || '—')}</td>
                      <td style="padding:7px 10px;text-align:center">
                        ${it.vendor_name
                          ? `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;background:${it.vendor_approved?'rgba(16,185,129,.15)':'rgba(245,158,11,.1)'};color:${it.vendor_approved?'#10b981':'#f59e0b'}">${it.vendor_approved?'✓ Approved':'Pending'}</span>`
                          : '—'}
                      </td>
                      <td style="padding:7px 10px;text-align:center">${it.quantity}</td>
                      <td style="padding:7px 10px;text-align:right">${fmt(it.unit_price, inv.currency)}</td>
                      <td style="padding:7px 10px;text-align:right;font-weight:700">${fmt(it.amount, inv.currency)}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>
              </div>

              <!-- Invoice totals summary -->
              <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
                <div style="min-width:240px">
                  <div class="total-row"><span class="total-label">Subtotal</span><span>${fmt(inv.subtotal, inv.currency)}</span></div>
                  ${inv.discount_amount > 0 ? `<div class="total-row"><span class="total-label">Discount</span><span class="amt-green">−${fmt(inv.discount_amount, inv.currency)}</span></div>` : ''}
                  <div class="total-row"><span class="total-label">GST</span><span>${fmt(inv.tax, inv.currency)}</span></div>
                  <div class="total-row grand"><span>Invoice Total</span><span style="color:var(--c-primary)">${fmt(inv.total, inv.currency)}</span></div>
                </div>
              </div>

              <!-- ── ALL TRANSACTIONS ── -->
              <div style="border-top:2px dashed var(--c-border);padding-top:16px;margin-bottom:16px">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:10px">${isEMI ? '💳 EMI / Instalment Transactions' : '💳 Payment Transaction'}</div>
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                  <thead>
                    <tr style="background:var(--c-bg);border-bottom:2px solid var(--c-border)">
                      <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--c-text3);font-size:10px;text-transform:uppercase;letter-spacing:.05em">#</th>
                      <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--c-text3);font-size:10px;text-transform:uppercase;letter-spacing:.05em">Transaction ID</th>
                      <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--c-text3);font-size:10px;text-transform:uppercase;letter-spacing:.05em">Date</th>
                      <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--c-text3);font-size:10px;text-transform:uppercase;letter-spacing:.05em">Mode</th>
                      <th style="padding:7px 10px;text-align:left;font-weight:700;color:var(--c-text3);font-size:10px;text-transform:uppercase;letter-spacing:.05em">Reference</th>
                      <th style="padding:7px 10px;text-align:right;font-weight:700;color:var(--c-text3);font-size:10px;text-transform:uppercase;letter-spacing:.05em">Amount</th>
                      <th style="padding:7px 10px;text-align:center;font-weight:700;color:var(--c-text3);font-size:10px;text-transform:uppercase;letter-spacing:.05em">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${payments.map((p, idx) => {
                      const txnId = 'TXN-' + p.id.replace(/-/g,'').slice(-8).toUpperCase();
                      const methodLabel = (p.method||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
                      return `<tr style="border-bottom:1px solid var(--c-border);background:${idx%2===0?'var(--c-bg)':'var(--c-surface2)'}">
                        <td style="padding:8px 10px;color:var(--c-text3);font-weight:700">${idx+1}</td>
                        <td style="padding:8px 10px;font-family:monospace;font-size:11px;font-weight:700;color:var(--c-primary)">${txnId}</td>
                        <td style="padding:8px 10px;color:var(--c-text2)">${fmtDate(p.date)}</td>
                        <td style="padding:8px 10px">${esc(methodLabel)}</td>
                        <td style="padding:8px 10px;color:var(--c-text3);font-size:11px">${p.reference ? esc(p.reference) : '—'}</td>
                        <td style="padding:8px 10px;text-align:right;font-weight:700;color:#065f46">${fmt(p.amount, inv.currency)}</td>
                        <td style="padding:8px 10px;text-align:center">
                          <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:3px 8px" onclick="downloadReceiptById('${id}','${p.id}')">⬇ PDF</button>
                        </td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                  <tfoot>
                    <tr style="background:var(--c-primary);color:white">
                      <td colspan="5" style="padding:9px 10px;font-weight:700;border-radius:0 0 0 6px">Total Paid</td>
                      <td style="padding:9px 10px;text-align:right;font-weight:800;font-size:14px">${fmt(paidTotal, inv.currency)}</td>
                      <td style="border-radius:0 0 6px 0"></td>
                    </tr>
                    ${balance > 0 ? `<tr style="background:#fef3c7">
                      <td colspan="5" style="padding:8px 10px;font-weight:700;color:#92400e">Balance Remaining</td>
                      <td style="padding:8px 10px;text-align:right;font-weight:800;color:#92400e">${fmt(balance, inv.currency)}</td>
                      <td></td>
                    </tr>` : `<tr style="background:#d1fae5">
                      <td colspan="7" style="padding:8px 10px;font-weight:700;color:#065f46;text-align:center">✓ Invoice Fully Paid</td>
                    </tr>`}
                  </tfoot>
                </table>
              </div>

              <!-- Footer actions -->
              <div style="display:flex;gap:8px;border-top:1px dashed var(--c-border);padding-top:14px;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" onclick="downloadReceipt('${id}')">⬇ Download Full Receipt PDF</button>
                <div style="flex:1"></div>
                ${balance > 0 && ['sent','overdue'].includes(inv.status) ? `<button class="btn btn-success btn-sm" onclick="document.getElementById('inv-preview-overlay').remove();openPaymentModal('${id}')">+ Record Next Payment</button>` : ''}
              </div>
            </div>`;
          })()}
        </div>

        <!-- ══ TAB: SHIPMENT ══ -->
        <div id="inv-tab-shipment" style="display:none;padding:4px 0">
          <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:12px;padding:24px;margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
              <div>
                <div style="font-size:16px;font-weight:700">Shipment Status</div>
                <div style="font-size:12px;color:var(--c-text2);margin-top:2px">Invoice ${esc(inv.number)} — ${esc(inv.customer_name)}</div>
              </div>
              <div id="shipment-badge-live">${shipmentBadge(shipStatus)}</div>
            </div>

            <!-- Progress bar -->
            <div id="shipment-progress-live">${shipmentProgressBar(shipStatus)}</div>

            <!-- Status selector -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0">
              ${SHIPMENT_STEPS.map(s => {
                const active = s === shipStatus;
                const col = SHIPMENT_COLORS[s];
                return `<button onclick="_setShipStatus('${id}','${s}')" style="padding:14px 8px;border-radius:10px;border:2px solid ${active?col:'var(--c-border)'};background:${active?col+'18':'var(--c-bg)'};cursor:pointer;transition:all .2s;text-align:center">
                  <div style="font-size:20px;margin-bottom:6px">${s==='not_shipped'?'📦':s==='processing'?'⚙️':s==='shipped'?'🚚':'✅'}</div>
                  <div style="font-size:11px;font-weight:${active?'800':'600'};color:${active?col:'var(--c-text2)'}">${SHIPMENT_LABELS[s]}</div>
                </button>`;
              }).join('')}
            </div>

            ${shipStatus !== 'not_shipped' ? `
              <div style="background:var(--c-bg);border:1px solid var(--c-border);border-radius:8px;padding:12px;font-size:12px">
                <div style="display:flex;gap:8px;align-items:center;color:var(--c-text2)">
                  <span>🕐</span>
                  <span>Status last updated ${inv.shipment_confirmed_at ? fmtDate(inv.shipment_confirmed_at.split('T')[0]) : 'recently'}</span>
                </div>
              </div>` : ''}

            ${(shipStatus === 'processing' || shipStatus === 'not_shipped') ? `
              <div style="margin-top:16px">
                <button class="btn btn-primary" onclick="_setShipStatus('${id}','shipped')" style="display:flex;align-items:center;gap:8px">
                  🚚 Confirm Shipment
                </button>
                <div style="font-size:11px;color:var(--c-text2);margin-top:6px">Clicking this marks the order as Shipped and records the confirmation timestamp.</div>
              </div>` : ''}

            ${shipStatus === 'shipped' ? `
              <div style="margin-top:16px">
                <button class="btn btn-success" onclick="_setShipStatus('${id}','delivered')" style="display:flex;align-items:center;gap:8px">
                  ✅ Mark as Delivered
                </button>
              </div>` : ''}
          </div>
        </div>

      </div>
    </div>`;

  document.getElementById('modal-container').appendChild(overlay);

  // Generate QR code — encode only the invoice number so the scanner can find it directly
  setTimeout(() => {
    const qrEl = document.getElementById('inv-preview-qr');
    if (qrEl && typeof QRCode !== 'undefined') {
      new QRCode(qrEl, { text: inv.number, width: 100, height: 100, correctLevel: QRCode.CorrectLevel.M });
    }
  }, 100);
}

// Download the QR code image for the current invoice
function downloadInvoiceQR(invId) {
  const qrEl = document.getElementById("inv-preview-qr");
  if (!qrEl) return;
  const canvas = qrEl.querySelector("canvas");
  const img = qrEl.querySelector("img");
  let dataUrl;
  if (canvas) {
    dataUrl = canvas.toDataURL("image/png");
  } else if (img) {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = img.naturalWidth || img.width;
    tmpCanvas.height = img.naturalHeight || img.height;
    const ctx = tmpCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    ctx.drawImage(img, 0, 0);
    dataUrl = tmpCanvas.toDataURL("image/png");
  } else {
    return;
  }
  const link = document.createElement("a");
  link.href = dataUrl;
  const inv = (_invoices || []).find(i => i.id === invId);
  link.download = "QR-" + (inv ? inv.number : invId) + ".png";
  link.click();
}

// Tab switcher
function _invTab(tab) {
  ['invoice','receipt','shipment'].forEach(t => {
    const el = document.getElementById('inv-tab-' + t);
    const btn = document.getElementById('tab-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
    if (btn) {
      btn.style.borderBottomColor = t === tab ? 'var(--c-primary)' : 'transparent';
      btn.style.color = t === tab ? 'var(--c-primary)' : 'var(--c-text2)';
    }
  });
}

// Update shipment status from modal
async function _setShipStatus(invId, status) {
  try {
    await API.updateShipment(invId, status);
    toast('Shipment status updated: ' + SHIPMENT_LABELS[status], 'success');
    // Refresh the modal
    const overlay = document.getElementById('inv-preview-overlay');
    if (overlay) overlay.remove();
    previewInvoice(invId);
  } catch(e) { toast(e.message, 'error'); }
}

// ============================================================
// DOWNLOAD RECEIPT PDF (opens print window styled as receipt)
// ============================================================
async function downloadReceipt(invId) {
  const inv = await API.getInvoice(invId);
  const payments = inv.payments || [];
  if (!payments.length) { toast('No payment recorded yet', 'error'); return; }
  downloadReceiptById(invId, payments[payments.length-1].id);
}

async function downloadReceiptById(invId, paymentId) {
  const inv = await API.getInvoice(invId);
  const org = APP.org;
  const payments = inv.payments || [];
  const p = payments.find(x => x.id === paymentId) || payments[0];
  if (!p) { toast('Payment not found', 'error'); return; }
  const txnId = 'TXN-' + p.id.replace(/-/g,'').slice(-8).toUpperCase();
  const methodLabel = (p.method||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${txnId}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;padding:32px;color:#111;font-size:13px;max-width:680px;margin:0 auto}
.stripe{height:6px;background:linear-gradient(90deg,#1a6be8,#7c3aed);border-radius:4px;margin-bottom:24px}
.header{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:20px;border-bottom:1px dashed #e3e8ef}
.txn-id{font-size:22px;font-weight:800;letter-spacing:.08em;color:#1a6be8;font-family:monospace}
.paid-badge{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700}
.section-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9aa3b2;margin-bottom:4px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e3e8ef}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#1a6be8;color:white;padding:7px 10px;text-align:left;font-size:11px;font-weight:600}
th:last-child{text-align:right}
td{padding:7px 10px;border-bottom:1px solid #e3e8ef;font-size:12px}
td:last-child{text-align:right;font-weight:600}
.totals{display:flex;justify-content:flex-end}
.total-tbl{min-width:220px}
.t-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}
.t-grand{font-weight:800;font-size:14px;border-top:2px solid #111;margin-top:4px;padding-top:6px}
.paid-row{background:#d1fae533;border-radius:6px;padding:6px 8px;display:flex;justify-content:space-between;font-weight:800;color:#065f46;font-size:14px;margin-top:6px}
.footer{margin-top:20px;padding-top:12px;border-top:1px dashed #e3e8ef;font-size:10px;color:#9aa3b2;text-align:center}
@media print{body{padding:16px}}
</style></head><body>
<div class="stripe"></div>
<div class="header">
  <div>
    <div class="section-label">Payment Receipt</div>
    <div class="txn-id">${txnId}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:4px">${fmtDate(p.date)} &middot; ${new Date(p.created_at||p.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
  </div>
  <div style="text-align:right">
    <div class="paid-badge">✓ PAID</div>
    <div style="margin-top:8px;font-size:11px;color:#6b7280">Mode: ${methodLabel}</div>
    ${p.reference ? `<div style="font-size:10px;color:#9aa3b2">Ref: ${esc(p.reference)}</div>` : ''}
  </div>
</div>

<div class="info-grid">
  <div>
    <div class="section-label">Customer</div>
    <div style="font-weight:700">${esc(inv.customer_name)}</div>
    ${inv.customer_phone ? `<div style="font-size:11px;color:#6b7280">📞 ${esc(inv.customer_phone)}</div>` : ''}
    ${inv.customer_email ? `<div style="font-size:11px;color:#6b7280">✉ ${esc(inv.customer_email)}</div>` : ''}
  </div>
  <div>
    <div class="section-label">Invoice</div>
    <div style="font-weight:700">${esc(inv.number)}</div>
    <div style="font-size:11px;color:#6b7280">${fmtDate(inv.date)}</div>
  </div>
</div>

<div class="section-label" style="margin-bottom:8px">Items Purchased</div>
<table>
  <thead><tr>
    <th>Product</th><th>SKU</th><th>Vendor</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>
    ${(inv.items||[]).map((it,i)=>`<tr style="background:${i%2?'#f8fafc':'white'}">
      <td style="font-weight:600">${esc(it.description)}</td>
      <td style="font-family:monospace;font-size:11px;color:#1a6be8">${esc(it.sku||'—')}</td>
      <td style="color:#6b7280">${esc(it.vendor_name||'—')}</td>
      <td style="text-align:center">${it.quantity}</td>
      <td style="text-align:right">${fmt(it.unit_price,inv.currency)}</td>
      <td style="text-align:right;font-weight:700">${fmt(it.amount,inv.currency)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="totals">
  <div class="total-tbl">
    <div class="t-row"><span style="color:#6b7280">Subtotal</span><span>${fmt(inv.subtotal,inv.currency)}</span></div>
    ${inv.discount_amount>0?`<div class="t-row"><span style="color:#6b7280">Discount</span><span style="color:#0a8754">−${fmt(inv.discount_amount,inv.currency)}</span></div>`:''}
    <div class="t-row"><span style="color:#6b7280">GST</span><span>${fmt(inv.tax,inv.currency)}</span></div>
    <div class="t-row t-grand"><span>Invoice Total</span><span style="color:#1a6be8">${fmt(inv.total,inv.currency)}</span></div>
    <div class="paid-row"><span>Amount Paid</span><span>${fmt(p.amount,inv.currency)}</span></div>
  </div>
</div>

<div class="footer">
  ${esc(org?.name||'')} &middot; ${org?.email||''} &middot; ${org?.phone||''}<br>
  Generated by BillFlow &middot; This is a computer-generated receipt and does not require a signature.
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},600)}<\/script>
</body></html>`);
  w.document.close();
}

async function openPaymentModal(invoiceId) {
  const inv = await API.getInvoice(invoiceId);
  const payments = inv.payments || [];
  const paidSoFar = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, (inv.total || 0) - paidSoFar);

  openModal({
    size: 'sm', title: `Record Payment — ${inv.number}`,
    body: `
      <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:6px;padding:12px;margin-bottom:16px;font-size:13px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--c-text2)">Invoice Total</span><strong>${fmt(inv.total, inv.currency)}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--c-text2)">Paid So Far</span><span class="amt-green">${fmt(paidSoFar)}</span></div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid var(--c-border);padding-top:4px;margin-top:4px"><span style="font-weight:600">Balance Due</span><span class="amt-red" style="font-weight:700">${fmt(remaining)}</span></div>
      </div>
      <div class="form-group"><label class="form-label req">Amount Received</label>
        <input class="form-input" id="pf-amount" type="number" step="0.01" min="0" value="${remaining.toFixed(2)}">
      </div>
      <div class="form-group"><label class="form-label req">Payment Date</label>
        <input class="form-input" type="date" id="pf-date" value="${today()}">
      </div>
      <div class="form-group"><label class="form-label">Mode of Payment</label>
        <select class="form-input" id="pf-method">
          ${['cash','upi','card','bank_transfer','cheque','online'].map(m=>`<option value="${m}">${m==='upi'?'UPI':m==='card'?'Card (Credit/Debit)':m.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Reference / Manual TXN ID</label>
        <input class="form-input" id="pf-ref" placeholder="UTR / UPI Ref / Cheque No. (optional)">
      </div>
      <div class="form-group"><label class="form-label">Notes</label>
        <textarea class="form-input" id="pf-notes" rows="2"></textarea>
      </div>
      <div style="background:linear-gradient(135deg,#eff6ff,#f5f3ff);border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;font-size:12px;display:flex;align-items:center;gap:10px">
        <div style="font-size:20px">🔑</div>
        <div>
          <div style="font-weight:700;color:var(--c-primary);margin-bottom:1px">Auto-generated Transaction ID</div>
          <div style="color:var(--c-text2)">A unique <strong>TXN-XXXXXXXX</strong> ID will be created. Use it to look up this receipt anytime.</div>
        </div>
      </div>`,
    onSave: async () => {
      const amount = parseFloat(document.getElementById('pf-amount').value);
      const date = document.getElementById('pf-date').value;
      if (!amount || amount <= 0) { toast('Valid amount required', 'error'); return false; }
      if (!date) { toast('Date required', 'error'); return false; }
      const result = await API.createPayment({
        invoice_id: invoiceId, amount, date,
        currency: inv.currency || 'INR',
        method: document.getElementById('pf-method').value,
        reference: document.getElementById('pf-ref').value.trim(),
        notes: document.getElementById('pf-notes').value.trim(),
      });
      const txnId = result?.id ? 'TXN-' + result.id.replace(/-/g,'').slice(-8).toUpperCase() : '';
      toast(`Payment recorded${txnId ? ' · ' + txnId : ''}`, 'success');
      _invoices = await API.getInvoices();
      _renderInvoiceTable(document.querySelector('.page-content'));
      // Auto-open the receipt tab
      if (result?.id) setTimeout(() => previewInvoice(invoiceId), 400);
    }
  });
}

// ── VENDOR APPROVAL TOGGLE ────────────────────────────────────────────────────
async function _toggleVendorApproval(invId, itemId, currentlyApproved) {
  const newApproved = currentlyApproved ? 0 : 1;
  try {
    await API.setItemVendorApproval(invId, itemId, newApproved);
    toast(newApproved ? '✓ Vendor marked as approved/shipped' : 'Approval revoked', newApproved ? 'success' : '');
    // Refresh invoice cache and re-open preview
    _invoices = await API.getInvoices();
    // Re-open the invoice preview on the invoice tab
    const overlay = document.getElementById('inv-preview-overlay');
    if (overlay) overlay.remove();
    setTimeout(() => previewInvoice(invId), 100);
  } catch(e) {
    toast(e.message || 'Could not update approval', 'error');
  }
}
