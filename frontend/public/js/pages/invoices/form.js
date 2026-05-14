// js/pages/invoices/form.js
async function openInvoiceForm(invId = null) {
  const org = APP.org;
  let editing = null;
  if (invId) editing = await API.getInvoice(invId);
  const nextNum = (org?.inv_prefix || 'INV-') + String(org?.next_inv_no || 1).padStart(4, '0');

  openModal({
    size: 'xl', title: editing ? `Edit Invoice — ${editing.number}` : 'New Invoice',
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
              <input id="if-customer-search" type="text" autocomplete="off" placeholder="Search or select customer…" style="flex:1;border:none;outline:none;background:transparent;padding:8px 32px 8px 30px;font-size:13px;color:var(--c-text)" value="${editing ? esc(_customers_inv.find(c=>c.id===editing.customer_id)?.name||'') : ''}" onfocus="_sdOpen('if-customer')" oninput="_sdFilter('if-customer',this.value)" onkeydown="_sdKey('if-customer',event)">
              <svg id="if-customer-chevron" style="position:absolute;right:10px;pointer-events:none;color:#9aa3b2;transition:transform .2s" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div id="if-customer-list" style="display:none;position:absolute;top:calc(100% + 2px);left:0;right:0;z-index:1000;background:#fff;border:1.5px solid var(--c-primary);border-radius:10px;max-height:220px;overflow-y:auto;box-shadow:0 8px 28px rgba(26,107,232,.15)">
              <div style="padding:8px 10px;border-bottom:1px solid #f0f4f8;position:sticky;top:0;background:#f8fafc"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9aa3b2">${_customers_inv.length} Customers</div></div>
              ${_customers_inv.map(c => `<div class="sd-opt" data-id="${c.id}" data-name="${esc(c.name)}" data-key="if-customer" style="padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #f8f9fb;transition:background .1s"><div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#1a6be8,#6b3fd4);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${esc(c.name[0].toUpperCase())}</div><div style="min-width:0"><div class="sd-name" style="font-size:13px;font-weight:500;color:var(--c-text)">${esc(c.name)}</div></div></div>`).join('')}
              <div class="sd-empty" style="display:none;padding:14px;text-align:center;font-size:12px;color:#9aa3b2">No customers found</div>
            </div>
          </div>
        </div>
        <div class="form-group"><label class="form-label req">Invoice Number</label><input class="form-input" id="if-number" value="${esc(editing?.number || nextNum)}"></div>
        <div class="form-group"><label class="form-label">Currency</label><select class="form-input" id="if-currency">${CURRENCIES.map(c=>`<option value="${c}"${(editing?.currency||org?.currency||'INR')===c?' selected':''}>${c}</option>`).join('')}</select></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group"><label class="form-label req">Invoice Date</label><input class="form-input" type="date" id="if-date" value="${editing?.date || today()}"></div>
        <div class="form-group"><label class="form-label req">Due Date</label><input class="form-input" type="date" id="if-due" value="${editing?.due_date || addDays(today(), 30)}"></div>
        <div class="form-group"><label class="form-label">Place of Supply</label><select class="form-input" id="if-pos"><option value="">— Select State —</option>${INDIAN_STATES.map(s=>`<option value="${esc(s)}"${(editing?.place_of_supply||org?.state||'')===s?' selected':''}>${esc(s)}</option>`).join('')}</select></div>
      </div>
      <div id="items-table-wrap" style="margin-bottom:14px"></div>
      <div style="display:flex;gap:20px;align-items:flex-start">
        <div style="flex:1">
          <div class="form-group"><label class="form-label">Notes (visible to customer)</label><textarea class="form-input" id="if-notes" rows="2">${esc(editing?.notes || org?.default_notes || '')}</textarea></div>
          <div class="form-group"><label class="form-label">Terms & Conditions</label><textarea class="form-input" id="if-terms" rows="2">${esc(editing?.terms || org?.default_terms || '')}</textarea></div>
        </div>
        <div style="min-width:260px">
          <div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:var(--radius);padding:14px">
            <div class="total-row"><span class="total-label">Subtotal</span><span id="inv-subtotal-display">₹0.00</span></div>
            <div class="total-row"><span class="total-label">Discount <input type="number" id="inv-discount-pct" value="${editing?.discount_pct||0}" min="0" max="100" style="width:44px;border:1px solid var(--c-border2);border-radius:4px;padding:2px 4px;font-size:12px" oninput="updateTotals()"> %</span><span id="inv-disc-display" style="color:var(--c-green)">—</span></div>
            <div class="total-row"><span class="total-label">Tax (GST)</span><span id="inv-tax-display">₹0.00</span></div>
            <div class="total-row grand"><span>Total</span><span id="inv-total-display" style="color:var(--c-primary);font-size:18px">₹0.00</span></div>
          </div>
        </div>
      </div>`,
    onSave: async () => { await _saveInvoiceForm(editing); },
    onSaveAndSend: async () => { const savedId = await _saveInvoiceForm(editing); if (savedId) { await API.updateInvStatus(savedId, 'sent'); toast('Invoice saved and sent!', 'success'); _invoices = await API.getInvoices(); _renderInvoiceTable(document.querySelector('.page-content')); } }
  });
  setTimeout(() => { initItems(editing?.items || []); updateTotals(); }, 80);
}

async function _saveInvoiceForm(editing) {
  const custSel = document.getElementById('if-customer');
  const customer_id = custSel.value;
  if (!customer_id) { toast('Please select a customer', 'error'); return false; }
  const items = getItems();
  if (items.length === 0) { toast('At least one item is required', 'error'); return false; }
  
  const discPct = safeNum(document.getElementById('inv-discount-pct').value);
  let subtotal = 0, taxTotal = 0;
  items.forEach(it => { const { base, tax } = calcLine(it.quantity, it.unit_price, it.tax_rate); subtotal += base; taxTotal += tax; });
  const discAmt = subtotal * discPct / 100;
  
  const payload = {
    customer_id, customer_name: custSel.options[custSel.selectedIndex]?.dataset.name || '',
    number: document.getElementById('if-number').value.trim(),
    date: document.getElementById('if-date').value, due_date: document.getElementById('if-due').value,
    currency: document.getElementById('if-currency').value, place_of_supply: document.getElementById('if-pos').value,
    items, subtotal, discount_pct: discPct, discount_amount: discAmt, tax: taxTotal, total: subtotal - discAmt + taxTotal,
    notes: document.getElementById('if-notes').value.trim(), terms: document.getElementById('if-terms').value.trim(),
  };

  let id;
  if (editing) { await API.updateInvoice(editing.id, payload); id = editing.id; toast('Invoice updated'); }
  else { const res = await API.createInvoice(payload); id = res.id || res; toast('Invoice created'); }
  _invoices = await API.getInvoices();
  _renderInvoiceTable(document.querySelector('.page-content'));
  return id;
}

async function sendInvoice(id) {
  if (!confirm('Mark this invoice as Sent?')) return;
  await API.updateInvStatus(id, 'sent');
  toast('Invoice marked as sent');
  _invoices = await API.getInvoices();
  _renderInvoiceTable(document.querySelector('.page-content'));
}

async function deleteInvoice(id, num) {
  confirmDel(`Delete invoice ${num}?`, async () => {
    await API.deleteInvoice(id);
    toast('Invoice deleted');
    _invoices = await API.getInvoices();
    _renderInvoiceTable(document.querySelector('.page-content'));
  });
}
