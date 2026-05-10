// js/pages/products/form.js
async function openProductForm(id) {
  let editing = null; if (id) editing = await API.getProduct(id);
  openModal({
    title: editing ? `Edit Product — ${esc(editing.name)}` : 'Add New Product', size: 'xl',
    body: `
      <div class="form-row cols-3">
        <div class="form-group" style="grid-column:1/3"><label class="form-label req">Product Name</label><input class="form-input" id="pf-name" value="${esc(editing?.name||'')}" placeholder="e.g. Samsung Galaxy S24"></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="pf-active"><option value="1"${(!editing||editing.is_active)?' selected':''}>Active</option><option value="0"${(editing&&!editing.is_active)?' selected':''}>Inactive</option></select></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group"><label class="form-label">SKU</label><div style="display:flex;gap:6px"><input class="form-input" id="pf-sku" value="${esc(editing?.sku||'')}" style="flex:1;font-family:monospace;font-size:13px"><button type="button" class="btn btn-secondary btn-sm" onclick="_autoFillSKU()">Auto</button></div></div>
        <div class="form-group"><label class="form-label">HSN</label><input class="form-input" id="pf-hsn" value="${esc(editing?.hsn_code||'')}"></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-input" id="pf-category">${PRODUCT_CATEGORIES.map(c=>`<option value="${c}"${(editing?.category||'general')===c?' selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}</select></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group"><label class="form-label">Brand</label><input class="form-input" id="pf-brand" value="${esc(editing?.brand||'')}"></div>
        <div class="form-group"><label class="form-label">Model</label><input class="form-input" id="pf-model" value="${esc(editing?.model_number||'')}"></div>
        <div class="form-group"><label class="form-label">Unit</label><select class="form-input" id="pf-unit">${PRODUCT_UNITS.map(u=>`<option value="${u}"${(editing?.unit||'pcs')===u?' selected':''}>${u}</option>`).join('')}</select></div>
      </div>
      <div class="form-row cols-4">
        <div class="form-group"><label class="form-label req">Price</label><input class="form-input" type="number" id="pf-price" value="${editing?.unit_price||0}"></div>
        <div class="form-group"><label class="form-label">Purchase</label><input class="form-input" type="number" id="pf-purchase" value="${editing?.purchase_price||0}"></div>
        <div class="form-group"><label class="form-label">GST %</label><select class="form-input" id="pf-tax">${GST_HTML.replace(`value="${editing?.tax_rate??18}"`, `value="${editing?.tax_rate??18}" selected`)}</select></div>
        <div class="form-group"><label class="form-label">Stock</label><input class="form-input" type="number" id="pf-stock" value="${editing?.stock_qty||0}"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-group"><label class="form-label">Warranty</label><select class="form-input" id="pf-wtype" onchange="_toggleWarrantyFields()">${WARRANTY_TYPES.map(w=>`<option value="${w.value}"${(editing?.warranty_type||'none')===w.value?' selected':''}>${w.label}</option>`).join('')}</select></div>
        <div class="form-group" id="pf-wduration-wrap"><label class="form-label">Duration</label><div style="display:flex;gap:8px"><input class="form-input" type="number" id="pf-wduration" value="${editing?.warranty_duration||0}" style="flex:1"><select class="form-input" id="pf-wunit" style="width:100px"><option value="months">Months</option><option value="years">Years</option></select></div></div>
        <div class="form-group"><label class="form-label">Vendor</label><select class="form-input" id="pf-vendor-select"><option value="">— No vendor —</option>${_allVendors.map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select></div>
      </div>
    `,
    onOpen: () => { setTimeout(() => { _toggleWarrantyFields(); }, 80); },
    onSave: async () => {
      const payload = {
        name: document.getElementById('pf-name').value.trim(),
        sku: document.getElementById('pf-sku').value.trim(),
        hsn_code: document.getElementById('pf-hsn').value.trim(),
        category: document.getElementById('pf-category').value,
        unit: document.getElementById('pf-unit').value,
        unit_price: safeNum(document.getElementById('pf-price').value),
        purchase_price: safeNum(document.getElementById('pf-purchase').value),
        tax_rate: safeNum(document.getElementById('pf-tax').value),
        stock_qty: safeNum(document.getElementById('pf-stock').value),
        brand: document.getElementById('pf-brand').value.trim(),
        model_number: document.getElementById('pf-model').value.trim(),
        is_active: document.getElementById('pf-active').value === '1',
        warranty_type: document.getElementById('pf-wtype').value,
        warranty_duration: safeNum(document.getElementById('pf-wduration').value),
        warranty_unit: document.getElementById('pf-wunit').value,
      };
      if (editing) await API.updateProduct(editing.id, payload);
      else await API.createProduct(payload);
      toast(editing ? 'Product updated' : 'Product created');
      [_products, _allVendors] = await Promise.all([API.getProducts(), API.getVendors()]);
      _renderProductsPage(document.querySelector('.page-content'));
    }
  });
}

function _toggleWarrantyFields() {
  const type = document.getElementById('pf-wtype')?.value;
  const wrap = document.getElementById('pf-wduration-wrap');
  if (wrap) wrap.style.opacity = (type && type !== 'none') ? '1' : '0.4';
}

async function _autoFillSKU() {
  const skuEl = document.getElementById('pf-sku');
  const brand = document.getElementById('pf-brand')?.value || 'PROD';
  skuEl.value = '…';
  const sku = await generateSKU(brand);
  skuEl.value = sku;
}

async function deleteProduct(id, name) {
  confirmDel(`Delete product ${name}?`, async () => {
    await API.deleteProduct(id);
    toast('Product deleted');
    _products = await API.getProducts();
    _renderProductsPage(document.querySelector('.page-content'));
  });
}
