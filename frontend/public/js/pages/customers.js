// js/pages/customers.js
let _customers = [], _custSearch = '', _custView = 'table';
let _custDetailId = null;

// ── Helpers ──────────────────────────────────────────────────
function _custId(id) {
  return 'CUST-' + id.slice(0, 8).toUpperCase();
}

// ── Main Render ──────────────────────────────────────────────
async function renderCustomers(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div> Loading customers…</div>`;
  _customers = await API.getCustomers();
  _renderCustomerTable(el);
}

function _custViewToggleHTML() {
  return `
    <div class="view-toggle-bar">
      <button class="view-toggle-btn ${_custView==='table'?'active':''}" title="Table view" onclick="_custView='table';_renderCustomerTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>
      <button class="view-toggle-btn ${_custView==='card'?'active':''}" title="Card view" onclick="_custView='card';_renderCustomerTable(document.querySelector('.page-content'))">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      </button>
    </div>`;
}

function _renderCustomerTable(el) {
  _custDetailId = null;
  const filtered = _customers.filter(c =>
    !_custSearch || c.name?.toLowerCase().includes(_custSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(_custSearch.toLowerCase()) ||
    c.gstin?.toLowerCase().includes(_custSearch.toLowerCase()) ||
    c.city?.toLowerCase().includes(_custSearch.toLowerCase()) ||
    _custId(c.id).toLowerCase().includes(_custSearch.toLowerCase())
  );

  const actionsBar = document.getElementById('topbar-actions');
  if (actionsBar) actionsBar.innerHTML = `<button class="btn btn-primary" onclick="openCustomerForm()">${ICONS.plus} New Customer</button>`;

  const colors = ['blue','green','purple','orange','teal'];

  const emptyState = `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
    <h3>No customers yet</h3>
    <p>${_custSearch ? 'No results found' : 'Add your first customer to get started'}</p>
  </div>`;

  const cardGrid = `<div class="card-grid">
    ${filtered.map((c,i) => `
      <div class="item-card">
        <div class="item-card-header">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            <div class="item-card-avatar ${colors[i%colors.length]}">${esc(c.name?.charAt(0)||'?')}</div>
            <div style="min-width:0">
              <div class="item-card-title">${esc(c.name)}</div>
              <div style="font-family:monospace;font-size:11px;color:var(--c-primary);font-weight:600;margin-bottom:2px">${_custId(c.id)}</div>
              <div class="item-card-sub">${esc(c.email||'—')}</div>
            </div>
          </div>
          <div class="item-card-actions">
            <button class="btn btn-ghost btn-icon btn-sm" title="View Details" onclick="viewCustomerDetail('${c.id}')">${ICONS.eye}</button>
            <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick='openCustomerForm(${JSON.stringify(c)})'>${ICONS.edit}</button>
            <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteCustomer('${c.id}','${esc(c.name)}')">${ICONS.trash}</button>
          </div>
        </div>
        <hr class="item-card-divider"/>
        <div class="item-card-fields">
          <div class="item-card-field"><span class="item-card-field-label">Phone</span><span class="item-card-field-val">${esc(c.phone||'—')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">City / State</span><span class="item-card-field-val">${esc([c.city,c.state].filter(Boolean).join(', ')||'—')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">GSTIN</span><span class="item-card-field-val mono">${esc(c.gstin||'—')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Currency</span><span class="item-card-field-val">${esc(c.currency||'INR')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Outstanding</span><span class="item-card-amount ${(c.outstanding||0)>0?'red':''}">${fmt(c.outstanding||0)}</span></div>
        </div>
      </div>`).join('')}
  </div>`;

  el.innerHTML = `
    <div class="filter-bar">
      ${searchInput('Search customers by name, email, ID, GSTIN…', '_custSearchChange', _custSearch)}
      <div class="spacer"></div>
      ${_custViewToggleHTML()}
      <span style="font-size:13px;color:var(--c-text2)">${filtered.length} customer${filtered.length !== 1 ? 's' : ''}</span>
    </div>
    ${_custView === 'card'
      ? (filtered.length === 0 ? `<div class="card"><div class="card-body-p0">${emptyState}</div></div>` : cardGrid)
      : `<div class="card"><div class="card-body-p0"><div class="table-wrap">
          ${filtered.length === 0 ? emptyState :
          `<table>
            <thead><tr><th>Customer ID</th><th>Name</th><th>Email</th><th>Phone</th><th>City / State</th><th>GSTIN</th><th>Currency</th><th style="text-align:right">Outstanding</th><th>Actions</th></tr></thead>
            <tbody>
              ${filtered.map(c => `<tr>
                <td><span class="mono" style="font-size:11px;color:var(--c-primary);font-weight:700;background:var(--c-primary-lt);padding:2px 6px;border-radius:4px">${_custId(c.id)}</span></td>
                <td><span style="font-weight:600">${esc(c.name)}</span></td>
                <td>${esc(c.email || '—')}</td>
                <td>${esc(c.phone || '—')}</td>
                <td>${esc([c.city, c.state].filter(Boolean).join(', ') || '—')}</td>
                <td class="mono">${esc(c.gstin || '—')}</td>
                <td>${esc(c.currency || 'INR')}</td>
                <td style="text-align:right" class="${(c.outstanding || 0) > 0 ? 'amt-red' : ''}">${fmt(c.outstanding || 0)}</td>
                <td><div class="tbl-actions">
                  <button class="btn btn-ghost btn-icon btn-sm" title="View Details" onclick="viewCustomerDetail('${c.id}')">${ICONS.eye}</button>
                  <button class="btn btn-ghost btn-icon btn-sm" title="Edit" onclick='openCustomerForm(${JSON.stringify(c)})'>${ICONS.edit}</button>
                  <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteCustomer('${c.id}','${esc(c.name)}')">${ICONS.trash}</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>`}
        </div></div></div>`}`;
}

function _custSearchChange(v) { _custSearch = v; _renderCustomerTable(document.querySelector('.page-content')); }

// ── Customer Detail View ─────────────────────────────────────
async function viewCustomerDetail(customerId) {
  const el = document.querySelector('.page-content');
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div> Loading customer details…</div>`;
  _custDetailId = customerId;

  const actionsBar = document.getElementById('topbar-actions');
  if (actionsBar) actionsBar.innerHTML = `
    <button class="btn btn-ghost" onclick="_renderCustomerTable(document.querySelector('.page-content'))">
      ← Back to Customers
    </button>`;

  try {
    const data = await API.getCustomerDetail(customerId);
    _renderCustomerDetail(el, data.customer, data.purchasedProducts, data.claims);
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><h3>Error loading customer</h3><p>${esc(e.message)}</p></div>`;
  }
}

function _warrantyStatusBadge(status) {
  if (!status || status === 'none') return '';
  const map = { active: 'badge-paid', expired: 'badge-overdue' };
  return `<span class="badge ${map[status]||'badge-draft'}">${status}</span>`;
}

function _claimStatusBadge(status) {
  const map = { pending: 'badge-sent', approved: 'badge-paid', rejected: 'badge-overdue' };
  return `<span class="badge ${map[status]||'badge-draft'}">${status}</span>`;
}

function _renderCustomerDetail(el, customer, purchasedProducts, claims) {
  const colors = ['blue','green','purple','orange','teal'];
  const ci = colors[customer.id.charCodeAt(0) % colors.length];

  const wcBtn = `<button class="btn btn-primary btn-sm" onclick="openWarrantyClaim('${customer.id}')">+ New Claim</button>`;

  el.innerHTML = `
  <!-- Customer Header -->
  <div class="card" style="margin-bottom:18px">
    <div class="card-body" style="padding:20px 24px">
      <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
        <div class="item-card-avatar ${ci}" style="width:52px;height:52px;font-size:22px;border-radius:14px;flex-shrink:0">${esc(customer.name?.charAt(0)||'?')}</div>
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h2 style="font-size:20px;font-weight:700;margin:0">${esc(customer.name)}</h2>
            <span class="mono" style="font-size:12px;color:var(--c-primary);font-weight:700;background:var(--c-primary-lt);padding:3px 8px;border-radius:5px">${_custId(customer.id)}</span>
          </div>
          <div style="margin-top:4px;font-size:13px;color:var(--c-text2)">${esc(customer.email||'')} ${customer.phone?'· '+esc(customer.phone):''}</div>
          <div style="margin-top:2px;font-size:13px;color:var(--c-text2)">${esc([customer.city,customer.state].filter(Boolean).join(', ')||'')} ${customer.gstin?'· GSTIN: '+esc(customer.gstin):''}</div>
        </div>
        <div style="display:flex;gap:24px;text-align:center">
          <div><div style="font-size:22px;font-weight:700;color:${(customer.outstanding||0)>0?'var(--c-danger)':'var(--c-text)'}">${fmt(customer.outstanding||0)}</div><div style="font-size:11px;color:var(--c-text2);margin-top:2px">Outstanding</div></div>
          <div><div style="font-size:22px;font-weight:700">${purchasedProducts.length}</div><div style="font-size:11px;color:var(--c-text2);margin-top:2px">Products</div></div>
          <div><div style="font-size:22px;font-weight:700">${claims.length}</div><div style="font-size:11px;color:var(--c-text2);margin-top:2px">Claims</div></div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick='openCustomerForm(${JSON.stringify(customer)})'>${ICONS.edit} Edit</button>
      </div>
    </div>
  </div>

  <!-- Purchased Products -->
  <div class="card" style="margin-bottom:18px">
    <div class="card-header" style="padding:16px 20px;border-bottom:1px solid var(--c-border)">
      <h3 style="font-size:15px;font-weight:700;margin:0">🛒 Purchased Products</h3>
    </div>
    <div class="card-body-p0">
      ${purchasedProducts.length === 0
        ? `<div class="empty-state" style="padding:32px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="36" height="36"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            <h3>No purchases yet</h3>
            <p>Products appear here once invoices are created for this customer.</p>
          </div>`
        : `<div class="table-wrap"><table>
            <thead><tr>
              <th>Product Name</th><th>Model No.</th><th>Invoice</th><th>Purchase Date</th><th>Price</th>
              <th>Warranty</th><th>Guarantee</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${purchasedProducts.map(p => `
              <tr>
                <td>
                  <span style="font-weight:600">${esc(p.productName)}</span>
                  ${p.brand ? `<br><span style="font-size:11px;color:var(--c-text2)">${esc(p.brand)}</span>` : ''}
                </td>
                <td class="mono" style="font-size:12px">${esc(p.modelNumber||'—')}</td>
                <td><span class="mono" style="font-size:11px;color:var(--c-primary);font-weight:600">${esc(p.invoiceNumber)}</span></td>
                <td style="white-space:nowrap">${fmtDate(p.invoiceDate)}</td>
                <td style="font-weight:600">${fmt(p.price, p.currency)}</td>
                <td>
                  ${p.warranty ? `
                    <div style="font-size:12px">
                      ${_warrantyStatusBadge(p.warranty.status)}
                      <div style="margin-top:3px;color:var(--c-text2)">${p.warranty.duration} ${p.warranty.unit}</div>
                      ${p.warranty.expiryDate ? `<div style="font-size:11px;color:var(--c-text3)">Exp: ${fmtDate(p.warranty.expiryDate)}</div>` : ''}
                    </div>` : `<span style="color:var(--c-text3);font-size:12px">—</span>`}
                </td>
                <td>
                  ${p.guarantee ? `
                    <div style="font-size:12px">
                      ${_warrantyStatusBadge(p.guarantee.status)}
                      <div style="margin-top:3px;color:var(--c-text2)">${p.guarantee.duration} ${p.guarantee.unit}</div>
                      ${p.guarantee.expiryDate ? `<div style="font-size:11px;color:var(--c-text3)">Exp: ${fmtDate(p.guarantee.expiryDate)}</div>` : ''}
                    </div>` : `<span style="color:var(--c-text3);font-size:12px">—</span>`}
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 8px;white-space:nowrap"
                    onclick="openWarrantyClaim('${customer.id}','${esc(p.productName).replace(/'/g,"\\'")}','${esc(p.modelNumber||'').replace(/'/g,"\\'")}','${esc(p.invoiceId)}','${esc(p.invoiceNumber)}')">
                    🔧 Claim
                  </button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
    </div>
  </div>

  <!-- Warranty Claims -->
  <div class="card">
    <div class="card-header" style="padding:16px 20px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;justify-content:space-between">
      <h3 style="font-size:15px;font-weight:700;margin:0">🛡️ Warranty Claims</h3>
      ${wcBtn}
    </div>
    <div class="card-body-p0" id="claims-section">
      ${_renderClaimsTable(claims)}
    </div>
  </div>`;
}

function _renderClaimsTable(claims) {
  if (claims.length === 0) return `<div class="empty-state" style="padding:32px">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="36" height="36"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    <h3>No warranty claims</h3><p>Claims submitted for this customer will appear here.</p></div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Product</th><th>Model</th><th>Invoice</th><th>Issue</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
    <tbody>
      ${claims.map(c => `<tr>
        <td style="font-weight:600">${esc(c.product_name)}</td>
        <td class="mono" style="font-size:12px">${esc(c.model_number||'—')}</td>
        <td><span class="mono" style="font-size:11px;color:var(--c-primary)">${esc(c.invoice_number||'—')}</span></td>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px">${esc(c.issue_description)}</td>
        <td>${_claimStatusBadge(c.status)}</td>
        <td style="white-space:nowrap;font-size:12px">${fmtDate(c.created_at)}</td>
        <td><div class="tbl-actions">
          ${c.status === 'pending' ? `
            <button class="btn btn-ghost btn-icon btn-sm" title="Approve" onclick="updateClaimStatus('${c.id}','approved')" style="color:var(--c-success)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon btn-sm" title="Reject" onclick="updateClaimStatus('${c.id}','rejected')" style="color:var(--c-danger)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          ` : ''}
          <button class="btn btn-danger btn-icon btn-sm" title="Delete" onclick="deleteClaimFromDetail('${c.id}')">${ICONS.trash}</button>
        </div></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

async function updateClaimStatus(claimId, status) {
  try {
    await API.updateWarrantyClaimStatus(claimId, status, '');
    toast('Claim ' + status);
    const data = await API.getCustomerDetail(_custDetailId);
    const sec = document.getElementById('claims-section');
    if (sec) sec.innerHTML = _renderClaimsTable(data.claims);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteClaimFromDetail(claimId) {
  confirmDel('Delete this warranty claim? This cannot be undone.', async () => {
    try {
      await API.deleteWarrantyClaim(claimId);
      toast('Claim deleted');
      const data = await API.getCustomerDetail(_custDetailId);
      const sec = document.getElementById('claims-section');
      if (sec) sec.innerHTML = _renderClaimsTable(data.claims);
    } catch(e) { toast(e.message, 'error'); }
  });
}

// ── Warranty Claim Modal ──────────────────────────────────────
function openWarrantyClaim(customerId, productName, modelNumber, invoiceId, invoiceNumber) {
  productName = productName || '';
  modelNumber = modelNumber || '';
  invoiceId = invoiceId || '';
  invoiceNumber = invoiceNumber || '';

  openModal({
    size: 'lg',
    title: '🔧 Submit Warranty Claim',
    body: `
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label req">Product Name</label>
          <input class="form-input" id="wc-product" value="${esc(productName)}" placeholder="Product name">
        </div>
        <div class="form-group">
          <label class="form-label">Model Number</label>
          <input class="form-input" id="wc-model" value="${esc(modelNumber)}" placeholder="Model number">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Invoice Number</label>
          <input class="form-input" id="wc-inv-number" value="${esc(invoiceNumber)}" placeholder="e.g. INV-0001">
        </div>
        <div class="form-group">
          <label class="form-label">Invoice Reference</label>
          <input class="form-input" id="wc-inv-id" value="${esc(invoiceId)}" placeholder="Auto-filled from product row">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label req">Issue Description</label>
        <textarea class="form-input" id="wc-issue" rows="3" placeholder="Describe the issue in detail…"></textarea>
      </div>
      <div class="form-row cols-2">
        <div class="form-group">
          <label class="form-label">Upload Proof / Invoice</label>
          <input class="form-input" type="file" id="wc-proof" accept="image/*,.pdf" style="padding:6px">
          <div style="font-size:11px;color:var(--c-text2);margin-top:4px">Image or PDF, max 2MB</div>
        </div>
        <div class="form-group">
          <label class="form-label">Additional Notes</label>
          <textarea class="form-input" id="wc-notes" rows="2" placeholder="Any additional notes…"></textarea>
        </div>
      </div>`,
    onSave: async () => {
      const product_name = document.getElementById('wc-product').value.trim();
      const issue_description = document.getElementById('wc-issue').value.trim();
      if (!product_name) { toast('Product name is required', 'error'); return false; }
      if (!issue_description) { toast('Issue description is required', 'error'); return false; }

      let proof_filename = '', proof_data = '';
      const fileInput = document.getElementById('wc-proof');
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) { toast('File too large (max 2MB)', 'error'); return false; }
        proof_filename = file.name;
        proof_data = await new Promise(res => {
          const r = new FileReader();
          r.onload = e => res(e.target.result.split(',')[1]);
          r.readAsDataURL(file);
        });
      }

      await API.createWarrantyClaim({
        customer_id: customerId,
        invoice_id: document.getElementById('wc-inv-id').value.trim() || null,
        invoice_number: document.getElementById('wc-inv-number').value.trim(),
        product_name,
        model_number: document.getElementById('wc-model').value.trim(),
        issue_description,
        proof_filename,
        proof_data,
        notes: document.getElementById('wc-notes').value.trim(),
      });

      toast('Warranty claim submitted successfully');
      if (_custDetailId === customerId) {
        const data = await API.getCustomerDetail(_custDetailId);
        const sec = document.getElementById('claims-section');
        if (sec) sec.innerHTML = _renderClaimsTable(data.claims);
      }
    }
  });
}

// ── Customer Form ─────────────────────────────────────────────
function openCustomerForm(c = null) {
  openModal({
    size: 'lg', title: c ? `Edit Customer — ${c.name}` : 'New Customer',
    body: `
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label req">Customer Name</label><input class="form-input" id="cf-name" value="${esc(c?.name||'')}" placeholder="Company or person name"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="cf-email" type="email" value="${esc(c?.email||'')}" placeholder="billing@company.com"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="cf-phone" value="${esc(c?.phone||'')}" placeholder="+91 9876543210"></div>
        <div class="form-group"><label class="form-label">Currency</label>
          <select class="form-input" id="cf-currency">${CURRENCIES.map(cu=>`<option value="${cu}"${(c?.currency||'INR')===cu?' selected':''}>${cu}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Address</label><textarea class="form-input" id="cf-address" rows="2" placeholder="Street address">${esc(c?.address||'')}</textarea></div>
      <div class="form-row cols-3">
        <div class="form-group"><label class="form-label">City</label><input class="form-input" id="cf-city" value="${esc(c?.city||'')}" placeholder="Chennai"></div>
        <div class="form-group"><label class="form-label">State</label>
          <select class="form-input" id="cf-state"><option value="">— Select —</option>${INDIAN_STATES.map(s=>`<option value="${esc(s)}"${c?.state===s?' selected':''}>${esc(s)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">PIN Code</label><input class="form-input" id="cf-pin" value="${esc(c?.pincode||'')}" placeholder="600001"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-group"><label class="form-label">GSTIN</label><input class="form-input" id="cf-gstin" value="${esc(c?.gstin||'')}" placeholder="22AAAAA0000A1Z5" style="text-transform:uppercase"></div>
        <div class="form-group"><label class="form-label">PAN</label><input class="form-input" id="cf-pan" value="${esc(c?.pan||'')}" placeholder="AAAAA0000A" style="text-transform:uppercase"></div>
      </div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="cf-notes" rows="2">${esc(c?.notes||'')}</textarea></div>`,
    onSave: async () => {
      const name = document.getElementById('cf-name').value.trim();
      if (!name) { toast('Customer name is required', 'error'); return false; }
      const data = {
        name, email: document.getElementById('cf-email').value.trim(),
        phone: document.getElementById('cf-phone').value.trim(),
        currency: document.getElementById('cf-currency').value,
        address: document.getElementById('cf-address').value.trim(),
        city: document.getElementById('cf-city').value.trim(),
        state: document.getElementById('cf-state').value,
        pincode: document.getElementById('cf-pin').value.trim(),
        gstin: document.getElementById('cf-gstin').value.trim().toUpperCase(),
        pan: document.getElementById('cf-pan').value.trim().toUpperCase(),
        notes: document.getElementById('cf-notes').value.trim(),
      };
      if (c) await API.updateCustomer(c.id, data);
      else await API.createCustomer(data);
      toast(c ? 'Customer updated' : 'Customer added');
      _customers = await API.getCustomers();
      if (_custDetailId && c?.id === _custDetailId) {
        viewCustomerDetail(_custDetailId);
      } else {
        _renderCustomerTable(document.querySelector('.page-content'));
      }
    }
  });
}

async function deleteCustomer(id, name) {
  confirmDel(`Delete customer "${name}"? This cannot be undone.`, async () => {
    try {
      await API.deleteCustomer(id);
      toast('Customer deleted');
      _custDetailId = null;
      _customers = await API.getCustomers();
      _renderCustomerTable(document.querySelector('.page-content'));
    } catch(e) { toast(e.message, 'error'); }
  });
}
