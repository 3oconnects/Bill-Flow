import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, X } from 'lucide-react'
import { vendorPaymentsApi, apApi } from '@/api'
import { fmt, PAYMENT_METHODS } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'

/**
 * Record a vendor payment — mirrors RecordPaymentModal for the AP side.
 *
 * Two modes:
 *  1. Locked to an AP invoice — pass `apInvoice`. Amount defaults to its
 *     outstanding balance, the dropdown is hidden.
 *  2. Global — leave `apInvoice` undefined; user picks an unpaid AP invoice
 *     from the dropdown.
 */
export default function RecordVendorPaymentModal({ apInvoice, onClose, onSuccess }) {
  const qc = useQueryClient()

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['ap-invoices-unpaid'],
    queryFn:  () => apApi.list('invoices'),
    enabled:  !apInvoice,
  })

  const locked = !!apInvoice

  const outstanding = useMemo(() => {
    if (!apInvoice) return 0
    return Math.max(
      0,
      Number(apInvoice.total_amount || 0) - Number(apInvoice.paid_amount || 0),
    )
  }, [apInvoice])

  const [form, setForm] = useState({
    ap_invoice_id: apInvoice?.id || '',
    ap_invoice_no: apInvoice?.doc_no || '',
    vendor_id:     apInvoice?.vendor_id || '',
    vendor_name:   apInvoice?.vendor_name || '',
    amount:        outstanding ? outstanding.toFixed(2) : '',
    date:          new Date().toISOString().split('T')[0],
    method:        'bank_transfer',
    reference:     '',
    notes:         '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When the user picks an AP invoice in global mode, prefill the amount.
  const onPickAPInvoice = (id) => {
    const inv = apInvoices.find(i => i.id === id)
    if (!inv) {
      setForm(f => ({ ...f, ap_invoice_id: '', ap_invoice_no: '', vendor_id: '', vendor_name: '', amount: '' }))
      return
    }
    const outs = Math.max(
      0,
      Number(inv.total_amount || 0) - Number(inv.paid_amount || 0),
    )
    setForm(f => ({
      ...f,
      ap_invoice_id: inv.id,
      ap_invoice_no: inv.doc_no,
      vendor_id:     inv.vendor_id,
      vendor_name:   inv.vendor_name,
      amount:        outs > 0 ? outs.toFixed(2) : '',
    }))
  }

  const mutation = useMutation({
    mutationFn: () => vendorPaymentsApi.create({
      vendor_id:     form.vendor_id || null,
      vendor_name:   form.vendor_name,
      ap_invoice_id: form.ap_invoice_id || null,
      ap_invoice_no: form.ap_invoice_no || null,
      amount:        Number(form.amount),
      date:          form.date,
      method:        form.method,
      reference:     form.reference || null,
      notes:         form.notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['vendor-payments'])
      qc.invalidateQueries(['ap-invoices-unpaid'])
      qc.invalidateQueries(['ap'])
      toast.success('Vendor payment recorded')
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
              <Banknote size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Pay Vendor</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                {locked ? `Against AP invoice ${apInvoice.doc_no}` : 'Pick an AP invoice or record a general payment'}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {locked ? (
            <div style={{
              background: 'var(--c-surface2, var(--c-bg))', border: '1px solid var(--c-border)',
              borderRadius: 8, padding: 12, marginBottom: 14,
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12,
            }}>
              <div>
                <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Vendor</div>
                <div style={{ fontWeight: 600 }}>{apInvoice.vendor_name || '—'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Invoice Total</div>
                <div style={{ fontWeight: 600 }}>{fmt.currency(apInvoice.total_amount)}</div>
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
              <label className="form-label">LINKED AP INVOICE</label>
              <select className="form-select" value={form.ap_invoice_id}
                onChange={e => onPickAPInvoice(e.target.value)}>
                <option value="">General payment (no invoice)</option>
                {apInvoices
                  .filter(i => !['paid', 'cancelled', 'closed'].includes(i.status))
                  .map(i => (
                    <option key={i.id} value={i.id}>
                      {i.doc_no} — {i.vendor_name} ({fmt.currency(i.total_amount)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="form-row cols-2 compact" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">AMOUNT (₹) *</label>
              <input className="form-input" type="number" step="0.01" min="0"
                value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0.00" />
              {locked && outstanding > 0 && (
                <button type="button"
                  onClick={() => set('amount', outstanding.toFixed(2))}
                  style={{
                    background: 'none', border: 'none', padding: 0, marginTop: 4,
                    color: 'var(--c-primary)', fontSize: 11, cursor: 'pointer',
                    textDecoration: 'underline',
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
              <select className="form-select" value={form.method}
                onChange={e => set('method', e.target.value)}>
                {(PAYMENT_METHODS || ['bank_transfer','upi','cheque','cash','card']).map(m => (
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
            {mutation.isPending ? <Spinner size={14} /> : <><Banknote size={14} /> Record Payment</>}
          </button>
        </div>
      </div>
    </div>
  )
}
