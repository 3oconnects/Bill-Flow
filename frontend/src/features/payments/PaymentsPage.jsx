import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, CreditCard, FileText, TrendingUp, Search, Calendar, Landmark, Eye } from 'lucide-react'
import { paymentsApi, invoicesApi } from '@/api'
import { fmt, PAYMENT_METHODS } from '@/lib/utils'
import { PageLoading, EmptyState, Spinner, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { useTopbarStore } from '@/store/topbarStore'
import { confirmAction } from '@/store/confirmStore'
import Modal from '@/components/Modal'
import { useForm } from 'react-hook-form'

function InvoiceItemsSection({ invoiceId }) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
    enabled: !!invoiceId,
  })

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: 16, color: 'var(--c-text3)', fontSize: 13 }}>
      Loading products…
    </div>
  )
  const items = invoice?.items || []
  if (!items.length) return null

  return (
    <div style={{ background: 'var(--c-surface2)', borderRadius: 10, border: '1px solid var(--c-border)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '9px 14px', background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        🛒 Products Purchased ({items.length} item{items.length !== 1 ? 's' : ''})
      </div>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '11px 16px',
          borderBottom: i < items.length - 1 ? '1px solid var(--c-border)' : undefined,
          background: i % 2 === 0 ? 'transparent' : 'var(--c-surface)',
          gap: 12,
        }}>
          {/* Left: product info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.description || '—'}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
              {item.sku && (
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--c-text3)', background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>
                  {item.sku}
                </span>
              )}
              {item.hsn_code && (
                <span style={{ fontSize: 10, color: 'var(--c-text3)' }}>HSN: {item.hsn_code}</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                Qty: <strong style={{ color: 'var(--c-text)' }}>{item.quantity}</strong>
                {' × '}
                <strong style={{ color: 'var(--c-text)' }}>{fmt.currency(item.unit_price)}</strong>
              </span>
              {Number(item.tax_rate) > 0 && (
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  GST {item.tax_rate}% = {fmt.currency(item.tax_amount)}
                </span>
              )}
            </div>
          </div>
          {/* Right: line total */}
          <div style={{ fontWeight: 800, fontSize: 14, color: '#6366f1', whiteSpace: 'nowrap' }}>
            {fmt.currency(item.amount)}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentDetailModal({ paymentId, onClose }) {
  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => paymentsApi.get(paymentId),
    enabled: !!paymentId,
  })

  const METHOD_ICONS = {
    cash: '💵', bank_transfer: '🏦', cheque: '📝', upi: '📱',
    card: '💳', credit_card: '💳', neft: '🏦', rtgs: '🏦', imps: '🏦',
    online: '🌐', razorpay: '🌐',
  }
  const methodIcon = (m) => METHOD_ICONS[m?.toLowerCase()] || '💰'

  const txnId = (p) =>
    p?.transaction_id || p?.reference ||
    (p?.id ? 'TXN-' + p.id.replace(/-/g, '').slice(-8).toUpperCase() : '—')

  const STATUS_COLORS = {
    completed: { bg: '#d1fae5', color: '#065f46' },
    pending:   { bg: '#fef3c7', color: '#92400e' },
    failed:    { bg: '#fee2e2', color: '#991b1b' },
    reversed:  { bg: '#f1f5f9', color: '#475569' },
  }

  return (
    <Modal title="Payment Details" onClose={onClose} size="md">
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div className="spinner spinner-dark" style={{ margin: '0 auto' }} />
          <div style={{ marginTop: 12, color: 'var(--c-text3)', fontSize: 13 }}>Loading payment details…</div>
        </div>
      ) : !payment ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--c-text3)' }}>Payment not found.</div>
      ) : (() => {
        const totalAmt     = Number(payment.amount || 0)
        const allocatedAmt = Number(payment.allocated_amount || 0)
        const unappliedAmt = Number(payment.unapplied_amount ?? (totalAmt - allocatedAmt))
        const allocations  = payment.allocations || []
        
        // Modern payments use the allocation engine; fallback to legacy direct invoice join
        const primaryAlloc = allocations.length === 1 ? allocations[0] : allocations.length > 0 ? allocations[0] : null
        const invTotal     = Number(primaryAlloc?.invoice_total || payment.invoice_total || 0)
        const invPaid      = Number(primaryAlloc?.invoice_paid_amount || payment.invoice_paid_amount || 0)
        const invStatus    = primaryAlloc?.invoice_status || payment.invoice_status || 'unpaid'
        const invBalance   = Math.max(0, invTotal - invPaid)
        
        // Status checks
        const isFullyPaid  = invStatus === 'paid' || (invTotal > 0 && invBalance <= 0.005)
        const isPartial    = invStatus === 'partially_paid' || (invTotal > 0 && invBalance > 0.005 && invPaid > 0)
        const paidPct      = invTotal > 0 ? Math.min(100, Math.round((invPaid / invTotal) * 100)) : 100
        const statusStyle  = STATUS_COLORS[payment.status] || { bg: '#f1f5f9', color: '#475569' }
        
        const methodDisplay = (payment.method || 'payment').replace(/_/g, ' ')

        return (
          <div style={{ padding: '4px 0' }}>

            {/* ── Payment Status Hero ── */}
            <div style={{
              borderRadius: 14,
              background: isFullyPaid
                ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
                : isPartial
                ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
                : 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              border: `1.5px solid ${isFullyPaid ? '#6ee7b7' : isPartial ? '#fcd34d' : '#93c5fd'}`,
              padding: '20px 20px 16px',
              marginBottom: 18,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>
                {isFullyPaid ? '✅' : isPartial ? '⚠️' : '💰'}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: '#111', marginBottom: 6 }}>
                {fmt.currency(totalAmt, payment.currency)}
              </div>
              {/* Full / Partial badge */}
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  display: 'inline-block', padding: '5px 18px', borderRadius: 20,
                  fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em',
                  background: isFullyPaid ? '#059669' : isPartial ? '#d97706' : '#3b82f6',
                  color: '#fff',
                }}>
                  {isFullyPaid 
                    ? `✓ Fully Paid via ${methodDisplay}` 
                    : isPartial 
                    ? `⚡ Partial via ${methodDisplay}` 
                    : `💰 Received via ${methodDisplay}`}
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: 12, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>📅 {fmt.date(payment.date || payment.payment_date)}</span>
                {payment.status && (
                  <span style={{
                    padding: '1px 10px', borderRadius: 12,
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    background: statusStyle.bg, color: statusStyle.color,
                  }}>
                    {payment.status}
                  </span>
                )}
                {payment.currency && payment.currency !== 'INR' && (
                  <span style={{ background: '#f1f5f9', padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {payment.currency}
                  </span>
                )}
              </div>
            </div>

            {/* ── Payment Progress Bar ── */}
            {invTotal > 0 && (
              <div style={{
                background: 'var(--c-surface2)', borderRadius: 10, border: '1px solid var(--c-border)',
                padding: '14px 16px', marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: 'var(--c-text2)' }}>Invoice Payment Progress</span>
                  <span style={{ fontWeight: 800, color: isFullyPaid ? '#059669' : '#d97706' }}>{paidPct}%</span>
                </div>
                <div style={{ height: 10, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{
                    height: '100%', borderRadius: 6, width: `${paidPct}%`,
                    background: isFullyPaid
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : 'linear-gradient(90deg, #f59e0b, #d97706)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--c-text3)' }}>
                    Invoice Total: <strong style={{ color: 'var(--c-text)' }}>{fmt.currency(invTotal)}</strong>
                  </span>
                  <span>
                    {isFullyPaid
                      ? <strong style={{ color: '#059669' }}>✅ Fully Cleared</strong>
                      : <span style={{ color: 'var(--c-text3)' }}>Balance Due: <strong style={{ color: '#ef4444' }}>{fmt.currency(invBalance)}</strong></span>
                    }
                  </span>
                </div>
              </div>
            )}

            {/* ── Transaction / Payment Info ── */}
            <div style={{ background: 'var(--c-surface2)', borderRadius: 10, border: '1px solid var(--c-border)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '9px 14px', background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                💳 Payment Information
              </div>

              {/* Payment Mode — prominent */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderBottom: '1px solid var(--c-border)',
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: '#ede9fe', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 24,
                }}>
                  {methodIcon(payment.method)}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                    Payment Mode
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {(payment.method || 'payment').replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* Transaction ID — highlighted box */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--c-border)', background: '#fafafa' }}>
                <div style={{ fontSize: 10, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
                  🔖 Transaction ID / UTR
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 14, fontWeight: 800,
                  color: '#1e1b4b', letterSpacing: '.06em',
                  background: '#e0e7ff', padding: '7px 14px', borderRadius: 8,
                  display: 'inline-block', border: '1px solid #c7d2fe',
                }}>
                  {txnId(payment)}
                </div>
              </div>

              {/* Other fields */}
              {[
                payment.reference && payment.transaction_id && payment.reference !== payment.transaction_id && {
                  label: 'Reference', value: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{payment.reference}</span>,
                },
                { label: 'Customer',      value: payment.customer_name || '—' },
                payment.customer_email && { label: 'Email',        value: payment.customer_email },
                payment.customer_phone && { label: 'Phone',        value: payment.customer_phone },
                { label: 'Payment Date', value: fmt.date(payment.date || payment.payment_date) },
                {
                  label: 'Linked Invoice',
                  value: payment.invoice_number
                    ? <span style={{ fontWeight: 700, color: 'var(--c-primary)' }}>#{payment.invoice_number}</span>
                    : <span style={{ color: 'var(--c-text3)' }}>Not linked to an invoice</span>,
                },
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 16px', borderBottom: '1px solid var(--c-border)', fontSize: 13,
                }}>
                  <span style={{ color: 'var(--c-text2)', flexShrink: 0, marginRight: 16 }}>{label}</span>
                  <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
                </div>
              ))}

              {payment.notes && (
                <div style={{ padding: '10px 16px', fontSize: 13 }}>
                  <div style={{ color: 'var(--c-text2)', marginBottom: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>📝 Notes</div>
                  <div style={{ color: 'var(--c-text)', fontStyle: 'italic' }}>{payment.notes}</div>
                </div>
              )}
            </div>

            {/* ── Products Purchased ── */}
            {payment.invoice_id && (
              <InvoiceItemsSection invoiceId={payment.invoice_id} />
            )}

            {/* ── Allocation breakdown ── */}
            {allocations.length > 0 && (
              <div style={{ background: 'var(--c-surface2)', borderRadius: 10, border: '1px solid var(--c-border)', overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '9px 14px', background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  🧾 Invoice Allocations ({allocations.length})
                </div>
                {allocations.map((a, i) => {
                  const allAmt = Number(a.amount || 0)
                  const invT   = Number(a.invoice_total || 0)
                  const invP   = Number(a.invoice_paid_amount || 0)
                  const invBal = Math.max(0, invT - invP)
                  return (
                    <div key={a.id || i} style={{
                      padding: '12px 16px',
                      borderBottom: i < allocations.length - 1 ? '1px solid var(--c-border)' : undefined,
                      background: i % 2 === 0 ? 'transparent' : 'var(--c-surface)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--c-primary)', fontSize: 13 }}>#{a.invoice_number}</span>
                          {a.invoice_status && (
                            <span style={{
                              marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                              padding: '1px 8px', borderRadius: 12,
                              background: a.invoice_status === 'paid' ? '#d1fae5' : a.invoice_status === 'partially_paid' ? '#fef3c7' : '#f1f5f9',
                              color: a.invoice_status === 'paid' ? '#065f46' : a.invoice_status === 'partially_paid' ? '#92400e' : '#475569',
                            }}>
                              {a.invoice_status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#10b981' }}>+{fmt.currency(allAmt)}</span>
                      </div>
                      {invT > 0 && (
                        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--c-text3)' }}>
                          <span>Invoice: <strong style={{ color: 'var(--c-text)' }}>{fmt.currency(invT)}</strong></span>
                          <span>Paid: <strong style={{ color: '#10b981' }}>{fmt.currency(invP)}</strong></span>
                          <span>Balance: <strong style={{ color: invBal > 0.005 ? '#ef4444' : '#10b981' }}>
                            {invBal <= 0.005 ? '✅ Cleared' : fmt.currency(invBal)}
                          </strong></span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Amount Summary ── */}
            <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
                Amount Summary
              </div>
              {[
                { label: 'Total Payment',        value: fmt.currency(totalAmt),     color: '#111',    bold: false },
                { label: 'Allocated to Invoice', value: fmt.currency(allocatedAmt), color: '#10b981', bold: true },
                { label: 'Unapplied / Advance',  value: fmt.currency(unappliedAmt), color: unappliedAmt > 0 ? '#f59e0b' : '#94a3b8', bold: unappliedAmt > 0 },
              ].map(({ label, value, color, bold }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ fontWeight: bold ? 700 : 500, color }}>{value}</span>
                </div>
              ))}
              {invTotal > 0 && (
                <>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ fontWeight: 700 }}>Invoice Balance Due</span>
                    <span style={{ fontWeight: 800, color: invBalance > 0.005 ? '#ef4444' : '#10b981' }}>
                      {invBalance <= 0.005 ? '✅ Nil — Fully Paid' : fmt.currency(invBalance)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={onClose}>Close</button>
            </div>
          </div>
        )
      })()}
    </Modal>
  )
}

function PaymentForm({ invoices, onSuccess, onCancel }) {
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { 
      method: 'bank_transfer', 
      currency: 'INR', 
      date: new Date().toISOString().split('T')[0],
      reference: 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    },
  })
  const selectedInvoiceId = watch('invoice_id')
  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId)

  const mutation = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess,
    onError: (e) => toast.error(e.message),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="payment-form-compact">
      <div className="form-group">
        <label className="form-label">LINKED INVOICE</label>
        <select className="form-select select-sm" {...register('invoice_id')}>
          <option value="">General payment (no invoice)</option>
          {invoices
            .filter((i) => !['paid', 'cancelled'].includes(i.status))
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.number} — {i.customer_name} ({fmt.currency(i.total)})
              </option>
            ))}
        </select>
        {selectedInvoice && (
          <div className="invoice-summary-mini" style={{ marginTop: 10, padding: '12px', background: 'var(--c-surface2)', borderRadius: 10, border: '1px solid var(--c-border)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--c-text2)' }}>Outstanding Balance</span>
                <span style={{ fontWeight: 700, color: 'var(--c-text)' }}>{fmt.currency(selectedInvoice.total)}</span>
             </div>
          </div>
        )}
      </div>

      <div className="form-row cols-2 compact" style={{ marginTop: 16 }}>
        <div className="form-group">
          <label className="form-label">AMOUNT (₹) *</label>
          <div style={{ position: 'relative' }}>
             <input className="form-input input-sm" type="number" step="0.01"
                {...register('amount', { required: true })}
                defaultValue={selectedInvoice?.total || ''}
                placeholder="0.00" style={{ paddingLeft: 30 }} />
             <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--c-text3)' }}>₹</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">DATE *</label>
          <input className="form-input input-sm" type="date" {...register('date', { required: true })} />
        </div>
      </div>

      <div className="form-row cols-2 compact" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">PAYMENT METHOD</label>
          <select className="form-select select-sm" {...register('method')}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ').toUpperCase()}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">TRANSACTION ID / UTR #</label>
          <input className="form-input input-sm mono" {...register('reference')} placeholder="e.g. TXN987654321" />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">INTERNAL NOTES</label>
        <textarea className="form-textarea input-sm" {...register('notes')} rows={2} placeholder="Add any private notes here..." />
      </div>

      <div className="modal-footer-actions" style={{ marginTop: 24, padding: '16px 0 0', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ minWidth: 140, fontWeight: 700 }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : 'Record Payment'}
        </button>
      </div>
    </form>
  )
}

