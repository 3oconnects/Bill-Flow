// js/pages/products/render.js
function _renderProductsPage(el) {
  document.getElementById('topbar-actions').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <button class="btn btn-secondary" onclick="openProductScanner()">${ICONS.scan} Scan Product</button>
      <button class="btn btn-secondary" onclick="openProductForm()">${ICONS.plus} Add Product</button>
      <button class="btn btn-primary" onclick="openBulkUpload()">${ICONS.upload} Bulk Upload</button>
    </div>`;

  const stats = _prodStats();
  const categories = ['all', ...new Set(_products.map(p => p.category).filter(Boolean))];
  const filtered = _products.filter(p => {
    const mCat = _prodCategoryFilter === 'all' || p.category === _prodCategoryFilter;
    const mStat = _prodStatusFilter === 'all' || (_prodStatusFilter === 'active' && p.is_active) || (_prodStatusFilter === 'inactive' && !p.is_active) || (_prodStatusFilter === 'low_stock' && p.is_active && p.stock_qty <= p.low_stock_alert && p.stock_qty > 0) || (_prodStatusFilter === 'out_of_stock' && p.stock_qty <= 0);
    const mSearch = !_prodSearch || p.name?.toLowerCase().includes(_prodSearch.toLowerCase()) || p.sku?.toLowerCase().includes(_prodSearch.toLowerCase()) || p.hsn_code?.toLowerCase().includes(_prodSearch.toLowerCase()) || p.brand?.toLowerCase().includes(_prodSearch.toLowerCase());
    return mCat && mStat && mSearch;
  });

  el.innerHTML = `
    <div class="inv-stats-grid" style="margin-bottom:20px">
      <div class="inv-stat-card"><div class="inv-stat-icon inv-stat-icon--blue">${ICONS.product}</div><div class="inv-stat-body"><span class="inv-stat-label">Total Products</span><div class="inv-stat-row"><span class="inv-stat-value">${stats.total}</span><span class="inv-stat-sub">${stats.active} Active</span></div></div></div>
      <div class="inv-stat-card"><div class="inv-stat-icon inv-stat-icon--green">${ICONS.shield}</div><div class="inv-stat-body"><span class="inv-stat-label">Inventory Value</span><div class="inv-stat-row"><span class="inv-stat-value">${fmt(stats.totalValue)}</span></div></div></div>
      <div class="inv-stat-card"><div class="inv-stat-icon inv-stat-icon--orange">${ICONS.alert}</div><div class="inv-stat-body"><span class="inv-stat-label">Low Stock</span><div class="inv-stat-row"><span class="inv-stat-value">${stats.lowStock}</span></div></div></div>
      <div class="inv-stat-card"><div class="inv-stat-icon inv-stat-icon--red">${ICONS.close}</div><div class="inv-stat-body"><span class="inv-stat-label">Out of Stock</span><div class="inv-stat-row"><span class="inv-stat-value">${stats.outOfStock}</span></div></div></div>
    </div>
    <div class="inv-filter-bar" style="margin-bottom:16px">
      <div class="inv-filter-left" style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
        <div class="inv-search-wrap" style="flex:1;max-width:320px"><svg class="inv-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input class="inv-search-input" type="text" placeholder="Search products…" value="${esc(_prodSearch)}" oninput="_prodSearchChange(this.value)"></div>
        <select class="form-input" style="width:auto;min-width:130px" onchange="_prodCategoryFilter=this.value;_renderProductsPage(document.querySelector('.page-content'))">${categories.map(c => `<option value="${c}"${_prodCategoryFilter===c?' selected':''}>${c==='all'?'All Categories':c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}</select>
      </div>
      <div class="inv-filter-right" style="display:flex;gap:10px">
        <div class="pill-tabs">${[['all','All'],['active','Active'],['inactive','Inactive'],['low_stock','Low Stock']].map(([v,l]) => `<button class="pill-tab${_prodStatusFilter===v?' active':''}" onclick="_prodStatusFilter='${v}';_renderProductsPage(document.querySelector('.page-content'))">${l}</button>`).join('')}</div>
        <div class="view-toggle-bar">
          <button class="view-toggle-btn${_prodView==='table'?' active':''}" onclick="_prodView='table';_renderProductsPage(document.querySelector('.page-content'))">${ICONS.table}</button>
          <button class="view-toggle-btn${_prodView==='card'?' active':''}" onclick="_prodView='card';_renderProductsPage(document.querySelector('.page-content'))">${ICONS.grid}</button>
        </div>
      </div>
    </div>
    ${_prodView === 'card' ? _renderProductCards(filtered) : _renderProductTable(filtered)}
  `;
}
