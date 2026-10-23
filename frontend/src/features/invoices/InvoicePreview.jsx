import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Printer, Send, CheckCircle, Truck, MessageCircle, Bell, BellOff, Clock, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { invoicesApi, orgApi } from '@/api'
import { fmt, amountToWords } from '@/lib/utils'
import { Spinner, Badge } from '@/components/ui'

const SHIPMENT_STEPS = ['not_shipped', 'processing', 'shipped', 'delivered']
const SHIPMENT_LABELS = { not_shipped: 'Not Shipped', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' }
const SHIPMENT_COLORS = { not_shipped: '#9aa3b2', processing: '#f59e0b', shipped: '#3b82f6', delivered: '#10b981' }

function ShipmentBar({ status }) {
  const cur = SHIPMENT_STEPS.indexOf(status || 'not_shipped')
  return (
    <div style={{ display: 'flex', gap: 0, margin: '16px 0 8px' }}>
      {SHIPMENT_STEPS.map((s, i) => {
        const done = i <= cur
        const col = done ? SHIPMENT_COLORS[s] : 'var(--border)'
        const radius = i === 0 ? '4px 0 0 4px' : i === SHIPMENT_STEPS.length - 1 ? '0 4px 4px 0' : '0'
        return (
          <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: 4, background: col, borderRadius: radius }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: col, marginTop: -7, border: '2px solid var(--bg)' }} />
            <div style={{ fontSize: 9, color: done ? col : 'var(--text-3)', fontWeight: done ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
              {SHIPMENT_LABELS[s]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InvoiceQRCode({ invoiceNumber }) {
  const qrRef = useRef(null)
  const [downloaded, setDownloaded] = useState(false)

  if (!invoiceNumber) return null

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = 300
      canvas.height = 300
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 300, 300)
      ctx.drawImage(img, 0, 0, 300, 300)
      const link = document.createElement('a')
      link.download = `QR-${invoiceNumber}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 2000)
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '12px 14px',
      border: '1.5px solid #e5e7eb',
      borderRadius: 10,
      background: '#fff',
      width: 116,
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Label */}
      <div style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
        Scan to verify
      </div>

      {/* QR SVG */}
      <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center' }}>
        <QRCodeSVG
          value={invoiceNumber}
          size={80}
          bgColor="#ffffff"
          fgColor="#111827"
          level="M"
        />
      </div>

      {/* Invoice number caption */}
      <div style={{
        fontSize: 9,
        fontFamily: 'monospace',
        fontWeight: 700,
        color: '#374151',
        marginTop: 2,
        textAlign: 'center',
        letterSpacing: '0.04em',
        wordBreak: 'break-all',
      }}>
        {invoiceNumber}
      </div>

      {/* Download button */}
      <button
        className="no-print"
        onClick={handleDownload}
        title="Download QR code as PNG"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          marginTop: 2,
          padding: '4px 10px',
          borderRadius: 6,
          border: '1px solid #e5e7eb',
          background: downloaded ? '#d1fae5' : '#f9fafb',
          color: downloaded ? '#065f46' : '#6366f1',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 700,
          width: '100%',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { if (!downloaded) { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#6366f1' } }}
        onMouseLeave={e => { if (!downloaded) { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb' } }}
      >
        <Download size={10} />
        {downloaded ? 'Saved!' : 'Download'}
      </button>
    </div>
  )
}

function InvoiceTab({ inv, org }) {
  const paidTotal = (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0) || Number(inv.paid_amount || 0)
  const balance = Math.max(0, Number(inv.total || 0) - paidTotal)
  const effectiveStatus = inv.status === 'paid' ? 'paid' :
                         balance <= 0.005 && Number(inv.total || 0) > 0 ? 'paid' :
                         paidTotal > 0 ? 'partially_paid' : inv.status

  return (
    <div id="printable-invoice" style={{ background: 'white', color: '#111', padding: 40, borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111', marginBottom: 4 }}>{org?.name || 'My Business'}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{org?.address}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{[org?.city, org?.state, org?.pincode].filter(Boolean).join(', ')}</div>
          {org?.gstin && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>GSTIN: {org.gstin}</div>}
          {org?.phone && <div style={{ fontSize: 12, color: '#555' }}>Ph: {org.phone}</div>}
          {org?.email && <div style={{ fontSize: 12, color: '#555' }}>{org.email}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1', marginBottom: 4 }}>INVOICE</div>
          <div style={{ fontSize: 13, color: '#555' }}>#{inv.number}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>Date: {fmt.date(inv.date)}</div>
          <div style={{ fontSize: 12, color: '#555' }}>Due: {fmt.date(inv.due_date)}</div>
          <div style={{ marginTop: 8 }}><Badge status={effectiveStatus} /></div>
        </div>
      </div>

      {/* Billing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Bill To</div>
          <div style={{ fontWeight: 700 }}>{inv.customer_name}</div>
          {inv.customer_email && <div style={{ color: '#555' }}>{inv.customer_email}</div>}
          {inv.customer_phone && <div style={{ color: '#555' }}>{inv.customer_phone}</div>}
        </div>
        {inv.place_of_supply && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Place of Supply</div>
            <div style={{ fontWeight: 600 }}>{inv.place_of_supply}</div>
          </div>
        )}
      </div>

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#6366f1', color: 'white' }}>
            {['#', 'Description', 'HSN', 'Qty', 'Unit Price', 'Tax', 'Amount'].map((h) => (
              <th key={h} style={{ padding: '8px 12px', textAlign: h === '#' || h === 'Qty' ? 'center' : h === 'Unit Price' || h === 'Tax' || h === 'Amount' ? 'right' : 'left', fontSize: 11, fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fafafa' : 'white' }}>
              <td style={{ padding: '8px 12px', textAlign: 'center', color: '#888', fontSize: 11 }}>{i + 1}</td>
              <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.description}</td>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#888', fontSize: 11 }}>{item.hsn_code || '—'}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt.currency(item.unit_price)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#888' }}>{item.tax_rate}% = {fmt.currency(item.tax_amount)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt.currency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 280 }}>
          {[
            { label: 'Subtotal', value: fmt.currency(inv.subtotal) },
            inv.discount_amount > 0 && { label: `Discount (${inv.discount_pct}%)`, value: `−${fmt.currency(inv.discount_amount)}`, color: '#ef4444' },
            { label: 'Total Tax', value: fmt.currency(inv.tax) },
          ].filter(Boolean).map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
              <span style={{ color: '#555' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: row.color || '#111' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 4, borderTop: '2px solid #111' }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#6366f1' }}>{fmt.currency(inv.total)}</span>
          </div>
          {paidTotal > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#059669' }}>
                <span style={{ fontWeight: 600 }}>Amount Paid</span>
                <span style={{ fontWeight: 700 }}>{fmt.currency(paidTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, borderTop: '1px solid #e5e7eb', marginTop: 2 }}>
                <span style={{ fontWeight: 800, color: balance > 0.005 ? '#dc2626' : '#059669' }}>
                  {balance > 0.005 ? 'Balance Due' : 'Balance Settled'}
                </span>
                <span style={{ fontWeight: 800, color: balance > 0.005 ? '#dc2626' : '#059669' }}>
                  {balance > 0.005 ? fmt.currency(balance) : '✅ Fully Cleared'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes / Terms + QR Code */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 24,
        marginTop: 32,
        paddingTop: 20,
        borderTop: '1px solid #eee',
      }}>
        {/* Notes & Terms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1 }}>
          {inv.notes && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 12, color: '#555' }}>{inv.notes}</div>
            </div>
          )}
          {inv.terms && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Terms</div>
              <div style={{ fontSize: 12, color: '#555' }}>{inv.terms}</div>
            </div>
          )}
        </div>

        {/* QR Code */}
        <InvoiceQRCode invoiceNumber={inv.number} />
      </div>
    </div>
  )
}

function ReceiptTab({ inv, org }) {
  const payments = inv.payments || []
  const invoiceTotal = Number(inv.total || 0)
  const items = inv.items || []

  // Running totals
  const totalPaid = (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0) || Number(inv.paid_amount || 0)
  const balanceDue = Math.max(0, invoiceTotal - totalPaid)
  const isPartial = balanceDue > 0.005 && totalPaid > 0
  const isFullyPaid = (balanceDue <= 0.005 && invoiceTotal > 0) || inv.status === 'paid'

  const METHOD_ICONS = {
    cash: '💵', bank_transfer: '🏦', cheque: '📝', upi: '📱',
    card: '💳', credit_card: '💳', neft: '🏦', rtgs: '🏦', imps: '🏦',
    online: '🌐', razorpay: '🌐',
  }
  const methodIcon = (m) => METHOD_ICONS[m?.toLowerCase()] || '💰'
  const txnId = (p) => p.transaction_id || p.reference || (p.id ? 'TXN-' + p.id.replace(/-/g, '').slice(-8).toUpperCase() : '—')

  // Print receipt helper
  const handlePrintReceipt = () => {
    const content = document.getElementById('printable-receipt')
    if (!content) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Payment Receipt - ${inv.number}</title><style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 24px;
        color: #111827;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none !important; }
      }
      table { border-collapse: collapse; width: 100%; }
      svg { max-width: 100%; }
    </style></head><body>`)
    w.document.write(content.innerHTML)
    w.document.write('</body></html>')
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  // Share on WhatsApp helper
  const handleShareReceipt = () => {
    const phone = inv.customer_phone?.replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Hi ${inv.customer_name || 'Customer'},\n\nPayment receipt for Invoice *${inv.number}*:\n` +
      `Invoice Total: *${fmt.currency(invoiceTotal)}*\nTotal Paid: *${fmt.currency(totalPaid)}*\n` +
      `Balance Due: *${isFullyPaid ? 'Nil — Fully Settled' : fmt.currency(balanceDue)}*\n\nThank you!`
    )
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, background: '#25D366', color: 'white', border: 'none' }}
          onClick={handleShareReceipt}
          title="Share receipt on WhatsApp"
        >
          <MessageCircle size={13} /> Share WhatsApp
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={handlePrintReceipt} title="Print Receipt">
          <Printer size={13} /> Print Receipt
        </button>
      </div>

      {/* ── Printable Document Container ── */}
      <div id="printable-receipt" style={{ background: '#ffffff', color: '#111827', padding: '36px 44px', borderRadius: 12, border: '1px solid #e5e7eb', fontFamily: 'sans-serif' }}>
        
        {/* 1. Header: Organization Info & Document Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #6366f1', paddingBottom: 20, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {org?.name || 'Ozofi Books Pro'}
            </div>
            {org?.address && <div style={{ fontSize: 12, color: '#4b5563' }}>{org.address}</div>}
            <div style={{ fontSize: 12, color: '#4b5563' }}>
              {[org?.city, org?.state, org?.pincode, org?.country || 'India'].filter(Boolean).join(', ')}
            </div>
            {org?.gstin && <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2 }}>GSTIN: {org.gstin}</div>}
            {(org?.phone || org?.email) && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {[org?.phone && `Ph: ${org.phone}`, org?.email].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: 6,
              background: isFullyPaid ? '#d1fae5' : '#fef3c7',
              color: isFullyPaid ? '#065f46' : '#92400e',
              border: `1px solid ${isFullyPaid ? '#a7f3d0' : '#fde68a'}`,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {isFullyPaid ? '✅ PAYMENT RECEIPT (PAID)' : '⚠️ PARTIAL PAYMENT RECEIPT'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Receipt #: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>REC-{inv.number}</strong>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Date: <span style={{ color: '#111827', fontWeight: 600 }}>{fmt.date(payments[0]?.date || inv.date)}</span>
            </div>
          </div>
        </div>

        {/* 2. Customer & Invoice Context Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
          {/* Customer */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Received From (Customer)
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{inv.customer_name || 'Valued Customer'}</div>
            {inv.customer_email && <div style={{ fontSize: 12, color: '#475569' }}>Email: {inv.customer_email}</div>}
            {inv.customer_phone && <div style={{ fontSize: 12, color: '#475569' }}>Phone: {inv.customer_phone}</div>}
            {inv.place_of_supply && <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Place of Supply: <strong>{inv.place_of_supply}</strong></div>}
          </div>

          {/* Invoice References */}
          <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Invoice Reference Details
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Invoice Number:</span>
              <strong style={{ color: '#0f172a' }}>#{inv.number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Invoice Date:</span>
              <span>{fmt.date(inv.date)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Payment Due Date:</span>
              <span>{fmt.date(inv.due_date)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Invoice Status:</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 700, color: isFullyPaid ? '#16a34a' : '#d97706' }}>{inv.status}</span>
            </div>
          </div>
        </div>

        {/* 3. Invoice Items Summary Table */}
        {items.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Billed Items Summary
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#334155', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 36 }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item & Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', width: 90 }}>HSN</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 60 }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 90 }}>Price</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 80 }}>Tax</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 100 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{it.description}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748b' }}>{it.hsn_code || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt.currency(it.unit_price)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>{it.tax_rate}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt.currency(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Payment History Table */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Payment History & Transaction Breakdown ({payments.length} payment{payments.length !== 1 ? 's' : ''})
          </div>

          {!payments.length ? (
            <div style={{ padding: 20, textAlign: 'center', background: '#fffbe8', border: '1px dashed #ffe58f', borderRadius: 8, color: '#856404', fontSize: 13 }}>
              ⚠️ No payment transactions recorded yet for this invoice.
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 140px 1fr 110px 110px', background: '#1e293b', color: '#ffffff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '10px 14px', gap: 8 }}>
                <div>Date</div>
                <div>Payment Method</div>
                <div>Transaction / Ref ID</div>
                <div style={{ textAlign: 'right' }}>Amount Paid</div>
                <div style={{ textAlign: 'right' }}>Balance After</div>
              </div>

              {(() => {
                let runningBal = invoiceTotal
                return payments.map((p, i) => {
                  const amt = Number(p.amount || 0)
                  runningBal = Math.max(0, runningBal - amt)
                  return (
                    <div key={p.id || i} style={{
                      display: 'grid', gridTemplateColumns: '100px 140px 1fr 110px 110px',
                      padding: '12px 14px', gap: 8,
                      borderTop: i > 0 ? '1px solid #f1f5f9' : undefined,
                      background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                      alignItems: 'center',
                      fontSize: 12,
                    }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{fmt.date(p.date)}</div>
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#f0fdf4', border: '1px solid #bbf7d0',
                          borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#166534',
                          textTransform: 'uppercase',
                        }}>
                          {methodIcon(p.method)} {(p.method || 'payment').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{txnId(p)}</div>
                        {p.notes && <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>Note: {p.notes}</div>}
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: 13 }}>
                        +{fmt.currency(amt)}
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: runningBal <= 0.005 ? '#16a34a' : '#dc2626' }}>
                        {runningBal <= 0.005 ? '✅ Cleared' : fmt.currency(runningBal)}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>

        {/* 5. Financial Summary & Amount in Words */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, borderTop: '2px solid #e2e8f0', paddingTop: 20, marginBottom: 24 }}>
          {/* Amount in Words */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Total Amount Paid in Words
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b', fontStyle: 'italic', lineHeight: 1.4 }}>
              "{amountToWords(totalPaid)}"
            </div>
            {isPartial && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#92400e', background: '#fffbeb', border: '1px solid #fef3c7', padding: '6px 10px', borderRadius: 6 }}>
                ⚠️ Partial payment received. Remaining balance: <strong>{fmt.currency(balanceDue)}</strong>.
              </div>
            )}
          </div>

          {/* Totals Column */}
          <div>
            {[
              { label: 'Invoice Total', value: fmt.currency(invoiceTotal), bold: false, color: '#334155' },
              inv.discount_amount > 0 && { label: `Discount (${inv.discount_pct}%)`, value: `−${fmt.currency(inv.discount_amount)}`, bold: false, color: '#dc2626' },
              inv.tax > 0 && { label: 'Total Tax (GST)', value: fmt.currency(inv.tax), bold: false, color: '#334155' },
              { label: `Total Received (${payments.length} txn)`, value: fmt.currency(totalPaid), bold: true, color: '#16a34a' },
            ].filter(Boolean).map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>{row.label}</span>
                <span style={{ fontWeight: row.bold ? 700 : 500, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', marginTop: 4, borderTop: '2px solid #0f172a' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Balance Due</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: isFullyPaid ? '#16a34a' : '#dc2626' }}>
                {isFullyPaid ? '✅ Nil' : fmt.currency(balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Authorized Signatory & QR Code Footer */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid #e2e8f0',
          paddingTop: 20,
          marginTop: 20,
        }}>
          {/* Terms / Declaration */}
          <div style={{ flex: 1, paddingRight: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>
              ✅ Received With Thanks
            </div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
              This is a computer-generated payment receipt issued by {org?.name || 'Ozofi Books Pro'}.
              Thank you for your business!
            </div>
          </div>

          {/* QR Code */}
          <div style={{ paddingRight: 24 }}>
            <InvoiceQRCode invoiceNumber={inv.number} />
          </div>

          {/* Signature Box */}
          <div style={{ textAlign: 'center', width: 170 }}>
            <div style={{ height: 44, borderBottom: '1.5px dashed #cbd5e1', marginBottom: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Authorized Signatory</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{org?.name || 'Authorized Stamp'}</div>
          </div>
        </div>

      </div>
    </div>
  )
}

function ShipmentTab({ inv, onUpdateShipment }) {
  const [loading, setLoading] = useState(false)
  const status = inv.shipment_status || 'not_shipped'
  const cur = SHIPMENT_STEPS.indexOf(status)
  const next = SHIPMENT_STEPS[cur + 1]

  const update = async (s) => {
    setLoading(true)
    try { await onUpdateShipment(s) } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Current Status</div>
        <span style={{ fontSize: 15, fontWeight: 700, padding: '6px 16px', borderRadius: 20, background: `${SHIPMENT_COLORS[status]}22`, color: SHIPMENT_COLORS[status] }}>
          {SHIPMENT_LABELS[status]}
        </span>
      </div>
      <ShipmentBar status={status} />
      {next && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-primary" onClick={() => update(next)} disabled={loading}>
            {loading ? <Spinner size={14} /> : <><Truck size={14} /> Mark as {SHIPMENT_LABELS[next]}</>}
          </button>
        </div>
      )}
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Object.entries(inv).filter(([k]) => ['tracking_number', 'courier', 'delivery_address'].includes(k)).map(([k, v]) => v && (
          <div key={k} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize', marginBottom: 4 }}>{k.replace(/_/g, ' ')}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Reminders Tab ─────────────────────────────────────────────────────
const BEFORE_DUE_OPTIONS = [
  { days: 7,  label: '7 days before due' },
  { days: 3,  label: '3 days before due' },
  { days: 1,  label: '1 day before due'  },
]
const OVERDUE_OPTIONS = [
  { days: 1,  label: '1 day overdue'  },
  { days: 7,  label: '7 days overdue' },
  { days: 14, label: '14 days overdue' },
  { days: 30, label: '30 days overdue' },
]

function RemindersTab({ inv }) {
  const [beforeDue, setBeforeDue] = useState({ 7: false, 3: true, 1: false })
  const [overdue,   setOverdue]   = useState({ 1: true, 7: true, 14: false, 30: false })
  const [channel,   setChannel]   = useState({ email: true, whatsapp: false })
  const [saved,     setSaved]     = useState(false)

  const toggleBefore = (days) => setBeforeDue(p => ({ ...p, [days]: !p[days] }))
  const toggleOverdue = (days) => setOverdue(p => ({ ...p, [days]: !p[days] }))

  const isPaid = inv?.status === 'paid' || inv?.status === 'cancelled'

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleSendNow = () => {
    const phone = inv?.customer_phone?.replace(/\D/g, '')
    const amount = fmt.currency(inv?.total)
    const due    = fmt.date(inv?.due_date)
    const msg = encodeURIComponent(
      `Hi ${inv?.customer_name},\n\nThis is a reminder for invoice *${inv?.number}* for *${amount}* due on *${due}*.\n\nPlease process payment at your earliest convenience.\n\nThank you!`
    )
    const url = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>

      {isPaid && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#d1fae5', borderRadius: 10, marginBottom: 24, color: '#065f46', fontSize: 13, fontWeight: 600 }}>
          <CheckCircle2 size={18} /> This invoice is {inv.status} — no reminders needed.
        </div>
      )}

      {/* Notification channels */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Notification Channels
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { key: 'email',     icon: '📧', label: 'Email' },
            { key: 'whatsapp',  icon: '💬', label: 'WhatsApp' },
          ].map(ch => (
            <label key={ch.key} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              border: `2px solid ${channel[ch.key] ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, cursor: 'pointer', flex: 1,
              background: channel[ch.key] ? 'var(--accent-lt, #eff6ff)' : 'transparent',
              transition: '0.2s',
            }}>
              <input
                type="checkbox"
                checked={channel[ch.key]}
                onChange={() => setChannel(p => ({ ...p, [ch.key]: !p[ch.key] }))}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: 16 }}>{ch.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{ch.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Before-due reminders */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Clock size={15} color="var(--accent)" />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Before Due Date
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BEFORE_DUE_OPTIONS.map(opt => (
            <label key={opt.days} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: beforeDue[opt.days] ? 'var(--accent-lt, #eff6ff)' : 'var(--bg-2)',
              border: `1px solid ${beforeDue[opt.days] ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, cursor: isPaid ? 'not-allowed' : 'pointer', transition: '0.15s',
              opacity: isPaid ? 0.5 : 1,
            }}>
              <input
                type="checkbox"
                checked={beforeDue[opt.days]}
                disabled={isPaid}
                onChange={() => toggleBefore(opt.days)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
              />
              <Bell size={14} color={beforeDue[opt.days] ? 'var(--accent)' : 'var(--text-3)'} />
              <span style={{ fontSize: 13, fontWeight: beforeDue[opt.days] ? 600 : 400 }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Overdue reminders */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertTriangle size={15} color="#ef4444" />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            After Due Date (Overdue)
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {OVERDUE_OPTIONS.map(opt => (
            <label key={opt.days} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: overdue[opt.days] ? '#fff5f5' : 'var(--bg-2)',
              border: `1px solid ${overdue[opt.days] ? '#fca5a5' : 'var(--border)'}`,
              borderRadius: 8, cursor: isPaid ? 'not-allowed' : 'pointer', transition: '0.15s',
              opacity: isPaid ? 0.5 : 1,
            }}>
              <input
                type="checkbox"
                checked={overdue[opt.days]}
                disabled={isPaid}
                onChange={() => toggleOverdue(opt.days)}
                style={{ accentColor: '#ef4444', width: 16, height: 16 }}
              />
              <BellOff size={14} color={overdue[opt.days] ? '#ef4444' : 'var(--text-3)'} />
              <span style={{ fontSize: 13, fontWeight: overdue[opt.days] ? 600 : 400 }}>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={isPaid}>
          {saved ? <><CheckCircle2 size={14} /> Saved!</> : <><Bell size={14} /> Save Reminder Settings</>}
        </button>
        {!isPaid && (
          <button
            className="btn btn-ghost"
            style={{ background: '#25D366', color: 'white', border: 'none' }}
            onClick={handleSendNow}
          >
            <MessageCircle size={14} /> Send WhatsApp Reminder Now
          </button>
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)' }}>
        Reminders will be sent to {inv?.customer_email || "the customer's email"}
        {inv?.customer_phone ? ` and ${inv.customer_phone}` : ''}.
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────
export default function InvoicePreviewModal({ invoiceId, onClose, onStatusChange, onShipmentChange, initialTab = 'invoice' }) {
  const [tab, setTab] = useState(initialTab)
  const qc = useQueryClient()
  const { data: inv, isLoading } = useQuery({ queryKey: ['invoice', invoiceId], queryFn: () => invoicesApi.get(invoiceId) })
  const { data: org } = useQuery({ queryKey: ['org'], queryFn: orgApi.get })

  // Self-sufficient handlers: use the parent's callback if provided, otherwise
  // perform the update here so the modal works when opened from any page.
  const statusMut = useMutation({
    mutationFn: (status) => invoicesApi.updateStatus(invoiceId, status),
    onSuccess: () => qc.invalidateQueries(['invoice', invoiceId]) && qc.invalidateQueries(['invoices']),
  })
  const shipmentMut = useMutation({
    mutationFn: (status) => invoicesApi.updateShipment(invoiceId, status),
    onSuccess: () => qc.invalidateQueries(['invoice', invoiceId]) && qc.invalidateQueries(['invoices']),
  })
  const handleStatusChange   = onStatusChange   || ((s) => statusMut.mutateAsync(s))
  const handleShipmentChange = onShipmentChange || ((s) => shipmentMut.mutateAsync(s))

  const handlePrint = () => {
    const content = document.getElementById('printable-invoice')
    if (!content) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Invoice ${inv?.number || ''}</title><style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 24px;
        color: #111827;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @media print {
        body { padding: 0; }
        .no-print { display: none !important; }
      }
      table { border-collapse: collapse; width: 100%; }
      svg { max-width: 100%; }
    </style></head><body>`)
    w.document.write(content.innerHTML)
    w.document.write('</body></html>')
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  const handleWhatsApp = () => {
    if (!inv) return
    const phone = inv.customer_phone?.replace(/\D/g, '')
    const amount = fmt.currency(inv.total)
    const due    = fmt.date(inv.due_date)
    const msg = encodeURIComponent(
      `Hi ${inv.customer_name},\n\nPlease find your invoice *${inv.number}* for *${amount}* dated ${fmt.date(inv.date)}.\n\nDue date: *${due}*\n\nKindly make the payment at your earliest convenience. Thank you!`
    )
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  const TABS = [
    { id: 'invoice',   emoji: '📄', label: 'Invoice'   },
    { id: 'receipt',   emoji: '🧾', label: 'Receipt'   },
    { id: 'shipment',  emoji: '🚚', label: 'Shipment'  },
    { id: 'reminders', emoji: '🔔', label: 'Reminders' },
  ]

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, width: '92vw', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Invoice — {inv?.number}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {inv && ['sent', 'overdue'].includes(inv.status) && (
              <button className="btn btn-success" style={{ fontSize: 12 }} onClick={() => handleStatusChange('paid')}>
                <CheckCircle size={13} /> Mark Paid
              </button>
            )}
            {/* WhatsApp Share button */}
            {inv && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, background: '#25D366', color: 'white', border: 'none' }}
                onClick={handleWhatsApp}
                title="Share invoice on WhatsApp"
              >
                <MessageCircle size={13} /> WhatsApp
              </button>
            )}
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={handlePrint}>
              <Printer size={13} /> Print
            </button>
            <button className="topbar-icon-btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {TABS.map(({ id: t, emoji, label }) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 16px', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13,
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              color: tab === t ? 'var(--accent)' : 'var(--text-2)', transition: '0.2s',
            }}>
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={32} /></div>
          ) : inv ? (
            <>
              {tab === 'invoice'   && <InvoiceTab inv={inv} org={org} />}
              {tab === 'receipt'   && <ReceiptTab inv={inv} org={org} />}
              {tab === 'shipment'  && <ShipmentTab inv={inv} onUpdateShipment={handleShipmentChange} />}
              {tab === 'reminders' && <RemindersTab inv={inv} />}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Invoice not found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
