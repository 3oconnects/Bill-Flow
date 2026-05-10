// js/pages/vendors/base.js
let _vendors = [], _vendorSearch = '', _vendorView = 'table', _vendorStatusFilter = 'all';
let _vendorGstFilter = '';

async function renderVendors(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  _vendors = await API.getVendors();
  _renderVendorTable(el);
  if (window._pendingVendorId) {
    const pendingId = window._pendingVendorId;
    window._pendingVendorId = null;
    setTimeout(() => openVendorView(pendingId), 100);
  }
}

async function navigateToVendor(vendorId) {
  window._pendingVendorId = vendorId;
  await navigateTo('vendors');
}

function _vendorStats() {
  const total = _vendors.length;
  const active = _vendors.filter(v => (v.status || 'active') === 'active').length;
  return { total, active, inactive: total - active };
}

function _vendorSearchChange(v) { 
  _vendorSearch = v; 
  _renderVendorTable(document.querySelector('.page-content')); 
}

function _vendorStatusBadge(status) {
  const s = status || 'active';
  const color = s === 'active' ? '#10b981' : '#ef4444';
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:${color}18;color:${color}">
    <span style="width:5px;height:5px;border-radius:50%;background:${color}"></span>${s.charAt(0).toUpperCase()+s.slice(1)}
  </span>`;
}

function _vendorViewToggleHTML() {
  return `
    <div class="view-toggle-bar">
      <button class="view-toggle-btn ${_vendorView==='table'?'active':''}" onclick="_vendorView='table';_renderVendorTable(document.querySelector('.page-content'))">${ICONS.table}</button>
      <button class="view-toggle-btn ${_vendorView==='card'?'active':''}" onclick="_vendorView='card';_renderVendorTable(document.querySelector('.page-content'))">${ICONS.grid}</button>
    </div>`;
}

async function deleteVendor(id, name) {
  confirmDel(`Delete vendor "${name}"?`, async () => {
    await API.deleteVendor(id);
    toast('Vendor deleted');
    _vendors = await API.getVendors();
    _renderVendorTable(document.querySelector('.page-content'));
  });
}
