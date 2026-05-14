// js/pages/expenses/render.js
function _renderExpenseTable(el) {
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary" onclick="openExpenseForm()">${ICONS.plus} Add Expense</button>`;

  const filtered = _expenses.filter(e => (_expCatFilter === 'all' || e.category === _expCatFilter) && (!_expSearch || e.description?.toLowerCase().includes(_expSearch.toLowerCase()) || e.vendor_name?.toLowerCase().includes(_expSearch.toLowerCase()) || e.reference?.toLowerCase().includes(_expSearch.toLowerCase())));
  const total = filtered.reduce((a, e) => a + (e.amount || 0), 0);
  filtered.forEach(e => _expRef(e));

  el.innerHTML = `
    <div class="filter-bar">
      ${searchInput('Search expenses…', '_expSearchChange', _expSearch)}
      <select class="form-input" style="width:auto" onchange="_expCatFilter=this.value;_renderExpenseTable(document.querySelector('.page-content'))">
        <option value="all">All Categories</option>
        ${Object.entries(EXP_CATS).map(([k,v]) => `<option value="${k}"${_expCatFilter===k?' selected':''}>${v}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      ${_expViewToggleHTML()}
      <span style="font-size:13px;color:var(--c-text2)">${filtered.length} expenses | <strong>${fmt(total)}</strong></span>
    </div>
    ${_expView === 'card' ? _renderExpenseCards(filtered) : _renderExpenseTableHTML(filtered)}
  `;
}

function _renderExpenseCards(filtered) {
  if (filtered.length === 0) return `<div class="empty-state"><h3>No expenses found</h3></div>`;
  const colors = ['orange','red','purple','blue','teal','green'];
  return `<div class="card-grid">
    ${filtered.map((e,i) => {
      const key = _expRef(e);
      return `<div class="item-card">
        <div class="item-card-header">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            <div class="item-card-avatar ${colors[i%colors.length]}">₹</div>
            <div style="min-width:0"><div class="item-card-title">${esc(e.description)}</div><div class="item-card-sub">${fmtDate(e.date)}</div></div>
          </div>
          <div class="item-card-actions">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="viewExpenseDetail('${key}')">${ICONS.eye}</button>
            <button class="btn btn-danger btn-icon btn-sm" onclick="deleteExpense('${e.id}')">${ICONS.trash}</button>
          </div>
        </div>
        <hr class="item-card-divider">
        <div class="item-card-fields">
          <div class="item-card-field"><span class="item-card-field-label">Category</span><span class="badge badge-draft">${EXP_CATS[e.category]||e.category}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Amount</span><span class="item-card-amount red">${fmt(e.amount, e.currency)}</span></div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function _renderExpenseTableHTML(filtered) {
  if (filtered.length === 0) return `<div class="empty-state"><h3>No expenses found</h3></div>`;
  return `<div class="card"><div class="card-body-p0"><div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Vendor</th><th style="text-align:right">Amount</th><th>Actions</th></tr></thead>
    <tbody>${filtered.map(e => {
      const key = _expRef(e);
      return `<tr>
        <td>${fmtDate(e.date)}</td>
        <td><span style="font-weight:500">${esc(e.description)}</span></td>
        <td><span class="badge badge-draft">${EXP_CATS[e.category]||e.category}</span></td>
        <td>${e.vendor_name || '—'}</td>
        <td style="text-align:right" class="amt-red">${fmt(e.amount, e.currency)}</td>
        <td><div class="tbl-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewExpenseDetail('${key}')">${ICONS.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openExpenseFormById('${key}')">${ICONS.edit}</button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteExpense('${e.id}')">${ICONS.trash}</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody>
  </table></div></div></div>`;
}
