// js/pages/vendors/render.js
function _renderVendorTable(el) {
  const stats = _vendorStats();
  let filtered = _vendors.filter(v => {
    const mStat = _vendorStatusFilter === 'all' || (v.status || 'active') === _vendorStatusFilter;
    const q = _vendorSearch.toLowerCase();
    const mSearch = !q || v.name?.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q) || v.company_name?.toLowerCase().includes(q) || v.vendor_id?.toLowerCase().includes(q);
    return mStat && mSearch;
  });

  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary" onclick="openVendorForm()">${ICONS.plus} New Vendor</button>`;

  el.innerHTML = `
    <div class="inv-stats-grid" style="margin-bottom:20px">
      <div class="inv-stat-card"><div class="inv-stat-icon inv-stat-icon--blue">${ICONS.vendor}</div><div class="inv-stat-body"><span class="inv-stat-label">Total Vendors</span><div class="inv-stat-row"><span class="inv-stat-value">${stats.total}</span></div></div></div>
      <div class="inv-stat-card"><div class="inv-stat-icon inv-stat-icon--green">${ICONS.check}</div><div class="inv-stat-body"><span class="inv-stat-label">Active</span><div class="inv-stat-row"><span class="inv-stat-value">${stats.active}</span></div></div></div>
      <div class="inv-stat-card"><div class="inv-stat-icon inv-stat-icon--orange">${ICONS.alert}</div><div class="inv-stat-body"><span class="inv-stat-label">Inactive</span><div class="inv-stat-row"><span class="inv-stat-value">${stats.inactive}</span></div></div></div>
    </div>
    <div class="filter-bar" style="margin-bottom:16px">
      ${searchInput('Search vendors…', '_vendorSearchChange', _vendorSearch)}
      <div class="pill-tabs">
        <button class="pill-tab${_vendorStatusFilter==='all'?' active':''}" onclick="_vendorStatusFilter='all';_renderVendorTable(document.querySelector('.page-content'))">All</button>
        <button class="pill-tab${_vendorStatusFilter==='active'?' active':''}" onclick="_vendorStatusFilter='active';_renderVendorTable(document.querySelector('.page-content'))">Active</button>
      </div>
      <div class="spacer"></div>
      ${_vendorViewToggleHTML()}
    </div>
    ${_vendorView === 'card' ? _renderVendorCards(filtered) : _renderVendorTableHTML(filtered)}
  `;
}

function _renderVendorCards(filtered) {
  if (filtered.length === 0) return `<div class="empty-state"><h3>No vendors found</h3></div>`;
  return `<div class="card-grid">
    ${filtered.map((v,i) => `<div class="item-card">
      <div class="item-card-header">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          <div class="item-card-avatar blue">${esc(v.name[0])}</div>
          <div style="min-width:0"><div class="item-card-title">${esc(v.name)}</div><div class="item-card-sub">${esc(v.company_name || v.email || '—')}</div></div>
        </div>
        <div class="item-card-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openVendorView('${v.id}')">${ICONS.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick='openVendorForm(${JSON.stringify(v)})'>${ICONS.edit}</button>
        </div>
      </div>
      <hr class="item-card-divider">
      <div class="item-card-fields">
        <div class="item-card-field"><span class="item-card-field-label">Vendor ID</span><span class="item-card-field-val mono">${esc(v.vendor_id||'—')}</span></div>
        <div class="item-card-field"><span class="item-card-field-label">Status</span><span class="item-card-field-val">${_vendorStatusBadge(v.status)}</span></div>
      </div>
    </div>`).join('')}
  </div>`;
}

function _renderVendorTableHTML(filtered) {
  if (filtered.length === 0) return `<div class="empty-state"><h3>No vendors found</h3></div>`;
  return `<div class="card"><div class="card-body-p0"><div class="table-wrap"><table>
    <thead><tr><th>Vendor ID</th><th>Name</th><th>Company</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      ${filtered.map(v => `<tr>
        <td><span class="mono" style="color:var(--c-primary);font-weight:700">${esc(v.vendor_id||'—')}</span></td>
        <td><span style="font-weight:600">${esc(v.name)}</span></td>
        <td>${esc(v.company_name || '—')}</td>
        <td>${esc(v.phone || '—')}</td>
        <td>${_vendorStatusBadge(v.status)}</td>
        <td><div class="tbl-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openVendorView('${v.id}')">${ICONS.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick='openVendorForm(${JSON.stringify(v)})'>${ICONS.edit}</button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteVendor('${v.id}','${esc(v.name)}')">${ICONS.trash}</button>
        </div></td>
      </tr>`).join('')}
    </tbody>
  </table></div></div></div>`;
}
