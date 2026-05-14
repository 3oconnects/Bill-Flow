// js/pages/products/table.js
function _renderProductCards(filtered) {
  if (filtered.length === 0) return `<div class="empty-state"><h3>No products found</h3></div>`;
  return `<div class="card-grid">
    ${filtered.map(p => {
      const avatarColors = ['blue','green','purple','orange','teal'];
      const avatarColor = avatarColors[Math.abs(p.name.charCodeAt(0)) % avatarColors.length];
      return `<div class="item-card">
        <div class="item-card-header">
          <div style="display:flex;gap:12px;align-items:flex-start;min-width:0">
            <div class="item-card-avatar ${avatarColor}">${esc(p.name[0].toUpperCase())}</div>
            <div style="min-width:0"><div class="item-card-title">${esc(p.name)}</div><div class="item-card-sub">${esc(p.brand || p.category || 'general')}</div></div>
          </div>
          <span class="badge ${p.is_active?'badge-success':'badge-neutral'}">${p.is_active?'Active':'Inactive'}</span>
        </div>
        <hr class="item-card-divider">
        <div class="item-card-fields">
          <div class="item-card-field"><span class="item-card-field-label">Price</span><span class="item-card-field-val">${fmt(p.unit_price)}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">Stock</span><span class="item-card-field-val" style="color:${p.stock_qty <= p.low_stock_alert ? '#f59e0b' : '#22c55e'}">${p.stock_qty} ${esc(p.unit||'')}</span></div>
          <div class="item-card-field"><span class="item-card-field-label">SKU</span><span class="item-card-field-val mono">${esc(p.sku||'—')}</span></div>
        </div>
        <div class="item-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="viewProductDetails('${p.id}')">${ICONS.eye} View</button>
          <button class="btn btn-ghost btn-sm" onclick="openProductForm('${p.id}')">${ICONS.edit} Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteProduct('${p.id}','${esc(p.name)}')" style="color:var(--c-red)">${ICONS.trash}</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function _renderProductTable(filtered) {
  if (filtered.length === 0) return `<div class="empty-state"><h3>No products found</h3></div>`;
  return `<div class="card"><div class="card-body-p0"><div class="table-wrap"><table>
    <thead><tr><th>Product</th><th>SKU / HSN</th><th>Category</th><th style="text-align:right">Price</th><th style="text-align:right">Stock</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      ${filtered.map(p => `<tr>
        <td><div style="font-weight:600">${esc(p.name)}</div><div style="font-size:11px;color:var(--c-text3)">${esc(p.brand||'')}</div></td>
        <td><div class="mono" style="font-size:12px">${esc(p.sku||'—')}</div><div style="font-size:11px;color:var(--c-text3)">HSN: ${esc(p.hsn_code||'—')}</div></td>
        <td><span class="badge badge-neutral">${esc(p.category||'general')}</span></td>
        <td style="text-align:right;font-weight:600">${fmt(p.unit_price)}</td>
        <td style="text-align:right"><span style="font-weight:600;color:${p.stock_qty <= p.low_stock_alert ? '#f59e0b' : '#22c55e'}">${p.stock_qty}</span> <span style="font-size:11px;color:var(--c-text3)">${esc(p.unit)}</span></td>
        <td><span class="badge ${p.is_active ? 'badge-success' : 'badge-neutral'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
        <td><div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewProductDetails('${p.id}')">${ICONS.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="openProductForm('${p.id}')">${ICONS.edit}</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteProduct('${p.id}','${esc(p.name)}')" style="color:var(--c-red)">${ICONS.trash}</button>
        </div></td>
      </tr>`).join('')}
    </tbody>
  </table></div></div></div>`;
}
