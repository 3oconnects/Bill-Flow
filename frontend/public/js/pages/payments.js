// js/pages/payments.js
let _payments = [], _paySearch = '', _payView = 'table';

function _txnId(id) {
  return 'TXN-' + (id || '').replace(/-/g, '').slice(-8).toUpperCase();
}

async function renderPayments(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  _payments = await API.getPayments();
  _renderPaymentTable(el);
}

function _payViewToggleHTML() {
  return `
    <div class="view-toggle-bar">
      <button class="view-toggle-btn ${_payView==='table'?'active':''}" title="Table view" onclick="_payView='table';_renderPaymentTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>
      <button class="view-toggle-btn ${_payView==='card'?'active':''}" title="Card view" onclick="_payView='card';_renderPaymentTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      </button>
    </div>`;
}

function _renderPaymentTable(el) {
  document.getElementById('topbar-actions').innerHTML = '';
  const filtered = _payments.filter(p =>
    !_paySearch || (p.invoice_number || '').toLowerCase().includes(_paySearch.toLowerCase()) ||
    (p.customer_name || '').toLowerCase().includes(_paySearch.toLowerCase()) ||
    (p.reference || '').toLowerCase().includes(_paySearch.toLowerCase()) ||
    _txnId(p.id).toLowerCase().includes(_paySearch.toLowerCase())
  );
  const total = filtered.reduce((a, p) => a + (p.amount || 0), 0);

  const emptyState = `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    <h3>No payments yet</h3><p>Payments appear here when recorded against invoices</p>
  </div>`;

  const cardGrid = `<div class="card-grid">
    ${filtered.map((p,i) => {
      const colors = ['green','blue','teal','purple','orange'];
      const method = (p.method||'').replace(/_/g,' ');
      return `
      <div class="item-card">
        <div class="item-card-header">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            <div class="item-card-avatar ${colors[i%colors.length]}">₹</div>
            <div style="min-width:0">
              <div class="item-card-title">${esc(p.customer_name||'—')}</div>
              <div class="item-card-sub"><span class="mono" style="background:var(--c-primary-lt);color:var(--c-primary);padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700">${_txnId(p.id)}</span></div>
            </div>
          </div>
          <div class="item-card-actions">
            <button class="btn btn-danger btn-icon btn-sm" onclick="deletePayment('${p.id}')" title="Delete">${ICONS.trash}</button>
          </div>
        </div>
        <hr class="item-card-divider"/>
        <div class="item-card-fields">
          <div class="item-card-field"><span class="item-card-field-label">Date</span><span class="item-card-field-val">${fmtDate(p.date)}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Invoice</span><span class="item-card-field-val" style="cursor:pointer;color:var(--c-primary)" onclick="navigateTo('invoices')">${esc(p.invoice_number||'—')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Method</span><span class="item-card-field-val" style="text-transform:capitalize">${method||'—'}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Reference</span><span class="item-card-field-val mono">${esc(p.reference||'—')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Amount</span><span class="item-card-amount green">${fmt(p.amount, p.currency)}</span></div>
        </div>
      </div>`}).join('')}
  </div>`;

  el.innerHTML = `
    <div class="filter-bar">
      ${searchInput('Search by invoice, customer, reference, TXN ID…', '_paySearchChange', _paySearch)}
      <div class="spacer"></div>
      ${_payViewToggleHTML()}
      <span style="font-size:13px;color:var(--c-text2)">${filtered.length} payments | Total: <strong>${fmt(total)}</strong></span>
    </div>
    ${_payView === 'card'
      ? (filtered.length === 0 ? `<div class="card"><div class="card-body-p0">${emptyState}</div></div>` : cardGrid)
      : `<div class="card"><div class="card-body-p0"><div class="table-wrap">
          ${filtered.length === 0 ? emptyState :
          `<table>
            <thead><tr><th>Transaction ID</th><th>Date</th><th>Invoice</th><th>Customer</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th><th>Actions</th></tr></thead>
            <tbody>
              ${filtered.map(p => `<tr>
                <td><span class="mono" style="background:var(--c-primary-lt);color:var(--c-primary);padding:2px 7px;border-radius:4px;font-size:11.5px;font-weight:700;letter-spacing:.04em;white-space:nowrap">${_txnId(p.id)}</span></td>
                <td>${fmtDate(p.date)}</td>
                <td><span class="inv-num-link" onclick="navigateTo('invoices')">${esc(p.invoice_number || '—')}</span></td>
                <td>${esc(p.customer_name || '—')}</td>
                <td style="text-transform:capitalize">${(p.method || '').replace(/_/g, ' ')}</td>
                <td class="mono">${esc(p.reference || '—')}</td>
                <td style="text-align:right" class="amt-green">${fmt(p.amount, p.currency)}</td>
                <td><div class="tbl-actions">
                  <button class="btn btn-danger btn-icon btn-sm" onclick="deletePayment('${p.id}')" title="Delete">${ICONS.trash}</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>`}
        </div></div></div>`}`;
}

function _paySearchChange(v) { _paySearch = v; _renderPaymentTable(document.querySelector('.page-content')); }

async function deletePayment(id) {
  confirmDel('Delete this payment record?', async () => {
    try {
      await API.deletePayment(id);
      toast('Payment deleted');
      _payments = await API.getPayments();
      _renderPaymentTable(document.querySelector('.page-content'));
    } catch(e) { toast(e.message, 'error'); }
  });
}
