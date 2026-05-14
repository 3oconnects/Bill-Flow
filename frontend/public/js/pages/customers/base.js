// js/pages/customers/base.js
let _customers = [], _custSearch = '', _custView = 'table';
let _custDetailId = null;

function _custId(id) {
  return 'CUST-' + id.slice(0, 8).toUpperCase();
}

async function renderCustomers(el) {
  el.innerHTML = `<div class="loading-page"><div class="spinner spin-dark"></div></div>`;
  _customers = await API.getCustomers();
  _renderCustomerTable(el);
}

function _custSearchChange(v) { 
  _custSearch = v; 
  if (_custDetailId) return; // don't re-render table if in detail view
  _renderCustomerTable(document.querySelector('.page-content')); 
}

function _custViewToggleHTML() {
  return `
    <div class="view-toggle-bar">
      <button class="view-toggle-btn ${_custView==='table'?'active':''}" onclick="_custView='table';_renderCustomerTable(document.querySelector('.page-content'))">${ICONS.table}</button>
      <button class="view-toggle-btn ${_custView==='card'?'active':''}" onclick="_custView='card';_renderCustomerTable(document.querySelector('.page-content'))">${ICONS.grid}</button>
    </div>`;
}

async function deleteCustomer(id, name) {
  confirmDel(`Delete customer "${name}"?`, async () => {
    await API.deleteCustomer(id);
    toast('Customer deleted');
    _customers = await API.getCustomers();
    _renderCustomerTable(document.querySelector('.page-content'));
  });
}
