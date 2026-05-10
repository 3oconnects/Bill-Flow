// js/pages/invoices/components.js
function _generateInvoiceHTML(inv, org, paidTotal) {
  return `
    <div class="inv-preview">
      <div class="inv-preview-header">
        <div>
          <div class="inv-biz-name">${esc(org?.name || 'Business Name')}</div>
          ${org?.address ? `<div style="font-size:12px;color:var(--c-text2);white-space:pre-line;margin-top:3px">${esc(org.address)}</div>` : ''}
          ${org?.gstin ? `<div style="font-size:12px;color:var(--c-text2)">GSTIN: ${esc(org.gstin)}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div class="inv-meta-title">TAX INVOICE</div>
          <div class="inv-meta-num">${esc(inv.number)}</div>
          <div style="font-size:12px;color:var(--c-text2);margin-top:4px">Date: ${fmtDate(inv.date)}</div>
          <div style="font-size:12px;color:var(--c-text2)">Due: ${fmtDate(inv.due_date)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:4px">BILL TO</div>
          <div style="font-weight:600;font-size:14px">${esc(inv.customer_name)}</div>
          ${inv.customer_phone ? `<div style="font-size:12px;color:var(--c-text2)">📞 ${esc(inv.customer_phone)}</div>` : ''}
        </div>
        ${inv.place_of_supply ? `<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:4px">PLACE OF SUPPLY</div><div style="font-size:13px">${esc(inv.place_of_supply)}</div></div>` : ''}
      </div>
      <div class="table-wrap" style="margin-bottom:16px">
        <table class="inv-table">
          <thead><tr><th>#</th><th>Description</th><th>SKU</th><th>HSN</th><th>Vendor</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            ${(inv.items || []).map((it, i) => `<tr>
              <td style="color:var(--c-text2)">${i + 1}</td>
              <td><strong>${esc(it.description)}</strong></td>
              <td class="mono" style="font-size:11px">${esc(it.sku || '—')}</td>
              <td class="mono">${esc(it.hsn_code || '—')}</td>
              <td style="font-size:12px">${esc(it.vendor_name || '—')}</td>
              <td style="text-align:center">${it.quantity}</td>
              <td style="text-align:right">${fmt(it.unit_price, inv.currency)}</td>
              <td style="text-align:right;font-weight:500">${fmt(it.amount, inv.currency)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="inv-total-section">
        <div style="min-width:260px">
          <div class="total-row"><span class="total-label">Subtotal</span><span>${fmt(inv.subtotal, inv.currency)}</span></div>
          ${inv.discount_amount > 0 ? `<div class="total-row"><span class="total-label">Discount</span><span class="amt-green">− ${fmt(inv.discount_amount, inv.currency)}</span></div>` : ''}
          <div class="total-row"><span class="total-label">Tax</span><span>${fmt(inv.tax, inv.currency)}</span></div>
          <div class="total-row grand"><span>Total</span><span style="color:var(--c-primary)">${fmt(inv.total, inv.currency)}</span></div>
        </div>
      </div>
      <div style="border-top:1px solid var(--c-border);padding-top:16px;margin-top:12px;display:flex;align-items:flex-start;gap:20px">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--c-text3);letter-spacing:.06em;margin-bottom:8px">SCAN FOR DETAILS</div>
          <div id="inv-preview-qr" style="background:#fff;padding:8px;border:1px solid var(--c-border);border-radius:8px;display:inline-block"></div>
        </div>
      </div>
    </div>`;
}

function _generateReceiptHTML(inv, payments, paidTotal) {
  const balance = Math.max(0, (inv.total || 0) - paidTotal);
  return `<div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:12px;padding:24px">
    <div style="display:flex;justify-content:space-between;margin-bottom:20px">
      <div><div style="font-size:20px;font-weight:800;color:var(--c-primary)">${esc(inv.number)}</div><div style="font-size:11px;color:var(--c-text2)">Receipt</div></div>
      <div>${balance <= 0 ? `<span class="badge badge-success">✓ FULLY PAID</span>` : `<span class="badge badge-warning">⏳ PARTIAL</span>`}</div>
    </div>
    <div style="font-size:12px;margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:4px">Payments Received</div>
      ${payments.map(p => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--c-border)">
        <span>${fmtDate(p.date)} (${p.method})</span>
        <span style="font-weight:700;color:var(--c-green)">+ ${fmt(p.amount)}</span>
      </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:800">
        <span>Total Paid</span><span>${fmt(paidTotal)}</span>
      </div>
    </div>
  </div>`;
}

function _generateShipmentHTML(inv, shipStatus) {
  return `<div style="background:var(--c-surface2);border:1px solid var(--c-border);border-radius:12px;padding:24px">
    <div style="font-size:16px;font-weight:700;margin-bottom:10px">Shipment Progress</div>
    ${shipmentProgressBar(shipStatus)}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px">
      ${SHIPMENT_STEPS.map(s => {
        const active = s === shipStatus; const col = SHIPMENT_COLORS[s];
        return `<button onclick="_setShipStatus('${inv.id}','${s}')" style="padding:10px;border-radius:8px;border:2px solid ${active?col:'var(--c-border)'};background:${active?col+'18':'#fff'};cursor:pointer">
          <div style="font-size:11px;font-weight:700;color:${active?col:'var(--c-text2)'}">${SHIPMENT_LABELS[s]}</div>
        </button>`;
      }).join('')}
    </div>
  </div>`;
}
