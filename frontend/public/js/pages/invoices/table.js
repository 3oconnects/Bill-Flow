// js/pages/invoices/table.js
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

    <!-- ── QUICK POS / SCANNER BANNER ── -->
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
        <button class="btn inv-qpos-btn-scan" onclick="openInvoiceScanner()">${ICONS.scan} Scan &amp; Lookup</button>
        <button class="btn inv-qpos-btn-new" onclick="openInvoiceForm()">${ICONS.plus} New Invoice</button>
        <button class="btn inv-qpos-btn-export" onclick="exportInvoicesCSV()">${ICONS.export} Export CSV</button>
        <button class="btn" style="background:#7c3aed;color:white;border:none" onclick="openReceiptSearch()">🧾 Find Receipt</button>
      </div>
    </div>

    <!-- ── FILTER / SEARCH BAR ── -->
    <div class="inv-filter-bar">
      <div class="inv-filter-left">
        <div class="inv-search-wrap">
          <svg class="inv-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="inv-search-input" type="text" placeholder="Search by invoice # or customer…" value="${esc(_invSearch)}" oninput="_invSearchChange(this.value)">
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
    ${_invView === 'card' ? _renderInvoiceCards(filtered) : _renderInvoiceTableHTML(filtered)}
  `;
}

function _renderInvoiceCards(filtered) {
  if (filtered.length === 0) return `<div class="card"><div class="card-body-p0"><div class="empty-state">${ICONS.file} <h3>No invoices found</h3><p>${_invSearch ? 'No results' : 'Create your first invoice'}</p></div></div></div>`;
  return `<div class="card-grid">
    ${filtered.map((inv, i) => {
      const colors = ['blue','green','orange','purple','teal'];
      return `<div class="item-card">
        <div class="item-card-header">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            <div class="item-card-avatar ${colors[i%colors.length]}">${ICONS.file}</div>
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
          ${['sent','overdue'].includes(inv.status) ? `<button class="btn btn-success btn-icon btn-sm" title="Record Payment" onclick="openPaymentModal('${inv.id}')">${ICONS.payment}</button>` : ''}
          <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteInvoice('${inv.id}','${esc(inv.number)}')">${ICONS.trash}</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function _renderInvoiceTableHTML(filtered) {
  if (filtered.length === 0) return `<div class="card"><div class="card-body-p0"><div class="empty-state">${ICONS.file} <h3>No invoices found</h3><p>${_invSearch ? 'No results' : 'Create your first invoice'}</p></div></div></div>`;
  return `
    <div class="card">
      <div class="card-body-p0">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Invoice #</th><th>Customer</th><th>Invoice Date</th><th>Due Date</th><th>Status</th><th>Shipment</th><th style="text-align:right">Amount</th><th>Actions</th></tr></thead>
            <tbody>
              ${filtered.map(inv => `<tr>
                <td><span class="inv-num-link" onclick="previewInvoice('${inv.id}')">${esc(inv.number)}</span></td>
                <td>${esc(inv.customer_name)}</td>
                <td>${fmtDate(inv.date)}</td>
                <td style="${inv.status==='overdue'?'color:var(--c-red);font-weight:500':''}">${fmtDate(inv.due_date)}</td>
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
                    ${['sent','overdue'].includes(inv.status) ? `<button class="btn btn-success btn-icon btn-sm" title="Record Payment" onclick="openPaymentModal('${inv.id}')">${ICONS.payment}</button>` : ''}
                    <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteInvoice('${inv.id}','${esc(inv.number)}')">${ICONS.trash}</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}
