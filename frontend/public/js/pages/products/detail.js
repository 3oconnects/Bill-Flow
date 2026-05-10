// js/pages/products/detail.js

async function viewProductDetails(id) {
  const p = await API.getProduct(id);
  openModal({
    title: `Product Details — ${esc(p.name)}`,
    size: 'lg',
    hideSave: true,
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--c-text3);margin-bottom:10px">Product Info</div>
          <table class="table-details">
            <tr><th>SKU</th><td><span class="mono">${esc(p.sku||'—')}</span></td></tr>
            <tr><th>HSN</th><td><span class="mono">${esc(p.hsn_code||'—')}</span></td></tr>
            <tr><th>Category</th><td>${esc(p.category||'general')}</td></tr>
            <tr><th>Brand</th><td>${esc(p.brand||'—')}</td></tr>
            <tr><th>Model</th><td>${esc(p.model_number||'—')}</td></tr>
          </table>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--c-text3);margin-bottom:10px">Pricing & Stock</div>
          <table class="table-details">
            <tr><th>Selling Price</th><td><span style="font-weight:700;color:var(--c-primary)">${fmt(p.unit_price)}</span> <span style="font-size:10px;color:var(--c-text3)">+${p.tax_rate}% GST</span></td></tr>
            <tr><th>Purchase Price</th><td>${fmt(p.purchase_price)}</td></tr>
            <tr><th>Current Stock</th><td><span style="font-weight:700;color:${p.stock_qty <= p.low_stock_alert ? '#f59e0b' : '#22c55e'}">${p.stock_qty} ${esc(p.unit)}</span></td></tr>
          </table>
        </div>
      </div>
      <div style="margin-top:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--c-text3);margin-bottom:10px">Description</div>
        <div style="font-size:13px;line-height:1.5;color:var(--c-text2)">${esc(p.description || 'No description provided.')}</div>
      </div>
      <div style="margin-top:20px;display:flex;gap:10px">
        <button class="btn btn-secondary btn-sm" onclick="closeModal();openStockAdjust('${p.id}','${esc(p.name)}')">Adjust Stock</button>
        <button class="btn btn-primary btn-sm" onclick="closeModal();openProductForm('${p.id}')">Edit Product</button>
      </div>`
  });
}

function openStockAdjust(id, name) {
  openModal({
    title: `Adjust Stock — ${name}`,
    size: 'sm',
    body: `
      <div class="form-group">
        <label class="form-label req">Quantity Change</label>
        <input class="form-input" type="number" id="sa-delta" placeholder="e.g. 10 or -5" autofocus>
        <div style="font-size:11px;color:var(--c-text3);margin-top:4px">Positive to add, negative to deduct.</div>
      </div>`,
    onSave: async () => {
      const delta = parseFloat(document.getElementById('sa-delta').value);
      if (isNaN(delta) || delta === 0) { toast('Invalid quantity', 'error'); return false; }
      await API.patch(`/api/products/${id}/stock`, { delta });
      toast('Stock updated');
      _products = await API.getProducts();
      _renderProductsPage(document.querySelector('.page-content'));
    }
  });
}
