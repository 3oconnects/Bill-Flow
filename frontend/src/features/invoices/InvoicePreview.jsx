import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Printer, Send, CheckCircle, Truck, Download, Share2, Copy, Mail, MessageSquare, ShieldCheck } from 'lucide-react'
import { invoicesApi, orgApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Spinner, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'

const SHIPMENT_STEPS = ['not_shipped', 'processing', 'shipped', 'delivered']
const SHIPMENT_LABELS = { not_shipped: 'Not Shipped', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' }
const SHIPMENT_COLORS = { not_shipped: '#9aa3b2', processing: '#f59e0b', shipped: '#3b82f6', delivered: '#10b981' }

function InvoiceTab({ inv, org }) {
  const isIGST = org?.state?.toLowerCase() !== inv.place_of_supply?.toLowerCase()
  
  return (
    <div id="printable-invoice" className="invoice-container" style={{ background: 'white', color: '#111', padding: '40px 50px', borderRadius: 12, fontSize: 13, lineHeight: 1.6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', minHeight: '1000px', display: 'flex', flexDirection: 'column' }}>
      {/* Watermark for draft */}
      {inv.status === 'draft' && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: 120, fontWeight: 900, color: 'rgba(0,0,0,0.03)', pointerEvents: 'none', zIndex: 0 }}>DRAFT</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '2px solid #f1f5f9', paddingBottom: 30 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>{org?.name || 'BILL FLOW PRO'}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Enterprise ERP Solutions</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#475569', maxWidth: 300 }}>
            {org?.address}<br />
            {[org?.city, org?.state, org?.pincode].filter(Boolean).join(', ')}<br />
            {org?.gstin && <span style={{ fontWeight: 700, color: '#1e293b' }}>GSTIN: {org.gstin}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: '#e2e8f0', marginTop: -10, marginBottom: 4, letterSpacing: '2px' }}>TAX INVOICE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Invoice No: <span style={{ color: 'var(--accent)' }}>#{inv.number}</span></div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Date: <span style={{ color: '#1e293b', fontWeight: 600 }}>{fmt.date(inv.date)}</span></div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Due Date: <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmt.date(inv.due_date)}</span></div>
        </div>
      </div>

      {/* Billing Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 10, border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Bill To</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{inv.customer_name}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            {inv.customer_id_display && <div>ID: {inv.customer_id_display}</div>}
            {inv.customer_email && <div>{inv.customer_email}</div>}
            {inv.customer_phone && <div>{inv.customer_phone}</div>}
          </div>
        </div>
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Shipping & Supply</div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Place of Supply:</span> {inv.place_of_supply || 'N/A'}</div>
            <div><span style={{ fontWeight: 600 }}>Tax Type:</span> {inv.tax_type?.toUpperCase() || 'EXCLUSIVE'}</div>
            {inv.sales_person && <div><span style={{ fontWeight: 600 }}>Sales Person:</span> {inv.sales_person}</div>}
          </div>
        </div>
        <div style={{ padding: '4px 0', textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Reference</div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            {inv.reference_number && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 600 }}>PO/Ref:</span> {inv.reference_number}</div>}
            <div><span style={{ fontWeight: 600 }}>Currency:</span> {inv.currency || 'INR'}</div>
            <div><span style={{ fontWeight: 600 }}>Status:</span> <Badge status={inv.status} /></div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30, borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '12px 15px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>HSN</th>
              <th style={{ padding: '12px 15px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Qty</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Price</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Discount</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>GST %</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(inv.items || []).map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '15px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.description}</div>
                  {item.sku && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>SKU: {item.sku}</div>}
                </td>
                <td style={{ padding: '15px', textAlign: 'center', fontSize: 11, color: '#64748b' }}>{item.hsn_code || '—'}</td>
                <td style={{ padding: '15px', textAlign: 'center' }}>{item.quantity} <span style={{ fontSize: 10, color: '#94a3b8' }}>{item.unit || 'pcs'}</span></td>
                <td style={{ padding: '15px', textAlign: 'right' }}>{fmt.currency(item.unit_price)}</td>
                <td style={{ padding: '15px', textAlign: 'right', color: '#ef4444', fontSize: 11 }}>{item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}</td>
                <td style={{ padding: '15px', textAlign: 'right', color: '#64748b' }}>{item.tax_rate}%</td>
                <td style={{ padding: '15px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{fmt.currency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financials & Footer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, marginTop: 'auto' }}>
        <div>
          {/* GST Breakdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>Tax Breakdown</div>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Rate</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {isIGST ? (
                  <tr>
                    <td style={{ padding: '6px 10px' }}>IGST</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>Mixed</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt.currency(inv.tax)}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td style={{ padding: '6px 10px' }}>CGST</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>Mixed</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt.currency(inv.tax / 2)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 10px' }}>SGST</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>Mixed</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt.currency(inv.tax / 2)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 12, color: '#475569' }}>{inv.notes || 'No special notes.'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#64748b' }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{fmt.currency(inv.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#64748b' }}>Item Discount</span>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>-{fmt.currency(inv.discount_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ color: '#64748b' }}>GST Total</span>
            <span style={{ fontWeight: 600 }}>{fmt.currency(inv.tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: 10, borderTop: '2px solid #0f172a' }}>
            <span style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase' }}>Grand Total</span>
            <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--accent)' }}>{fmt.currency(inv.total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, marginTop: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: '#166534' }}>Amount Paid</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#166534' }}>{fmt.currency(inv.paid_amount || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, marginTop: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: '#991b1b' }}>Balance Due</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#991b1b' }}>{fmt.currency(inv.due_amount || 0)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div style={{ marginTop: 60, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>Payment Details</div>
          <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
              <div style={{ width: 80, height: 80, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=upi://pay?pa=billflow@bank&am=${inv.due_amount}&tn=Invoice-${inv.number}`} alt="Payment QR" />
              </div>
              <div style={{ fontSize: 10, color: '#475569' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>Payment QR</span><br />
                Bank: Global Bank<br />
                Scan to Pay UPI
              </div>
            </div>

            <div style={{ display: 'flex', gap: 15, alignItems: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: 30 }}>
              <div style={{ width: 80, height: 80, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${inv.number}`} alt="Tracking QR" />
              </div>
              <div style={{ fontSize: 10, color: '#475569' }}>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>Tracking QR</span><br />
                Invoice: {inv.number}<br />
                Internal Lookup
              </div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <div style={{ width: 200, height: 60, borderBottom: '1px solid #cbd5e1', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Signature Placeholder */}
            <div style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: 12 }}>Authorized Signatory</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>For {org?.name || 'BILL FLOW PRO'}</div>
        </div>
      </div>

      <div style={{ marginTop: 40, textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 20, fontSize: 11, color: '#94a3b8' }}>
        This is a computer generated invoice and does not require a physical signature.
      </div>
    </div>
  )
}

