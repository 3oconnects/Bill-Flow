// js/pages/invoices/preview.js
async function previewInvoice(id) {
  const inv = await API.getInvoice(id);
  const org = APP.org;
  const payments = inv.payments || [];
  const paidTotal = payments.reduce((s,p) => s + p.amount, 0);
  const shipStatus = inv.shipment_status || 'not_shipped';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'inv-preview-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.innerHTML = `
    <div class="modal modal-xl" style="max-height:92vh;display:flex;flex-direction:column">
      <div class="modal-header">
        <div class="modal-title">Invoice — ${esc(inv.number)}</div>
        <div style="display:flex;gap:8px">
          ${['sent','overdue'].includes(inv.status) ? `<button class="btn btn-success btn-sm" onclick="this.closest('.modal-overlay').remove();openPaymentModal('${id}')">${ICONS.payment} Record Payment</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="printInvoice('${id}')">${ICONS.print} Print PDF</button>
          <button class="btn btn-secondary btn-sm" onclick="downloadReceipt('${id}')">🧾 Receipt PDF</button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
      </div>
      <div style="display:flex;gap:0;border-bottom:1px solid var(--c-border);padding:0 20px">
        <button class="inv-tab-btn active" id="tab-invoice" onclick="_invTab('invoice')" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid var(--c-primary);font-weight:600;cursor:pointer;font-size:13px;color:var(--c-primary)">📄 Invoice</button>
        <button class="inv-tab-btn" id="tab-receipt" onclick="_invTab('receipt')" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;font-weight:600;cursor:pointer;font-size:13px;color:var(--c-text2)">🧾 Receipt</button>
        <button class="inv-tab-btn" id="tab-shipment" onclick="_invTab('shipment')" style="padding:10px 16px;background:none;border:none;border-bottom:2px solid transparent;font-weight:600;cursor:pointer;font-size:13px;color:var(--c-text2)">🚚 Shipment</button>
      </div>
      <div class="modal-body" style="overflow-y:auto;flex:1">
        <div id="inv-tab-invoice">${_generateInvoiceHTML(inv, org, paidTotal)}</div>
        <div id="inv-tab-receipt" style="display:none">${_generateReceiptHTML(inv, payments, paidTotal)}</div>
        <div id="inv-tab-shipment" style="display:none">${_generateShipmentHTML(inv, shipStatus)}</div>
      </div>
    </div>`;

  document.getElementById('modal-container').appendChild(overlay);
  setTimeout(() => {
    const qrEl = document.getElementById('inv-preview-qr');
    if (qrEl && typeof QRCode !== 'undefined') new QRCode(qrEl, { text: inv.number, width: 100, height: 100, correctLevel: QRCode.CorrectLevel.M });
  }, 100);
}

function _invTab(tab) {
  ['invoice','receipt','shipment'].forEach(t => {
    const el = document.getElementById('inv-tab-' + t); const btn = document.getElementById('tab-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
    if (btn) { btn.style.borderBottomColor = t === tab ? 'var(--c-primary)' : 'transparent'; btn.style.color = t === tab ? 'var(--c-primary)' : 'var(--c-text2)'; }
  });
}

async function _setShipStatus(invId, status) {
  await API.updateShipment(invId, status);
  toast('Shipment updated: ' + SHIPMENT_LABELS[status], 'success');
  document.getElementById('inv-preview-overlay').remove();
  previewInvoice(invId);
}

async function downloadReceipt(invId) {
  const inv = await API.getInvoice(invId);
  if (!inv.payments?.length) { toast('No payment recorded yet', 'error'); return; }
  downloadReceiptById(invId, inv.payments[inv.payments.length-1].id);
}

const SHIPMENT_STEPS = ['not_shipped','processing','shipped','delivered'];
const SHIPMENT_LABELS = { not_shipped:'Not Shipped', processing:'Processing', shipped:'Shipped', delivered:'Delivered' };
const SHIPMENT_COLORS = { not_shipped:'#9aa3b2', processing:'#f59e0b', shipped:'#3b82f6', delivered:'#10b981' };

function shipmentBadge(status) {
  const s = status || 'not_shipped'; const col = SHIPMENT_COLORS[s] || '#9aa3b2';
  return `<span style="background:${col}22;color:${col};border:1px solid ${col}44;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${SHIPMENT_LABELS[s]||s}</span>`;
}

function shipmentProgressBar(status) {
  const cur = SHIPMENT_STEPS.indexOf(status || 'not_shipped');
  return `<div style="display:flex;gap:0;margin:10px 0 6px">
    ${SHIPMENT_STEPS.map((s,i) => {
      const done = i <= cur; const col = done ? SHIPMENT_COLORS[s] : 'var(--c-border)';
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:100%;height:4px;background:${col};border-radius:${i===0?'4px 0 0 4px':i===3?'0 4px 4px 0':'0'}"></div>
        <div style="width:10px;height:10px;border-radius:50%;background:${col};margin-top:-7px;border:2px solid var(--c-bg)"></div>
        <div style="font-size:9px;color:${done?col:'var(--c-text3)'};font-weight:${done?'700':'400'};text-transform:uppercase;letter-spacing:.04em">${SHIPMENT_LABELS[s]}</div>
      </div>`;
    }).join('')}
  </div>`;
}
