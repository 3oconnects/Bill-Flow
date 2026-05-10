// js/pages/invoices/scanner.js
function openInvoiceScanner() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'invoice-scanner-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px;width:100%">
      <div class="modal-header">
        <div class="modal-title" style="display:flex;align-items:center;gap:8px">${ICONS.scan} Invoice / QR Scanner</div>
        <button class="btn btn-ghost btn-icon btn-sm" onclick="closeInvoiceScanner()">✕</button>
      </div>
      <div class="modal-body" style="padding:20px">
        <div style="background:#f0f4f8;border-radius:10px;padding:14px;margin-bottom:16px;font-size:12px;color:#5a6478;display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Scan a QR code to instantly view full invoice details, product info, warranty &amp; guarantee.
        </div>
        <div id="inv-qr-reader" style="width:100%;border-radius:10px;overflow:hidden;border:2px solid var(--c-border);min-height:220px;background:#000;display:flex;align-items:center;justify-content:center">
          <div style="color:white;font-size:12px;opacity:0.5">Starting camera…</div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;background:var(--c-surface2);border:2px dashed var(--c-border2);border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;color:var(--c-text2);transition:border-color .15s" onmouseenter="this.style.borderColor='var(--c-primary)'" onmouseleave="this.style.borderColor='var(--c-border2)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Invoice Receipt / QR Image
            <input type="file" accept="image/*" style="display:none" onchange="scanUploadedQRImage(this)">
          </label>
        </div>
        <div style="margin-top:16px">
          <div style="font-size:11px;font-weight:600;color:var(--c-text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Or search by Invoice # or Customer</div>
          <div style="display:flex;gap:8px">
            <input class="form-input" id="scanner-manual-input" placeholder="e.g. INV-0042 or customer name" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();scannerManualSearch(this.value)}" onclick="event.stopPropagation()">
            <button class="btn btn-primary" onclick="scannerManualSearch(document.getElementById('scanner-manual-input').value)">Search</button>
          </div>
        </div>
        <div id="scanner-result" style="margin-top:14px"></div>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeInvoiceScanner(); });
  overlay.querySelector('.modal').addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(overlay);

  setTimeout(() => {
    const el = document.getElementById('inv-qr-reader');
    if (!el || typeof Html5Qrcode === 'undefined') return;
    try {
      const scanner = new Html5Qrcode('inv-qr-reader');
      window._invoiceScannerInstance = scanner;
      scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 180 } }, (decoded) => {
        scanner.pause();
        if (window.navigator?.vibrate) window.navigator.vibrate(150);
        handleScannedQRValue(decoded);
      }, () => {}).catch(() => {});
    } catch(e) {}
  }, 300);
}

async function handleScannedQRValue(decoded) {
  const resEl = document.getElementById('scanner-result');
  if (!resEl) return;
  resEl.innerHTML = `<div style="text-align:center;padding:14px;color:var(--c-text2);font-size:12px"><div class="spinner spin-dark" style="margin:0 auto 8px"></div>Looking up invoice…</div>`;
  const invoiceNumber = decoded.trim();
  const found = _invoices.find(inv => (inv.number || '').toLowerCase() === invoiceNumber.toLowerCase());
  if (found) { closeInvoiceScanner(); previewInvoice(found.id); return; }

  try {
    const resp = await fetch(`/api/qr/invoice/${encodeURIComponent(invoiceNumber)}`);
    if (resp.ok) { const data = await resp.json(); showScannerFullResult(data); return; }
  } catch(e) {}

  if (resEl) resEl.innerHTML = `<div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:10px;font-size:12px;color:#d63d3d">No invoice found for: <strong>${esc(invoiceNumber)}</strong></div>`;
  if (window._invoiceScannerInstance) { try { window._invoiceScannerInstance.resume(); } catch(e) {} }
}

function showScannerFullResult(data) {
  const { invoice, payments, paid_total, balance, org } = data;
  const resEl = document.getElementById('scanner-result');
  if (!resEl) return;
  // ... Simplified view for length ...
  resEl.innerHTML = `<div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:12px;padding:14px">
    <div style="display:flex;justify-content:space-between;margin-bottom:10px">
      <div><div style="font-weight:700;font-size:14px;color:var(--c-primary)">${esc(invoice.number)}</div><div style="font-size:11px;color:var(--c-text2)">${esc(invoice.customer_name)}</div></div>
      <div style="text-align:right"><div style="font-weight:700;font-size:13px">${fmt(invoice.total, invoice.currency)}</div><div style="font-size:11px;color:${balance > 0 ? '#d63d3d' : '#0a8754'}">${balance > 0 ? 'Balance: ' + fmt(balance) : '✓ Fully Paid'}</div></div>
    </div>
    <div style="margin-top:12px"><button class="btn btn-primary btn-sm" style="width:100%" onclick="closeInvoiceScanner();previewInvoice('${invoice.id}')">View Full Invoice</button></div>
  </div>`;
}

function closeInvoiceScanner() {
  if (window._invoiceScannerInstance) {
    try {
      if (window._invoiceScannerInstance.isScanning) {
        window._invoiceScannerInstance.stop().then(() => { window._invoiceScannerInstance.clear(); window._invoiceScannerInstance = null; }).catch(() => {});
      } else { window._invoiceScannerInstance.clear(); window._invoiceScannerInstance = null; }
    } catch(e) { window._invoiceScannerInstance = null; }
  }
  const overlay = document.getElementById('invoice-scanner-overlay');
  if (overlay) overlay.remove();
}

function scannerManualSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const res = document.getElementById('scanner-result');
  if (!res || !q) return;
  const found = _invoices.find(inv => inv.number?.toLowerCase().includes(q) || inv.customer_name?.toLowerCase().includes(q));
  if (found) handleScannedQRValue(found.id);
  else res.innerHTML = `<div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:10px;font-size:12px;color:#d63d3d">No invoice found matching <strong>${esc(q)}</strong></div>`;
}

function scanUploadedQRImage(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const resEl = document.getElementById('scanner-result');
  if (resEl) resEl.innerHTML = `<div style="text-align:center;padding:14px;color:var(--c-text2);font-size:12px"><div class="spinner spin-dark" style="margin:0 auto 8px"></div>Scanning image…</div>`;
  if (typeof jsQR === 'undefined') { if (resEl) resEl.innerHTML = `<div style="color:#d63d3d;font-size:12px;padding:10px">QR scanner library not loaded.</div>`; return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (result && result.data) handleScannedQRValue(result.data);
      else if (resEl) resEl.innerHTML = `<div style="background:#fdf0f0;border:1px solid #f5c6c6;border-radius:8px;padding:10px;font-size:12px;color:#d63d3d">No QR code found.</div>`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