export default function PaymentsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all') // 'all', 'fully_paid', 'partially_paid', 'advance'
  const [previewInvoiceId, setPreviewInvoiceId] = useState(null)
  const [selectedPaymentId, setSelectedPaymentId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.list,
  })

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesApi.list,
  })

  const cancelMut = useMutation({
    mutationFn: (id) => paymentsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries(['payments'])
      qc.invalidateQueries(['invoices'])
      toast.success('Payment record cancelled and reversed')
    },
    onError: (e) => toast.error(e.message),
  })

  const { setActions, setContext, clear } = useTopbarStore()

  useEffect(() => {
    setContext('Receipts & Payments', 'Customer Collections')
    setActions(
      <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
        <Plus size={15} /> Record Payment
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  // Helper to determine payment/invoice status: strictly 'fully_paid' or 'partially_paid' (or 'cancelled')
  const getPaymentStatus = (p) => {
    if (p.status === 'cancelled' || p.status === 'reversed') return 'cancelled'
    if (p.invoice_status === 'paid') return 'fully_paid'
    if (p.invoice_status === 'partially_paid') return 'partially_paid'
    const invTotal = Number(p.invoice_total || 0)
    const paidAmt = Number(p.invoice_paid_amount || p.allocated_amount || p.amount || 0)
    if (invTotal > 0) {
      if (paidAmt >= invTotal - 0.005) return 'fully_paid'
      return 'partially_paid'
    }
    if (Number(p.unapplied_amount || 0) > 0) return 'partially_paid'
    return 'fully_paid'
  }

  const renderStatusBadge = (p) => {
    const st = getPaymentStatus(p)
    if (st === 'cancelled') return <Badge status="cancelled" label="Cancelled" />
    if (st === 'partially_paid') return <Badge status="processing" label="Partially Paid" />
    return <Badge status="paid" label="Fully Paid" />
  }

  const filtered = payments.filter((p) => {
    const st = getPaymentStatus(p)
    const matchTab = statusTab === 'all' || st === statusTab
    const q = search.toLowerCase().trim()
    const matchSearch = !q ||
      p.customer_name?.toLowerCase().includes(q) ||
      p.invoice_number?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      p.transaction_id?.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const handleViewPayment = (p) => {
    if (p.invoice_id) {
      setPreviewInvoiceId(p.invoice_id)
    } else {
      setSelectedPaymentId(p.id)
    }
  }

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalAllocated = payments.reduce((s, p) => s + Number(p.allocated_amount || 0), 0)
  const totalUnapplied = payments.reduce((s, p) => s + Number(p.unapplied_amount || 0), 0)

  const counts = {
    all: payments.length,
    fully_paid: payments.filter((p) => getPaymentStatus(p) === 'fully_paid').length,
    partially_paid: payments.filter((p) => getPaymentStatus(p) === 'partially_paid').length,
  }

  const METHOD_ICONS = {
    cash: '💵', bank_transfer: '🏦', cheque: '📝', upi: '📱',
    card: '💳', credit_card: '💳', neft: '🏦', rtgs: '🏦', imps: '🏦',
    online: '🌐', razorpay: '🌐',
  }
  const methodIcon = (m) => METHOD_ICONS[m?.toLowerCase()] || '💰'

  if (loadingPayments) return <PageLoading />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stat Cards */}
      <div className="inv-stats-grid">
        <div className="inv-stat-card">
          <div className="inv-stat-icon inv-stat-icon--green"><CreditCard /></div>
          <div className="inv-stat-body">
            <span className="inv-stat-label">Total Collected</span>
            <div className="inv-stat-row">
              <span className="inv-stat-value">{fmt.currency(totalCollected)}</span>
              <span className="inv-stat-sub">{payments.length} Records</span>
            </div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon inv-stat-icon--blue"><TrendingUp /></div>
          <div className="inv-stat-body">
            <span className="inv-stat-label">Fully Paid Collections</span>
            <div className="inv-stat-row">
              <span className="inv-stat-value">{counts.fully_paid}</span>
              <span className="inv-stat-sub">Completed</span>
            </div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon inv-stat-icon--orange"><Landmark /></div>
          <div className="inv-stat-body">
            <span className="inv-stat-label">Partially Paid</span>
            <div className="inv-stat-row">
              <span className="inv-stat-value">{counts.partially_paid}</span>
              <span className="inv-stat-sub">Pending Full Settlement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="inv-filter-bar">
        <div className="inv-filter-left">
          <div className="inv-search-wrap">
            <Search className="inv-search-icon" />
            <input
              className="inv-search-input"
              type="text"
              placeholder="Search by customer, TXN ID, or invoice #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="inv-filter-right">
          <div className="pill-tabs">
            {[
              { id: 'all', label: `All (${counts.all})` },
              { id: 'fully_paid', label: `Fully Paid (${counts.fully_paid})` },
              { id: 'partially_paid', label: `Partially Paid (${counts.partially_paid})` },
            ].map((t) => (
              <button
                key={t.id}
                className={`pill-tab${statusTab === t.id ? ' active' : ''}`}
                onClick={() => setStatusTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2347', marginBottom: 6 }}>
              No payment records found
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>
              {search ? 'No results for your search query.' : 'Record a payment against an invoice to get started.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Transaction / Ref #</th>
                  <th>Customer</th>
                  <th>Linked Invoice</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const txn = p.transaction_id || p.reference || (p.id ? 'TXN-' + p.id.replace(/-/g, '').slice(-8).toUpperCase() : '—')
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => handleViewPayment(p)}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--c-primary)' }}>
                          {txn}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.customer_name || '—'}</div>
                        {p.customer_email && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{p.customer_email}</div>}
                      </td>
                      <td>
                        {p.invoice_number ? (
                          <span className="inv-num-link" onClick={(e) => { e.stopPropagation(); setPreviewInvoiceId(p.invoice_id) }}>
                            #{p.invoice_number}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>General Advance</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{fmt.date(p.date || p.payment_date)}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: '#f0fdf4', border: '1px solid #bbf7d0',
                          borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#15803d',
                          textTransform: 'uppercase',
                        }}>
                          <span>{methodIcon(p.method)}</span>
                          <span>{(p.method || 'payment').replace(/_/g, ' ')}</span>
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--c-green)', fontSize: 14 }}>
                        +{fmt.currency(p.amount, p.currency)}
                      </td>
                      <td>
                        {renderStatusBadge(p)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="tbl-actions">
                          <button className="topbar-icon-btn" title="View Receipt / Details" onClick={() => handleViewPayment(p)}>
                            <Eye size={14} />
                          </button>
                          <button
                            className="topbar-icon-btn"
                            title="Reverse / Cancel Payment"
                            onClick={() => confirmAction('Are you sure you want to cancel and reverse this payment?', () => cancelMut.mutate(p.id))}
                            style={{ color: 'var(--red)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Receipt Modal (Opens directly on Receipt Tab) */}
      {previewInvoiceId && (
        <InvoicePreview
          invoiceId={previewInvoiceId}
          initialTab="receipt"
          onClose={() => setPreviewInvoiceId(null)}
        />
      )}

      {/* Unlinked Payment Detail Modal */}
      {selectedPaymentId && (
        <PaymentDetailModal
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}

      {/* Record Payment Modal */}
      {formOpen && (
        <Modal title="Record Customer Payment" onClose={() => setFormOpen(false)} size="md">
          <PaymentForm
            invoices={invoices}
            onSuccess={() => {
              setFormOpen(false)
              qc.invalidateQueries(['payments'])
              qc.invalidateQueries(['invoices'])
              toast.success('Payment recorded successfully')
            }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
