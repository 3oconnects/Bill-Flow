// js/pages/products/bulk.js

let _bulkRows = [];       // parsed rows from file
let _bulkErrors = [];     // per-row validation errors

function openBulkUpload() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'bulk-upload-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:900px;width:100%;max-height:90vh;display:flex;flex-direction:column" id="bulk-upload-modal">
      <div class="modal-header" style="flex-shrink:0">
        <div class="modal-title" style="display:flex;align-items:center;gap:10px">
          ${ICONS.upload} Bulk Upload Products
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="closeBulkUpload()">✕</button>
      </div>
      <div class="modal-body" style="overflow-y:auto;flex:1;padding:20px" id="bulk-upload-body">
        ${_bulkUploadStep1HTML()}
      </div>
      <div class="modal-footer" style="flex-shrink:0;padding:14px 20px;border-top:1px solid var(--c-border);display:flex;justify-content:space-between;align-items:center" id="bulk-upload-footer">
        <div id="bulk-footer-left" style="font-size:12px;color:var(--c-text3)">Upload a CSV or Excel file to get started</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="closeBulkUpload()">Cancel</button>
          <button class="btn btn-primary" id="bulk-confirm-btn" onclick="confirmBulkUpload()" style="display:none">
            ${ICONS.check} Upload Products
          </button>
        </div>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeBulkUpload(); });
  document.body.appendChild(overlay);
}

