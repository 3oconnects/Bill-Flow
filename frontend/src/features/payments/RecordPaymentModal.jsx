import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, X } from 'lucide-react'
import { paymentsApi, invoicesApi } from '@/api'
import { fmt, PAYMENT_METHODS } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'

/**
 * Record a customer payment.
 *
 * Two modes:
 *   1. Opened from an invoice detail page — pass `invoice` prop; field is locked,
 *      amount defaults to outstanding balance, customer info shown read-only.
 *   2. Opened from the global Payments page — leave `invoice` undefined; user
 *      picks an unpaid invoice from the searchable list (or "no invoice").
 */
export default function RecordPaymentModal({ invoice, onClose, onSuccess }) {
  const qc = useQueryClient()

  // Only fetch the invoice list when running in "global" mode.
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesApi.list,
    enabled: !invoice,
  })

  const locked = !!invoice

  const outstanding = useMemo(() => {
    if (!invoice) return 0
    return Math.max(
      0,
      Number(invoice.total || 0) -
      Number(invoice.paid_amount || 0) -
      Number(invoice.credited_amount || 0),
    )
  }, [invoice])

  const [form, setForm] = useState({
    invoice_id: invoice?.id || '',
    amount:     outstanding ? outstanding.toFixed(2) : '',
    date:       new Date().toISOString().split('T')[0],
    method:     'bank_transfer',
    reference:  '',
    notes:      '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // In global mode, when the user picks an invoice, prefill the amount.
  const onPickInvoice = (id) => {
    setForm(f => ({ ...f, invoice_id: id }))
    const inv = invoices.find(i => i.id === id)
    if (inv) {
      const outs = Math.max(
        0,
        Number(inv.total || 0) -
        Number(inv.paid_amount || 0) -
        Number(inv.credited_amount || 0),
      )
      if (outs > 0) setForm(f => ({ ...f, invoice_id: id, amount: outs.toFixed(2) }))
    }
  }

  const mutation = useMutation({
    mutationFn: () => paymentsApi.create({
      invoice_id: form.invoice_id || null,
      amount:     Number(form.amount),
      date:       form.date,
      method:     form.method,
      reference:  form.reference || null,
      notes:      form.notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['payments'])
      qc.invalidateQueries(['invoice', form.invoice_id])
      qc.invalidateQueries(['invoices'])
      qc.invalidateQueries(['customers'])
      toast.success('Payment recorded')
      onSuccess?.()
      onClose()
    },
    onError: (e) => toast.error(e.message || 'Failed to record payment'),
  })

  const submit = () => {
    const amt = Number(form.amount)
    if (!amt || amt <= 0) return toast.error('Enter a positive amount')
    if (locked && amt > outstanding + 0.01) {
      return toast.error(`Amount exceeds outstanding balance (${fmt.currency(outstanding)})`)
    }
    if (!form.date) return toast.error('Date is required')
    mutation.mutate()
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'var(--c-primary-lt)', color: 'var(--c-primary)',
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Record Payment</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                {locked ? `Against invoice ${invoice.number}` : 'Pick an invoice or record a general payment'}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Invoice context */}
          {locked ? (
            <div style={{
              background: 'var(--c-surface2, var(--c-bg))', border: '1px solid var(--c-border)',
              borderRadius: 8, padding: 12, marginBottom: 14,
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12,
            }}>
              <div>
                <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Customer</div>
                <div style={{ fontWeight: 600 }}>{invoice.customer_name || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Invoice Total</div>
                <div style={{ fontWeight: 600 }}>{fmt.currency(invoice.total)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Outstanding</div>
                <div style={{ fontWeight: 700, color: outstanding > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>
                  {fmt.currency(outstanding)}
                </div>
              </div>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">LINKED INVOICE</label>
              <select className="form-select" value={form.invoice_id} onChange={e => onPickInvoice(e.target.value)}>
                <option value="">General payment (no invoice)</option>
                {invoices
                  .filter(i => !['paid', 'cancelled'].includes(i.status))
                  .map(i => (
                    <option key={i.id} value={i.id}>
                      {i.number} — {i.customer_name} ({fmt.currency(i.total)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="form-row cols-2 compact" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">AMOUNT (₹) *</label>
              <input
                className="form-input"
                type="number" step="0.01" min="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
              />
              {locked && outstanding > 0 && (
                <button type="button"
                  onClick={() => set('amount', outstanding.toFixed(2))}
                  style={{
                    background: 'none', border: 'none', padding: 0, marginTop: 4,
                    color: 'var(--c-primary)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
                  }}>
                  Pay full {fmt.currency(outstanding)}
                </button>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">DATE *</label>
              <input className="form-input" type="date" value={form.date}
                onChange={e => set('date', e.target.value)} />
            </div>
          </div>

          <div className="form-row cols-2 compact" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">PAYMENT METHOD</label>
              <select className="form-select" value={form.method} onChange={e => set('method', e.target.value)}>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m.replace(/_/g, ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">REFERENCE / UTR #</label>
              <input className="form-input" style={{ fontFamily: 'monospace' }}
                value={form.reference} onChange={e => set('reference', e.target.value)}
                placeholder="e.g. TXN987654321" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">INTERNAL NOTES</label>
            <textarea className="form-input" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner size={14} /> : <><CreditCard size={14} /> Record Payment</>}
          </button>
        </div>
      </div>
    </div>
  )
}
