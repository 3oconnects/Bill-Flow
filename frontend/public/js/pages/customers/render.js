// js/pages/customers/render.js
function _backToCustomers() {
  const el = document.getElementById('main-content');
  if (el) _renderCustomerTable(el);
}

function _renderCustomerTable(el) {
  if (!el) el = document.getElementById('main-content');
  if (!el) return;
  _custDetailId = null;
  const filtered = _customers.filter(c => !_custSearch || c.name?.toLowerCase().includes(_custSearch.toLowerCase()) || c.email?.toLowerCase().includes(_custSearch.toLowerCase()) || _custId(c.id).toLowerCase().includes(_custSearch.toLowerCase()));

  const actionsBar = document.getElementById('topbar-actions');
  if (actionsBar) actionsBar.innerHTML = `<button class="btn btn-primary" onclick="openCustomerForm()">${ICONS.plus} New Customer</button>`;

  el.innerHTML = `
    <div class="filter-bar">
      ${searchInput('Search customers…', '_custSearchChange', _custSearch)}
      <div class="spacer"></div>
      ${_custViewToggleHTML()}
    </div>
    ${_custView === 'card' ? _renderCustomerCards(filtered) : _renderCustomerTableHTML(filtered)}
  `;
}

function _renderCustomerCards(filtered) {
  if (filtered.length === 0) return `<div class="empty-state"><h3>No customers found</h3></div>`;
  const colors = ['blue','green','purple','orange','teal'];
  return `<div class="card-grid">
    ${filtered.map((c,i) => `<div class="item-card">
      <div class="item-card-header">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          <div class="item-card-avatar ${colors[i%colors.length]}">${esc(c.name[0])}</div>
          <div style="min-width:0"><div class="item-card-title">${esc(c.name)}</div><div class="item-card-sub">${esc(c.email||'—')}</div></div>
        </div>
        <div class="item-card-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewCustomerDetail('${c.id}')">${ICONS.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick='openCustomerForm(${JSON.stringify(c)})'>${ICONS.edit}</button>
        </div>
      </div>
      <hr class="item-card-divider">
      <div class="item-card-fields">
        <div class="item-card-field"><span class="item-card-field-label">Phone</span><span class="item-card-field-val">${esc(c.phone||'—')}</span></div>
        <div class="item-card-field"><span class="item-card-field-label">Outstanding</span><span class="item-card-amount ${(c.outstanding||0)>0?'red':''}">${fmt(c.outstanding||0)}</span></div>
      </div>
    </div>`).join('')}
  </div>`;
}

function _renderCustomerTableHTML(filtered) {
  if (filtered.length === 0) return `<div class="empty-state"><h3>No customers found</h3></div>`;
  return `<div class="card"><div class="card-body-p0"><div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th style="text-align:right">Outstanding</th><th>Actions</th></tr></thead>
    <tbody>
      ${filtered.map(c => `<tr>
        <td><span class="mono" style="font-size:11px;color:var(--c-primary);font-weight:700">${_custId(c.id)}</span></td>
        <td><span style="font-weight:600">${esc(c.name)}</span></td>
        <td>${esc(c.email || '—')}</td>
        <td>${esc(c.phone || '—')}</td>
        <td style="text-align:right" class="${(c.outstanding || 0) > 0 ? 'amt-red' : ''}">${fmt(c.outstanding || 0)}</td>
        <td><div class="tbl-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewCustomerDetail('${c.id}')">${ICONS.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick='openCustomerForm(${JSON.stringify(c)})'>${ICONS.edit}</button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteCustomer('${c.id}','${esc(c.name)}')">${ICONS.trash}</button>
        </div></td>
      </tr>`).join('')}
    </tbody>
  </table></div></div></div>`;
}
