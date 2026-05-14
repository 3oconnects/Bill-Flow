// js/pages/customers/detail.js
async function viewCustomerDetail(customerId) {
  const el = document.getElementById('main-content');
  if (!el) return;
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  _custDetailId = customerId;

  const actionsBar = document.getElementById('topbar-actions');
  if (actionsBar) actionsBar.innerHTML = `<button class="btn btn-ghost" onclick="_backToCustomers()">← Back</button>`;

  const data = await API.getCustomerDetail(customerId);
  _renderCustomerDetail(el, data.customer, data.purchasedProducts, data.claims);
}

function _renderCustomerDetail(el, customer, purchasedProducts, claims) {
  el.innerHTML = `
    <div class="card" style="margin-bottom:18px">
      <div class="card-body" style="padding:20px 24px;display:flex;align-items:center;gap:18px">
        <div class="item-card-avatar blue" style="width:52px;height:52px;font-size:22px">${esc(customer.name[0])}</div>
        <div style="flex:1">
          <h2 style="font-size:20px;font-weight:700;margin:0">${esc(customer.name)}</h2>
          <div style="font-size:13px;color:var(--c-text2)">${esc(customer.email||'')} · ${esc(customer.phone||'')}</div>
        </div>
        <div style="display:flex;gap:24px;text-align:center">
          <div><div style="font-size:22px;font-weight:700;color:${(customer.outstanding||0)>0?'var(--c-danger)':'var(--c-text)'}">${fmt(customer.outstanding||0)}</div><div style="font-size:11px;color:var(--c-text2)">Outstanding</div></div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:18px">
      <div class="card-header"><h3 style="font-size:15px;font-weight:700;margin:0">🛒 Purchased Products</h3></div>
      <div class="card-body-p0">${_renderPurchasedTable(purchasedProducts, customer.id)}</div>
    </div>
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-size:15px;font-weight:700;margin:0">🛡️ Warranty Claims</h3>
        <button class="btn btn-primary btn-sm" onclick="openWarrantyClaim('${customer.id}')">+ New Claim</button>
      </div>
      <div class="card-body-p0" id="claims-section">${_renderClaimsTable(claims)}</div>
    </div>
  `;
}

function _renderPurchasedTable(products, customerId) {
  if (!products.length) return `<div class="empty-state" style="padding:32px"><h3>No purchases yet</h3></div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Product</th><th>Invoice</th><th>Date</th><th>Price</th><th>Warranty</th><th>Action</th></tr></thead>
    <tbody>${products.map(p => `<tr>
      <td><span style="font-weight:600">${esc(p.productName)}</span></td>
      <td><span class="mono" style="font-size:11px">${esc(p.invoiceNumber)}</span></td>
      <td>${fmtDate(p.invoiceDate)}</td>
      <td style="font-weight:600">${fmt(p.price, p.currency)}</td>
      <td>${p.warranty ? `<span class="badge badge-paid">${p.warranty.status}</span>` : '—'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="openWarrantyClaim('${customerId}','${esc(p.productName)}','','','${esc(p.invoiceNumber)}')">🔧 Claim</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function _renderClaimsTable(claims) {
  if (!claims.length) return `<div class="empty-state" style="padding:32px"><h3>No claims</h3></div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Product</th><th>Issue</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
    <tbody>${claims.map(c => `<tr>
      <td style="font-weight:600">${esc(c.product_name)}</td>
      <td style="font-size:13px">${esc(c.issue_description)}</td>
      <td><span class="badge ${c.status==='approved'?'badge-paid':'badge-sent'}">${c.status}</span></td>
      <td style="font-size:12px">${fmtDate(c.created_at)}</td>
      <td><button class="btn btn-danger btn-icon btn-sm" onclick="deleteClaimFromDetail('${c.id}')">${ICONS.trash}</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
