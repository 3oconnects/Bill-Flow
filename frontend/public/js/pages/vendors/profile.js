// js/pages/vendors/profile.js
async function openVendorView(vendorId) {
  let v = _vendors.find(x => x.id === vendorId);
  if (!v) { try { v = await API.getVendor(vendorId); } catch(e) {} }
  if (!v) { toast('Vendor not found', 'error'); return; }

  openModal({
    size: 'xl', title: `Vendor Profile — ${v.name}`, hideSave: true,
    body: `<div id="vendor-profile-root"><div class="loading-page"><div class="spinner spin-dark"></div></div></div>`,
    onOpen: async () => { _renderVendorProfile(vendorId, v); }
  });
}

async function _renderVendorProfile(vendorId, v) {
  let products = [], history = [], expenses = [], summary = null;
  try {
    [products, history, expenses, summary] = await Promise.all([
      API.getVendorProducts(vendorId),
      API.getVendorPurchaseHistory(vendorId),
      API.getVendorExpenses(vendorId),
      API.getVendorSummary(vendorId)
    ]);
  } catch(e) {}

  const root = document.getElementById('vendor-profile-root'); if (!root) return;
  root.innerHTML = `
    <div style="display:flex;gap:20px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--c-border)">
      <div class="item-card-avatar blue" style="width:64px;height:64px;font-size:26px">${esc(v.name[0])}</div>
      <div style="flex:1">
        <h2 style="font-size:20px;font-weight:700;margin:0">${esc(v.name)}</h2>
        <div style="color:var(--c-text2);font-size:13px">${esc(v.company_name||'')}</div>
        <div style="margin-top:8px;display:flex;gap:12px;font-size:12px">
          <span class="mono" style="color:var(--c-primary);font-weight:600">${esc(v.vendor_id||'—')}</span>
          ${v.phone ? `<span>📞 ${esc(v.phone)}</span>` : ''}
          ${v.email ? `<span>✉ ${esc(v.email)}</span>` : ''}
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
      <div class="stat-box"><strong>${products.length}</strong><br>Products</div>
      <div class="stat-box"><strong>${history.length}</strong><br>Invoices</div>
      <div class="stat-box"><strong>${fmt(summary?.total_spend || 0)}</strong><br>Total Spend</div>
    </div>
    <div class="tabs" style="margin-bottom:16px">
      <button class="tab-btn active" onclick="_vTab('overview',this)">Overview</button>
      <button class="tab-btn" onclick="_vTab('products',this)">Products</button>
      <button class="tab-btn" onclick="_vTab('history',this)">History</button>
    </div>
    <div id="v-tab-overview">${_vOverviewHTML(v)}</div>
    <div id="v-tab-products" style="display:none">${_vProductsHTML(products)}</div>
    <div id="v-tab-history" style="display:none">${_vHistoryHTML(history)}</div>
  `;
}

function _vOverviewHTML(v) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div><h4 style="font-size:11px;text-transform:uppercase;color:var(--c-text2)">Details</h4>
      <div style="font-size:13px;line-height:2">
        <div>ID: <strong>${esc(v.vendor_id)}</strong></div>
        <div>GSTIN: <strong>${esc(v.gstin||'—')}</strong></div>
        <div>Contact: <strong>${esc(v.contact_person||'—')}</strong></div>
      </div>
    </div>
    <div><h4 style="font-size:11px;text-transform:uppercase;color:var(--c-text2)">Address</h4>
      <div style="font-size:13px;line-height:1.6;color:var(--c-text2)">${esc(v.address||'No address added')}</div>
    </div>
  </div>`;
}

function _vProductsHTML(products) {
  if (!products.length) return `<div class="empty-state">No products</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>SKU</th><th>Product Name</th><th>Price</th><th>Stock</th></tr></thead>
    <tbody>${products.map(p => `<tr>
      <td class="mono">${esc(p.sku||'—')}</td>
      <td style="font-weight:600">${esc(p.name)}</td>
      <td style="color:#10b981">${fmt(p.supply_price||p.purchase_price)}</td>
      <td>${p.stock_qty}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function _vHistoryHTML(history) {
  if (!history.length) return `<div class="empty-state">No history</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Invoice</th><th>Product</th><th>Total</th></tr></thead>
    <tbody>${history.map(r => `<tr>
      <td>${fmtDate(r.date)}</td>
      <td class="mono">${esc(r.invoice_number)}</td>
      <td>${esc(r.product_name||r.description)}</td>
      <td style="font-weight:700;color:var(--c-danger)">${fmt(r.amount)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function _vTab(tab, btn) {
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['overview','products','history'].forEach(t => {
    const el = document.getElementById(`v-tab-${t}`);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}
