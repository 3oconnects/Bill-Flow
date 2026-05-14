// js/pages/expenses.js
let _expenses = [], _expSearch = '', _expCatFilter = 'all', _vendors_exp = [], _expView = 'table';

// Safe registry: avoids embedding JSON in onclick= attributes (breaks on quotes/special chars)
window._expReg = {};
function _expRef(e) {
  const key = 'exp_' + e.id;
  window._expReg[key] = e;
  return key;
}

async function renderExpenses(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  [_expenses, _vendors_exp] = await Promise.all([API.getExpenses(), API.getVendors()]);
  _renderExpenseTable(el);
}

function _expViewToggleHTML() {
  return `
    <div class="view-toggle-bar">
      <button class="view-toggle-btn ${_expView==='table'?'active':''}" title="Table view" onclick="_expView='table';_renderExpenseTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>
      <button class="view-toggle-btn ${_expView==='card'?'active':''}" title="Card view" onclick="_expView='card';_renderExpenseTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      </button>
    </div>`;
}

function _renderExpenseTable(el) {
  document.getElementById('topbar-actions').innerHTML =
    `<button class="btn btn-primary" onclick="openExpenseForm()">${ICONS.plus} Add Expense</button>`;

  const filtered = _expenses.filter(e =>
    (_expCatFilter === 'all' || e.category === _expCatFilter) &&
    (!_expSearch || e.description?.toLowerCase().includes(_expSearch.toLowerCase()) ||
    e.vendor_name?.toLowerCase().includes(_expSearch.toLowerCase()) ||
    e.reference?.toLowerCase().includes(_expSearch.toLowerCase()))
  );
  const total = filtered.reduce((a, e) => a + (e.amount || 0), 0);

  // Register all filtered expenses safely in global registry
  filtered.forEach(e => _expRef(e));

  const emptyState = `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
    <h3>No expenses yet</h3><p>Record business expenses to track spending</p>
  </div>`;

  const colors = ['orange','red','purple','blue','teal','green'];
  const cardGrid = `<div class="card-grid">
    ${filtered.map((e,i) => {
      const key = 'exp_' + e.id;
      return `
      <div class="item-card">
        <div class="item-card-header">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            <div class="item-card-avatar ${colors[i%colors.length]}">&#8377;</div>
            <div style="min-width:0">
              <div class="item-card-title">${esc(e.description)}</div>
              <div class="item-card-sub">${fmtDate(e.date)}</div>
            </div>
          </div>
          <div class="item-card-actions">
            <button class="btn btn-ghost btn-icon btn-sm" title="View details" onclick="viewExpenseDetail('${key}')">${ICONS.eye}</button>
            <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick="openExpenseFormById('${key}')">${ICONS.edit}</button>
            <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteExpense('${e.id}')">${ICONS.trash}</button>
          </div>
        </div>
        <hr class="item-card-divider"/>
        <div class="item-card-fields">
          <div class="item-card-field"><span class="item-card-field-label">Category</span><span class="badge badge-draft">${EXP_CATS[e.category]||e.category||'&mdash;'}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Vendor</span><span class="item-card-field-val">${e.vendor_id ? `<button onclick="navigateToVendor('${e.vendor_id}')" style="background:none;border:none;cursor:pointer;color:var(--c-primary);font-size:inherit;padding:0;font-weight:600;text-decoration:underline;text-underline-offset:2px" title="View vendor profile">${esc(e.vendor_name)}</button>` : '&mdash;'}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Reference</span><span class="item-card-field-val mono">${esc(e.reference||'&mdash;')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">GST</span><span class="item-card-field-val">${e.gst_rate?e.gst_rate+'%':'0%'}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Amount</span><span class="item-card-amount red">${fmt(e.amount, e.currency)}</span></div>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  el.innerHTML = `
    <div class="filter-bar">
      ${searchInput('Search expenses&hellip;', '_expSearchChange', _expSearch)}
      <select class="form-input" style="width:auto" onchange="_expCatFilter=this.value;_renderExpenseTable(document.querySelector('.page-content'))">
        <option value="all">All Categories</option>
        ${Object.entries(EXP_CATS).map(([k,v]) => `<option value="${k}"${_expCatFilter===k?' selected':''}>${v}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      ${_expViewToggleHTML()}
      <span style="font-size:13px;color:var(--c-text2)">${filtered.length} expenses | <strong>${fmt(total)}</strong></span>
    </div>
    ${_expView === 'card'
      ? (filtered.length === 0 ? `<div class="card"><div class="card-body-p0">${emptyState}</div></div>` : cardGrid)
      : `<div class="card"><div class="card-body-p0"><div class="table-wrap">
          ${filtered.length === 0 ? emptyState :
          `<table>
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Vendor</th><th>Reference</th><th>GST</th><th style="text-align:right">Amount</th><th>Actions</th></tr></thead>
            <tbody>
              ${filtered.map(e => {
                const key = 'exp_' + e.id;
                return `<tr>
                  <td>${fmtDate(e.date)}</td>
                  <td><span style="font-weight:500">${esc(e.description)}</span></td>
                  <td><span class="badge badge-draft">${EXP_CATS[e.category] || e.category || '&mdash;'}</span></td>
                  <td>${e.vendor_id ? `<button onclick="navigateToVendor('${e.vendor_id}')" style="background:none;border:none;cursor:pointer;color:var(--c-primary);font-weight:600;padding:0;text-decoration:underline;text-underline-offset:2px;font-size:inherit" title="View vendor profile">${esc(e.vendor_name)}</button>` : '&mdash;'}</td>
                  <td class="mono">${esc(e.reference || '&mdash;')}</td>
                  <td>${e.gst_rate ? e.gst_rate + '%' : '0%'}</td>
                  <td style="text-align:right" class="amt-red">${fmt(e.amount, e.currency)}</td>
                  <td><div class="tbl-actions">
                    <button class="btn btn-ghost btn-icon btn-sm" title="View details" onclick="viewExpenseDetail('${key}')">${ICONS.eye}</button>
                    <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick="openExpenseFormById('${key}')">${ICONS.edit}</button>
                    <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteExpense('${e.id}')">${ICONS.trash}</button>
                  </div></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`}
        </div></div></div>`}`;
}

function _expSearchChange(v) { _expSearch = v; _renderExpenseTable(document.querySelector('.page-content')); }

// Wrapper: look up expense from registry by key, then open form
function openExpenseFormById(key) {
  const e = window._expReg[key];
  openExpenseForm(e || null);
}

function openExpenseForm(e = null) {
  openModal({
    size: 'md', title: e ? 'Edit Expense' : 'Add Expense',
    body: `
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label req">Description</label>
          <input class="form-input" id="ef-desc" value="${esc(e?.description||'')}" placeholder="e.g. AWS Cloud Services"></div>
        <div class="form-group"><label class="form-label req">Amount</label>
          <input class="form-input" id="ef-amount" type="number" step="0.01" min="0" value="${e?.amount||''}" placeholder="0.00"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label req">Date</label>
          <input class="form-input" type="date" id="ef-date" value="${e?.date || today()}"></div>
        <div class="form-group"><label class="form-label">Category</label>
          <select class="form-input" id="ef-category">${EXP_CATS_HTML.replace(`value="${e?.category||'other'}"`, `value="${e?.category||'other'}" selected`)}</select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Vendor</label>
          <select id="ef-vendor" style="display:none">
            <option value="">— No vendor —</option>
            ${_vendors_exp.map(v=>`<option value="${v.id}" data-name="${esc(v.name)}"${e?.vendor_id===v.id?' selected':''}>${esc(v.name)}</option>`).join('')}
          </select>
          <div id="ef-vendor-wrap" style="position:relative">
            <div style="position:relative;display:flex;align-items:center;border:1.5px solid var(--c-border2);border-radius:var(--radius);background:#fff;transition:border-color .15s" id="ef-vendor-inputbox">
              <svg style="position:absolute;left:10px;pointer-events:none;color:#9aa3b2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                id="ef-vendor-search"
                type="text"
                autocomplete="off"
                placeholder="Search or select vendor…"
                style="flex:1;border:none;outline:none;background:transparent;padding:8px 32px 8px 30px;font-size:13px;color:var(--c-text)"
                value="${e && e.vendor_id ? esc(_vendors_exp.find(v=>v.id===e.vendor_id)?.name||'') : ''}"
                onfocus="_sdOpen('ef-vendor')"
                oninput="_sdFilter('ef-vendor',this.value)"
                onkeydown="_sdKey('ef-vendor',event)"
              >
              <svg id="ef-vendor-chevron" style="position:absolute;right:10px;pointer-events:none;color:#9aa3b2;transition:transform .2s" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div id="ef-vendor-list" style="display:none;position:absolute;top:calc(100% + 2px);left:0;right:0;z-index:1000;background:#fff;border:1.5px solid var(--c-primary);border-radius:10px;max-height:220px;overflow-y:auto;box-shadow:0 8px 28px rgba(26,107,232,.15)">
              <div style="padding:8px 10px;border-bottom:1px solid #f0f4f8;position:sticky;top:0;background:#f8fafc">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9aa3b2">${_vendors_exp.length} Vendor${_vendors_exp.length!==1?'s':''} — optional</div>
              </div>
              <div class="sd-opt" data-id="" data-name="" data-key="ef-vendor" style="padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f8f9fb;transition:background .1s;color:#9aa3b2;font-size:13px;font-style:italic">
                <div style="width:30px;height:30px;border-radius:50%;background:#f0f4f8;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">—</div>
                <span class="sd-name">No vendor</span>
              </div>
              ${_vendors_exp.map((v) => {
                const initials = (v.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
                return '<div class="sd-opt" data-id="' + v.id + '" data-name="' + esc(v.name) + '" data-key="ef-vendor" style="padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f8f9fb;transition:background .1s">' +
                  '<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#0a8754,#06b6d4);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">' + initials + '</div>' +
                  '<div style="min-width:0"><div class="sd-name" style="font-size:13px;font-weight:500;color:var(--c-text)">' + esc(v.name) + '</div></div>' +
                  '</div>';
              }).join('')}
              <div class="sd-empty" style="display:none;padding:14px;text-align:center;font-size:12px;color:#9aa3b2">No vendors found</div>
            </div>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Reference / Receipt No.</label>
          <input class="form-input" id="ef-ref" value="${esc(e?.reference||'')}" placeholder="INV-2024-001">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Currency</label>
          <select class="form-input" id="ef-currency">${CURRENCIES.map(c=>`<option value="${c}"${(e?.currency||'INR')===c?' selected':''}>${c}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">GST Rate</label>
          <select class="form-input" id="ef-gst">${GST_HTML.replace(`value="${e?.gst_rate||0}"`, `value="${e?.gst_rate||0}" selected`)}</select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Notes</label>
        <textarea class="form-input" id="ef-notes" rows="2">${esc(e?.notes||'')}</textarea>
      </div>`,
    onSave: async () => {
      const desc = document.getElementById('ef-desc').value.trim();
      const amt = parseFloat(document.getElementById('ef-amount').value);
      const date = document.getElementById('ef-date').value;
      if (!desc) { toast('Description is required', 'error'); return false; }
      if (!amt || amt <= 0) { toast('Valid amount required', 'error'); return false; }
      if (!date) { toast('Date is required', 'error'); return false; }
      const vSel = document.getElementById('ef-vendor');
      const vendor_id = vSel.value || null;
      const selectedOpt = vendor_id ? vSel.querySelector(`option[value="${vendor_id}"]`) : null;
      const vendor_name = selectedOpt ? (selectedOpt.dataset.name || selectedOpt.text || '') : '';
      const data = {
        description: desc, amount: amt, date,
        category: document.getElementById('ef-category').value,
        vendor_id, vendor_name,
        reference: document.getElementById('ef-ref').value.trim(),
        currency: document.getElementById('ef-currency').value,
        gst_rate: parseFloat(document.getElementById('ef-gst').value) || 0,
        notes: document.getElementById('ef-notes').value.trim(),
      };
      if (e) await API.updateExpense(e.id, data);
      else await API.createExpense(data);
      toast(e ? 'Expense updated' : 'Expense recorded');
      _expenses = await API.getExpenses();
      _renderExpenseTable(document.querySelector('.page-content'));
    }
  });
}

async function deleteExpense(id) {
  confirmDel('Delete this expense?', async () => {
    try {
      await API.deleteExpense(id);
      toast('Expense deleted');
      _expenses = await API.getExpenses();
      _renderExpenseTable(document.querySelector('.page-content'));
    } catch(err) { toast(err.message, 'error'); }
  });
}

// ── EXPENSE DETAIL VIEW ──────────────────────────────────────────────────────

function viewExpenseDetail(key) {
  const e = window._expReg[key];
  if (!e) { _openExpenseDetailModal(null); return; }
  _openExpenseDetailModal(e);
}

function _closeExpDetail() {
  const el = document.getElementById('exp-detail-overlay');
  if (el) el.remove();
}

function _openExpenseDetailModal(e) {
  _closeExpDetail();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'exp-detail-overlay';
  overlay.addEventListener('click', ev => { if (ev.target === overlay) _closeExpDetail(); });

  if (!e) {
    overlay.innerHTML = `
      <div class="modal modal-md" style="animation:modalIn .22s cubic-bezier(.4,0,.2,1)">
        <div class="modal-header">
          <div class="modal-title">Expense Details</div>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="_closeExpDetail()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="padding:48px 24px;text-align:center">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-text3)" stroke-width="1.5" width="48" height="48" style="margin-bottom:16px;opacity:.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <div style="font-size:16px;font-weight:600;color:var(--c-text2);margin-bottom:6px">No expense details found</div>
          <div style="font-size:13px;color:var(--c-text3)">The expense record could not be loaded.</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="_closeExpDetail()">Close</button>
        </div>
      </div>`;
    document.getElementById('modal-container').appendChild(overlay);
    return;
  }

  // Store current detail expense — inner buttons read from here (no JSON in onclick attrs)
  window._expDetailCurrent = e;

  const catLabel     = EXP_CATS[e.category] || e.category || '—';
  const amtFormatted = fmt(e.amount, e.currency || 'INR');
  const gstRate      = e.gst_rate ? e.gst_rate + '%' : '0%';
  const gstAmt       = e.gst_rate ? fmt((e.amount || 0) * e.gst_rate / 100, e.currency) : '—';
  const expId        = e.id ? String(e.id).slice(0, 8).toUpperCase() : '—';
  const createdAt    = e.created_at ? fmtDate(e.created_at) : '—';
  const updatedAt    = e.updated_at ? fmtDate(e.updated_at) : '—';
  const createdBy    = e.created_by_name || e.user_name || '—';

  const payMethodMap = { cash:'Cash', card:'Card / Credit Card', upi:'UPI', bank:'Bank Transfer', cheque:'Cheque', other:'Other' };
  const payMethodLabel = e.payment_method ? (payMethodMap[e.payment_method] || e.payment_method) : '—';

  const catColors = { travel:'#1a6be8', food:'#0a8754', office_supplies:'#c97b10', utilities:'#6b3fd4', software:'#0891b2', marketing:'#e8431a', payroll:'#059669', rent:'#7c3aed', equipment:'#b45309', professional_services:'#1d4ed8', insurance:'#0f766e', taxes:'#dc2626', maintenance:'#92400e', other:'#64748b' };
  const avatarBg = catColors[e.category] || '#64748b';
  const initials = catLabel.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  overlay.innerHTML = `
    <div class="modal modal-lg" style="animation:modalIn .22s cubic-bezier(.4,0,.2,1);max-width:680px">

      <div class="modal-header" style="padding:16px 20px;border-bottom:1px solid var(--c-border)">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          <div style="width:40px;height:40px;border-radius:10px;background:${avatarBg};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0">${initials}</div>
          <div style="min-width:0">
            <div style="font-size:15px;font-weight:700;color:var(--c-text);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.description || 'Unnamed Expense')}</div>
            <div style="font-size:12px;color:var(--c-text3);margin-top:2px">ID: <span class="mono" style="color:var(--c-primary);font-weight:600">#${expId}</span></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:12px">
          <button class="btn btn-secondary btn-sm" onclick="_printExpenseDetail()" style="display:flex;align-items:center;gap:5px;font-size:12px">
            ${ICONS.print}<span>Print</span>
          </button>
          <button class="btn btn-primary btn-sm" onclick="_editFromDetail()" style="display:flex;align-items:center;gap:5px;font-size:12px">
            ${ICONS.edit}<span>Edit</span>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="_closeExpDetail()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div class="modal-body" style="padding:0;max-height:calc(100vh - 220px);overflow-y:auto">

        <div style="background:linear-gradient(135deg,var(--c-primary) 0%,#1456c2 100%);padding:18px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div>
            <div style="font-size:11px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:4px">Total Amount</div>
            <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px">${amtFormatted}</div>
            ${e.gst_rate ? `<div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:3px">incl. GST ${gstRate} (${gstAmt})</div>` : ''}
          </div>
          <div style="text-align:right">
            <span style="background:rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:600;padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.25)">${catLabel}</span>
            <div style="font-size:12px;color:rgba(255,255,255,.65);margin-top:8px">${fmtDate(e.date)}</div>
          </div>
        </div>

        <div style="padding:18px 24px 4px;border-bottom:1px solid var(--c-border)">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--c-text3);margin-bottom:12px">Expense Details</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px">
            ${_expDetailField('Expense ID', `<span class="mono" style="color:var(--c-primary)">#${expId}</span>`)}
            ${_expDetailField('Date of Expense', fmtDate(e.date))}
            ${_expDetailField('Category', `<span class="badge badge-draft">${catLabel}</span>`)}
            ${_expDetailField('Amount', `<strong style="color:var(--c-red)">${amtFormatted}</strong>`)}
            ${_expDetailField('Currency', e.currency || 'INR')}
            ${_expDetailField('GST Rate', e.gst_rate ? `${gstRate} <span style="color:var(--c-text3)">(${gstAmt})</span>` : gstRate)}
            ${_expDetailField('Payment Method', payMethodLabel)}
            ${_expDetailField('Invoice / Receipt No.', e.reference ? `<span class="mono">${esc(e.reference)}</span>` : '—')}
          </div>
        </div>

        <div style="padding:16px 24px 4px;border-bottom:1px solid var(--c-border)">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--c-text3);margin-bottom:12px">Related Entities</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px">
            ${e.vendor_id
              ? _expDetailField('Vendor / Supplier', `<button onclick="_navVendorFromDetail('${e.vendor_id}')" style="background:none;border:none;cursor:pointer;color:var(--c-primary);font-weight:600;padding:0;text-decoration:underline;text-underline-offset:2px;font-size:inherit">${esc(e.vendor_name)}</button>`)
              : _expDetailField('Vendor / Supplier', '—')}
            ${_expDetailField('Linked Product', esc(e.product_name || e.linked_product || '—'))}
          </div>
        </div>

        <div style="padding:16px 24px;border-bottom:1px solid var(--c-border)">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--c-text3);margin-bottom:10px">Description / Notes</div>
          ${e.notes
            ? `<div style="font-size:13px;color:var(--c-text);line-height:1.65;background:var(--c-surface2);border-radius:var(--radius);padding:12px 14px;border:1px solid var(--c-border)">${esc(e.notes)}</div>`
            : `<div style="font-size:13px;color:var(--c-text3);font-style:italic">No notes added.</div>`}
        </div>

        <div style="padding:16px 24px;border-bottom:1px solid var(--c-border)">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--c-text3);margin-bottom:10px">Attachment / Receipt Preview</div>
          ${e.attachment_url
            ? `<a href="${esc(e.attachment_url)}" target="_blank" style="display:inline-flex;align-items:center;gap:7px;color:var(--c-primary);font-size:13px;font-weight:500;text-decoration:underline;text-underline-offset:2px">
                ${ICONS.download}<span>View / Download Receipt</span>
              </a>`
            : `<div style="border:2px dashed var(--c-border2);border-radius:var(--radius);padding:18px;text-align:center">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-text3)" stroke-width="1.5" width="28" height="28" style="margin-bottom:6px;opacity:.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div style="font-size:12px;color:var(--c-text3)">No attachment uploaded</div>
              </div>`}
        </div>

        <div style="padding:16px 24px 20px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--c-text3);margin-bottom:12px">Audit Information</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 24px">
            ${_expDetailField('Created By', esc(createdBy))}
            ${_expDetailField('Created Date', createdAt)}
            ${_expDetailField('Last Updated', updatedAt)}
          </div>
        </div>

      </div>

      <div class="modal-footer" style="justify-content:space-between;padding:12px 20px">
        <button class="btn btn-danger btn-sm" onclick="_deleteFromDetail()" style="display:flex;align-items:center;gap:5px;font-size:12px">
          ${ICONS.trash}<span>Delete</span>
        </button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="_closeExpDetail()">Close</button>
          <button class="btn btn-primary" onclick="_editFromDetail()" style="display:flex;align-items:center;gap:5px">
            ${ICONS.edit}<span>Edit Expense</span>
          </button>
        </div>
      </div>

    </div>`;

  document.getElementById('modal-container').appendChild(overlay);
}

// Safe inner-button handlers — read expense from window._expDetailCurrent, never from onclick attrs
function _editFromDetail() {
  const e = window._expDetailCurrent;
  _closeExpDetail();
  if (e) openExpenseForm(e);
}

function _deleteFromDetail() {
  const e = window._expDetailCurrent;
  _closeExpDetail();
  if (e) deleteExpense(e.id);
}

function _navVendorFromDetail(vendorId) {
  _closeExpDetail();
  navigateToVendor(vendorId);
}

function _expDetailField(label, value) {
  return `<div style="padding:0 0 14px">
    <div style="font-size:11px;color:var(--c-text3);margin-bottom:3px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">${label}</div>
    <div style="font-size:13px;color:var(--c-text);font-weight:500">${value || '—'}</div>
  </div>`;
}

function _printExpenseDetail() {
  const e = window._expDetailCurrent;
  if (!e) return;
  const catLabel = EXP_CATS[e.category] || e.category || '—';
  const win = window.open('', '_blank', 'width=700,height=900');
  win.document.write('<!DOCTYPE html><html><head><title>Expense - ' + esc(e.description) + '</title>'
  + '<style>'
  + 'body{font-family:system-ui,sans-serif;margin:0;padding:32px;color:#1a202c;font-size:14px}'
  + 'h1{font-size:22px;margin:0 0 4px}'
  + '.sub{color:#5a6478;font-size:13px;margin-bottom:24px}'
  + '.hero{background:#1a6be8;color:#fff;border-radius:8px;padding:20px 24px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}'
  + '.hero-amt{font-size:26px;font-weight:700}'
  + '.hero-cat{background:rgba(255,255,255,.2);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}'
  + 'table{width:100%;border-collapse:collapse;margin-bottom:20px}'
  + 'td{padding:9px 12px;border-bottom:1px solid #e3e8ef;font-size:13px}'
  + 'td:first-child{color:#5a6478;font-weight:600;width:42%;font-size:12px;text-transform:uppercase;letter-spacing:.04em}'
  + '.section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9aa3b2;margin:20px 0 8px}'
  + '.notes{background:#f9fafb;border:1px solid #e3e8ef;border-radius:6px;padding:12px;font-size:13px;line-height:1.6}'
  + '.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e3e8ef;font-size:11px;color:#9aa3b2;text-align:center}'
  + '@media print{body{padding:20px}}'
  + '</style></head><body>'
  + '<h1>' + esc(e.description || 'Expense') + '</h1>'
  + '<div class="sub">Expense Record &middot; #' + String(e.id||'').slice(0,8).toUpperCase() + '</div>'
  + '<div class="hero"><div><div style="font-size:11px;opacity:.7;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Total Amount</div>'
  + '<div class="hero-amt">' + fmt(e.amount, e.currency) + '</div></div>'
  + '<div style="text-align:right"><span class="hero-cat">' + catLabel + '</span>'
  + '<div style="font-size:12px;opacity:.7;margin-top:8px">' + fmtDate(e.date) + '</div></div></div>'
  + '<div class="section">Expense Details</div>'
  + '<table>'
  + '<tr><td>Expense ID</td><td>#' + String(e.id||'').slice(0,8).toUpperCase() + '</td></tr>'
  + '<tr><td>Date</td><td>' + fmtDate(e.date) + '</td></tr>'
  + '<tr><td>Category</td><td>' + catLabel + '</td></tr>'
  + '<tr><td>Amount</td><td>' + fmt(e.amount, e.currency) + '</td></tr>'
  + '<tr><td>Currency</td><td>' + (e.currency || 'INR') + '</td></tr>'
  + '<tr><td>GST Rate</td><td>' + (e.gst_rate ? e.gst_rate + '%' : '0%') + '</td></tr>'
  + '<tr><td>Invoice / Receipt No.</td><td>' + esc(e.reference || '—') + '</td></tr>'
  + '<tr><td>Vendor / Supplier</td><td>' + esc(e.vendor_name || '—') + '</td></tr>'
  + '<tr><td>Payment Method</td><td>' + (e.payment_method || '—') + '</td></tr>'
  + '</table>'
  + (e.notes ? '<div class="section">Notes</div><div class="notes">' + esc(e.notes) + '</div>' : '')
  + '<div class="footer">Printed from BillFlow Pro &middot; ' + new Date().toLocaleString('en-IN') + '</div>'
  + '<script>window.onload=function(){window.print();}<\/script>'
  + '</body></html>');
  win.document.close();
}