function _bulkUploadStep1HTML() {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;background:var(--c-surface2);border:1px solid var(--c-border);border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:10px;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${ICONS.file}
        </div>
        <div>
          <div style="font-weight:600;font-size:13px;margin-bottom:2px">Download Sample Template</div>
          <div style="font-size:12px;color:var(--c-text3)">Use this template to fill in your product data. Required columns are marked with *</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="_downloadBulkTemplate('csv')" style="font-size:12px">CSV</button>
        <button class="btn btn-ghost btn-sm" onclick="_downloadBulkTemplate('xlsx')" style="font-size:12px">Excel</button>
      </div>
    </div>

    <div id="bulk-drop-zone"
      style="border:2px dashed var(--c-border2);border-radius:14px;padding:40px 20px;text-align:center;cursor:pointer;transition:all .2s;background:var(--c-surface2)"
      ondragover="_bulkDragOver(event)" ondragleave="_bulkDragLeave(event)" ondrop="_bulkDrop(event)"
      onclick="document.getElementById('bulk-file-input').click()">
      <div style="width:52px;height:52px;border-radius:14px;background:var(--c-primary-lt,#eff6ff);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
        ${ICONS.upload}
      </div>
      <div style="font-weight:600;font-size:14px;margin-bottom:6px">Drag & drop your file here</div>
      <div style="font-size:12px;color:var(--c-text3);margin-bottom:14px">or click to browse — CSV or Excel (.xlsx)</div>
      <input type="file" id="bulk-file-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="_bulkFileSelected(this)">
    </div>
  `;
}

function _bulkDragOver(e) { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--c-primary)'; }
function _bulkDragLeave(e) { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--c-border2)'; }
function _bulkDrop(e) { e.preventDefault(); _bulkDragLeave(e); const file = e.dataTransfer?.files?.[0]; if (file) _processBulkFile(file); }
function _bulkFileSelected(input) { const file = input.files?.[0]; if (file) _processBulkFile(file); input.value = ''; }

async function _processBulkFile(file) {
  const body = document.getElementById('bulk-upload-body');
  if (body) body.innerHTML = `<div style="text-align:center;padding:40px"><div class="spinner spin-dark"></div> Reading file…</div>`;

  try {
    const ext = file.name.split('.').pop().toLowerCase();
    let rows = [];
    if (ext === 'csv') {
      const text = await file.text();
      rows = _parseCSV(text);
    } else {
      rows = await _parseXLSX(file);
    }

    if (rows.length === 0) throw new Error('No data found in file');
    _bulkRows = rows.map((r, i) => _normalizeBulkRow(r, i));
    _bulkErrors = _bulkRows.map(r => r._errors);
    _renderBulkPreview();
  } catch(e) { _bulkShowError(e.message); }
}

function _parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

async function _parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (typeof XLSX === 'undefined') {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = () => {
          const wb = XLSX.read(e.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(data.map(r => {
            const out = {};
            Object.keys(r).forEach(k => { out[k.toLowerCase().trim()] = String(r[k]).trim(); });
            return out;
          }));
        };
        document.head.appendChild(s);
      } else {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(data.map(r => {
          const out = {};
          Object.keys(r).forEach(k => { out[k.toLowerCase().trim()] = String(r[k]).trim(); });
          return out;
        }));
      }
    };
    reader.readAsBinaryString(file);
  });
}

function _normalizeBulkRow(raw, idx) {
  const errors = [];
  const get = (...keys) => {
    for (const k of keys) {
      const v = raw[k] || raw[k.replace(/ /g, '_')];
      if (v !== undefined && v !== '') return String(v).trim();
    }
    return '';
  };

  const name = get('product name', 'name');
  const unit_price = get('selling price', 'price');
  if (!name) errors.push('Name required');
  if (!unit_price || isNaN(parseFloat(unit_price))) errors.push('Price invalid');

  return {
    _idx: idx, _errors: errors,
    name,
    sku: get('sku', 'code'),
    brand: get('brand'),
    category: get('category'),
    unit_price: parseFloat(unit_price) || 0,
    purchase_price: parseFloat(get('purchase price')) || 0,
    stock_qty: parseFloat(get('stock quantity', 'stock')) || 0,
    tax_rate: parseFloat(get('gst rate')) || 18
  };
}

function _renderBulkPreview() {
  const body = document.getElementById('bulk-upload-body');
  const footer = document.getElementById('bulk-footer-left');
  const btn = document.getElementById('bulk-confirm-btn');
  const valid = _bulkRows.filter((_, i) => !_bulkErrors[i].length).length;

  if (footer) footer.innerHTML = `<span style="color:var(--c-green)">${valid} valid</span> / ${_bulkRows.length} total`;
  if (btn) btn.style.display = valid > 0 ? 'flex' : 'none';

  body.innerHTML = `
    <div style="overflow-x:auto">
      <table class="table" style="font-size:12px">
        <thead><tr><th>#</th><th>Name</th><th>SKU</th><th>Price</th><th>Errors</th></tr></thead>
        <tbody>
          ${_bulkRows.map((r, i) => `
            <tr style="${_bulkErrors[i].length ? 'background:#fee2e2' : ''}">
              <td>${i+1}</td>
              <td>${esc(r.name)}</td>
              <td>${esc(r.sku)}</td>
              <td>${fmt(r.unit_price)}</td>
              <td style="color:#ef4444">${_bulkErrors[i].join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

async function confirmBulkUpload() {
  const valid = _bulkRows.filter((_, i) => !_bulkErrors[i].length);
  const btn = document.getElementById('bulk-confirm-btn');
  btn.disabled = true;
  btn.innerHTML = 'Uploading…';

  try {
    const res = await API.post('/api/products/bulk', { products: valid });
    toast(`${res.succeeded} products uploaded`);
    closeBulkUpload();
    renderProducts(document.querySelector('.page-content'));
  } catch(e) { toast(e.message, 'error'); btn.disabled = false; }
}

function _bulkShowError(msg) {
  const body = document.getElementById('bulk-upload-body');
  body.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444">${esc(msg)}<br><button class="btn btn-secondary btn-sm" onclick="_resetBulkUpload()">Try Again</button></div>`;
}

function _resetBulkUpload() { _bulkRows = []; _bulkErrors = []; openBulkUpload(); }
function closeBulkUpload() { const el = document.getElementById('bulk-upload-overlay'); if (el) el.remove(); }

function _downloadBulkTemplate(format) {
  const headers = ['Product Name*', 'SKU', 'Brand', 'Category', 'Selling Price*', 'Stock Quantity', 'GST Rate'];
  const data = headers.join(',') + '\nSample Product,SKU-001,BrandX,general,100,10,18';
  const blob = new Blob([data], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `product_template.${format}`;
  a.click();
}
