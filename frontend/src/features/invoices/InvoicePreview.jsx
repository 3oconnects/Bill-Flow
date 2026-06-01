import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Printer, Send, CheckCircle, Truck, MessageCircle, Bell, BellOff, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { invoicesApi, orgApi } from '@/api'
import { fmt } from '@/lib/utils'
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

function InvoiceTab({ inv, org }) {
  const paidTotal = (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const balance = Number(inv.total || 0) - paidTotal
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
          <div style={{ marginTop: 8 }}><Badge status={inv.status} /></div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span style={{ color: '#10b981' }}>Amount Paid</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{fmt.currency(paidTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderTop: '1px solid #eee' }}>
                <span style={{ fontWeight: 700, color: balance > 0 ? '#ef4444' : '#10b981' }}>Balance Due</span>
                <span style={{ fontWeight: 700, color: balance > 0 ? '#ef4444' : '#10b981' }}>{fmt.currency(balance)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes / Terms */}
      {(inv.notes || inv.terms) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 32, padding: '16px 0', borderTop: '1px solid #eee' }}>
          {inv.notes && <div><div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div><div style={{ fontSize: 12, color: '#555' }}>{inv.notes}</div></div>}
          {inv.terms && <div><div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Terms</div><div style={{ fontSize: 12, color: '#555' }}>{inv.terms}</div></div>}
        </div>
      )}
    </div>
  )
}

function ReceiptTab({ inv }) {
  const payments = inv.payments || []
  if (!payments.length) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>No payments recorded for this invoice.</div>
  )
  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  return (
    <div style={{ background: 'white', color: '#111', padding: 40, borderRadius: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginBottom: 4 }}>✓ PAYMENT RECEIPT</div>
        <div style={{ color: '#555', fontSize: 13 }}>Invoice #{inv.number}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
        <div><div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Customer</div><div style={{ fontWeight: 700 }}>{inv.customer_name}</div></div>
        <div><div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Total Amount</div><div style={{ fontWeight: 800, fontSize: 18, color: '#10b981' }}>{fmt.currency(paid)}</div></div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr><th style={{ padding: '8px 12px', textAlign: 'left', background: '#10b981', color: 'white' }}>Date</th><th style={{ padding: '8px 12px', textAlign: 'left', background: '#10b981', color: 'white' }}>Method</th><th style={{ padding: '8px 12px', textAlign: 'left', background: '#10b981', color: 'white' }}>Reference</th><th style={{ padding: '8px 12px', textAlign: 'right', background: '#10b981', color: 'white' }}>Amount</th></tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 12px' }}>{fmt.date(p.date)}</td>
              <td style={{ padding: '10px 12px', textTransform: 'uppercase', fontSize: 11 }}>{p.method?.replace(/_/g, ' ')}</td>
              <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#888' }}>{p.reference || '—'}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt.currency(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
export default function InvoicePreviewModal({ invoiceId, onClose, onStatusChange, onShipmentChange }) {
  const [tab, setTab] = useState('invoice')
  const { data: inv, isLoading } = useQuery({ queryKey: ['invoice', invoiceId], queryFn: () => invoicesApi.get(invoiceId) })
  const { data: org } = useQuery({ queryKey: ['org'], queryFn: orgApi.get })

  const handlePrint = () => {
    const content = document.getElementById('printable-invoice')
    if (!content) return
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Invoice ${inv?.number}</title><style>body{font-family:sans-serif;margin:0;padding:0;}</style></head><body>`)
    w.document.write(content.innerHTML)
    w.document.write('</body></html>')
    w.document.close()
    w.print()
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
              <button className="btn btn-success" style={{ fontSize: 12 }} onClick={() => onStatusChange('paid')}>
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
              {tab === 'receipt'   && <ReceiptTab inv={inv} />}
              {tab === 'shipment'  && <ShipmentTab inv={inv} onUpdateShipment={onShipmentChange} />}
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
