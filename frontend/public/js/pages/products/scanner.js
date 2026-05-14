// js/pages/products/scanner.js

function openProductScanner() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'product-scanner-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px">
      <div class="modal-header">
        <div class="modal-title">${ICONS.scan} Scan Product SKU/Barcode</div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="closeProductScanner()">✕</button>
      </div>
      <div class="modal-body" style="padding:0">
        <div id="prod-qr-reader" style="width:100%;background:#000;min-height:300px"></div>
        <div style="padding:20px">
          <div style="display:flex;gap:10px;margin-bottom:15px">
            <button class="btn btn-secondary btn-sm" style="flex:1" onclick="document.getElementById('prod-scan-file').click()">
              ${ICONS.upload} Upload Image
            </button>
            <input type="file" id="prod-scan-file" accept="image/*" style="display:none" onchange="scanProductUploadedImage(this)">
          </div>
          <div id="prod-scanner-result"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  setTimeout(() => {
    if (typeof Html5Qrcode !== 'undefined') {
      const scanner = new Html5Qrcode('prod-qr-reader');
      window._productScannerInstance = scanner;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 200 } },
        (decoded) => { handleScannedProductValue(decoded); },
        () => {}
      ).catch(err => {
        document.getElementById('prod-qr-reader').innerHTML = `<div style="padding:40px;color:#ef4444;text-align:center">Camera Error: ${err}</div>`;
      });
    }
  }, 100);
}

async function handleScannedProductValue(decoded) {
  const resEl = document.getElementById('prod-scanner-result');
  if (!resEl) return;
  const code = decoded.trim();
  resEl.innerHTML = `<div style="text-align:center;padding:10px"><div class="spinner spin-dark"></div> Matching ${esc(code)}…</div>`;

  const match = _products.find(p => p.sku === code || p.barcode === code);
  if (match) {
    resEl.innerHTML = `
      <div style="background:#f0fdf4;padding:15px;border-radius:10px;border:1px solid #bbf7d0">
        <div style="font-weight:700">${esc(match.name)}</div>
        <div style="font-size:12px;color:var(--c-text3)">SKU: ${esc(match.sku)} · Stock: ${match.stock_qty}</div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="closeProductScanner();viewProductDetails('${match.id}')">View</button>
          <button class="btn btn-ghost btn-sm" onclick="closeProductScanner();openProductForm('${match.id}')">Edit</button>
        </div>
      </div>`;
  } else {
    resEl.innerHTML = `
      <div style="background:#fff7ed;padding:15px;border-radius:10px;border:1px solid #fed7aa">
        <div style="font-weight:700;color:#92400e">Not Found</div>
        <div style="font-size:12px">No product matches SKU: ${esc(code)}</div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="closeProductScanner();openProductFormWithSKU('${esc(code)}')">Create New</button>
      </div>`;
  }
}

function closeProductScanner() {
  if (window._productScannerInstance) {
    window._productScannerInstance.stop().then(() => {
      window._productScannerInstance.clear();
      window._productScannerInstance = null;
    }).catch(() => {});
  }
  const el = document.getElementById('product-scanner-overlay');
  if (el) el.remove();
}

function openProductFormWithSKU(sku) {
  openProductForm();
  setTimeout(() => {
    const el = document.getElementById('pf-sku');
    if (el) { el.value = sku; el.focus(); }
  }, 200);
}

async function scanProductUploadedImage(input) {
  const file = input.files?.[0]; if (!file) return;
  if (typeof Html5Qrcode !== 'undefined') {
    try {
      const decoded = await Html5Qrcode.scanFile(file, true);
      handleScannedProductValue(decoded);
    } catch(e) { toast('Could not read barcode from image', 'error'); }
  }
}