function ReceiptTab({ inv }) {
  const payments = inv.payments || []
  if (!payments.length) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-3)' }}>
       <ShieldCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.1 }} />
       <div style={{ fontSize: 16, fontWeight: 600 }}>No payments recorded</div>
       <div style={{ fontSize: 14 }}>Payments will appear here once recorded.</div>
    </div>
  )
  return (
    <div style={{ background: 'white', color: '#111', padding: 40, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'inline-flex', padding: 12, background: '#f0fdf4', borderRadius: '50%', color: '#10b981', marginBottom: 16 }}>
          <CheckCircle size={32} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Payment Receipt</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>Invoice #{inv.number}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30, padding: 24, background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Customer</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{inv.customer_name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Total Paid</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>{fmt.currency(inv.paid_amount)}</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderRadius: '8px 0 0 8px' }}>Date</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Method</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Reference</th>
            <th style={{ padding: '12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '15px 12px' }}>{fmt.date(p.date)}</td>
              <td style={{ padding: '15px 12px' }}>
                <span style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, padding: '4px 8px', background: '#f1f5f9', borderRadius: 4 }}>
                  {p.method?.replace(/_/g, ' ')}
                </span>
              </td>
              <td style={{ padding: '15px 12px', fontFamily: 'monospace', color: '#64748b' }}>{p.reference || '—'}</td>
              <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 800 }}>{fmt.currency(p.amount)}</td>
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
    <div style={{ padding: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'inline-flex', padding: 16, background: '#eff6ff', borderRadius: '50%', color: '#3b82f6', marginBottom: 20 }}>
          <Truck size={40} />
        </div>
        <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8 }}>Track Shipment</div>
        <div style={{ display: 'inline-block' }}>
           <Badge status={status} label={SHIPMENT_LABELS[status]} />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: 60 }}>
          <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 4, background: '#f1f5f9', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 12, left: 0, width: `${(cur / (SHIPMENT_STEPS.length - 1)) * 100}%`, height: 4, background: '#3b82f6', zIndex: 1, transition: '0.5s' }} />
          
          {SHIPMENT_STEPS.map((s, i) => {
            const done = i <= cur
            return (
              <div key={s} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#3b82f6' : 'white', border: `4px solid ${done ? '#eff6ff' : '#f1f5f9'}`, boxShadow: done ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none' }} />
                <div style={{ fontSize: 11, fontWeight: done ? 800 : 600, color: done ? '#1e293b' : '#94a3b8', marginTop: 12, textAlign: 'center' }}>{SHIPMENT_LABELS[s]}</div>
              </div>
            )
          })}
        </div>

        {next && (
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary" style={{ padding: '12px 32px' }} onClick={() => update(next)} disabled={loading}>
              {loading ? <Spinner size={16} /> : <><CheckCircle size={16} /> Mark as {SHIPMENT_LABELS[next]}</>}
            </button>
          </div>
        )}

        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
           <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Courier Partner</div>
              <div style={{ fontWeight: 700 }}>{inv.courier || 'FedEx Express'}</div>
           </div>
           <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Tracking Number</div>
              <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{inv.tracking_number || 'TRK-9876543210'}</div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default function InvoicePreviewModal({ invoiceId, onClose, onStatusChange, onShipmentChange }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState('invoice')
  const { data: inv, isLoading } = useQuery({ queryKey: ['invoice', invoiceId], queryFn: () => invoicesApi.get(invoiceId) })
  const { data: org } = useQuery({ queryKey: ['org'], queryFn: orgApi.get })

  const duplicateMut = useMutation({
    mutationFn: (id) => invoicesApi.duplicate(id),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Invoice duplicated'); onClose(); },
    onError: (e) => toast.error(e.message),
  })

  const handlePrint = () => {
    const content = document.getElementById('printable-invoice')
    if (!content) return
    const w = window.open('', '_blank')
    w.document.write(`
      <html>
        <head>
          <title>Invoice ${inv?.number}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 20px; background: #f1f5f9; }
            .invoice-container { background: white !important; box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; padding: 20px !important; }
            @media print {
              body { background: white; padding: 0; }
              .invoice-container { padding: 0 !important; }
              button, .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>${content.outerHTML}</body>
      </html>
    `)
    w.document.close()
    setTimeout(() => { w.print(); w.close(); }, 500)
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, width: '96vw', maxWidth: 1000, maxHeight: '96vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>Invoice Overview</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>#{inv?.number} &bull; {inv?.customer_name}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {inv && ['sent', 'overdue', 'partially_paid'].includes(inv.status) && (
              <button className="btn btn-success sm" onClick={() => onStatusChange('paid')}>
                <CheckCircle size={14} /> Mark Paid
              </button>
            )}
            <button className="btn btn-ghost sm" onClick={() => duplicateMut.mutate(invoiceId)}>
              <Copy size={14} /> Duplicate
            </button>
            <button className="btn btn-ghost sm" onClick={handlePrint}>
              <Printer size={14} /> Print
            </button>
            <div className="dropdown">
              <button className="btn btn-ghost sm" style={{ gap: 8 }}>
                <span>Share</span>
                <Share2 size={14} />
              </button>
              <div className="dropdown-content right">
                <button className="dropdown-item"><Mail size={14} /> Email Invoice</button>
                <button className="dropdown-item"><MessageSquare size={14} /> WhatsApp</button>
                <button className="dropdown-item"><Download size={14} /> Download PDF</button>
              </div>
            </div>
            <button className="topbar-icon-btn red" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 10 }}>
          {['invoice', 'receipt', 'shipment'].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '14px 20px', background: 'none', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em',
              borderBottom: `3px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              color: tab === t ? 'var(--accent)' : 'var(--text-3)', transition: '0.2s',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              {t === 'invoice' ? <Download size={14} /> : t === 'receipt' ? <ShieldCheck size={14} /> : <Truck size={14} />}
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 30, background: '#f8fafc' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 80 }}><Spinner size={40} /></div>
          ) : inv ? (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              {tab === 'invoice' && <InvoiceTab inv={inv} org={org} />}
              {tab === 'receipt' && <ReceiptTab inv={inv} />}
              {tab === 'shipment' && <ShipmentTab inv={inv} onUpdateShipment={onShipmentChange} />}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-3)' }}>Invoice data unavailable.</div>
          )}
        </div>
      </div>
    </div>
  )
}
