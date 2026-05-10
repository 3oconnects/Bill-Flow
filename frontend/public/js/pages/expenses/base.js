// js/pages/expenses/base.js
let _expenses = [], _expSearch = '', _expCatFilter = 'all', _vendors_exp = [], _expView = 'table';
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

function _expSearchChange(v) { 
  _expSearch = v; 
  _renderExpenseTable(document.querySelector('.page-content')); 
}

function _expViewToggleHTML() {
  return `
    <div class="view-toggle-bar">
      <button class="view-toggle-btn ${_expView==='table'?'active':''}" onclick="_expView='table';_renderExpenseTable(document.querySelector('.page-content'))">${ICONS.table}</button>
      <button class="view-toggle-btn ${_expView==='card'?'active':''}" onclick="_expView='card';_renderExpenseTable(document.querySelector('.page-content'))">${ICONS.grid}</button>
    </div>`;
}

function openExpenseFormById(key) {
  const e = window._expReg[key];
  openExpenseForm(e || null);
}
