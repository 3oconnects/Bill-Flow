// js/pages/invoices/base.js
let _invoices = [], _customers_inv = [], _invStatusFilter = 'all', _invSearch = '', _invView = 'table';

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

function _invSearchChange(v) { 
  _invSearch = v; 
  _renderInvoiceTable(document.querySelector('.page-content')); 
}

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
