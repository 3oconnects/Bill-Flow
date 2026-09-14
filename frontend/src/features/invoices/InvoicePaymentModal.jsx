import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertCircle, Receipt, Printer } from 'lucide-react'
import { invoicesApi, paymentsApi } from '@/api'
import { fmt, PAYMENT_METHODS } from '@/lib/utils'
import { Spinner, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'

function paymentStatusFor(total, paid) {
  if (paid <= 0) return 'unpaid'
  if (paid >= total) return 'paid'
  return 'partial'
}

export default function InvoicePaymentModal({ invoiceId, onClose }) {
  const qc = useQueryClient()
  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.get(invoiceId),
  })

  const payments = inv?.payments || []
  const paidTotal = useMemo(() => {
    // Use the authoritative paid_amount from the invoice record.
    // inv.payments[] is NOT returned by GET /invoices/:id — only paid_amount is.
    const fromRecord = Number(inv?.paid_amount || 0)
    // Fall back to summing the payments array if it ever IS populated (e.g. from a richer endpoint).
    const fromArray = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    return fromRecord > 0 ? fromRecord : fromArray
  }, [inv?.paid_amount, payments])
  const total = Number(inv?.total || 0)
  const creditedAmount = Number(inv?.credited_amount || 0)
  const balance = Math.max(0, total - paidTotal - creditedAmount)
  const derivedStatus = inv?.status === 'paid' ? 'paid'
    : inv?.status === 'partially_paid' ? 'partial'
    : paymentStatusFor(total, paidTotal)


  const [payType, setPayType] = useState('full')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState(() => 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState(null) // set after a successful payment

  useEffect(() => {
    if (inv) setAmount(balance > 0 ? balance.toFixed(2) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv?.id, inv?.paid_amount, inv?.credited_amount])

  useEffect(() => {
    if (payType === 'full') setAmount(balance > 0 ? balance.toFixed(2) : '')
  }, [payType, balance])

  const handleAmountChange = (v) => {
    setAmount(v)
    setPayType(Number(v) === balance ? 'full' : 'partial')
  }

  const validate = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return 'Payment amount must be greater than zero.'
    if (amt > balance) return `Payment amount cannot exceed the remaining balance of ${fmt.currency(balance, inv.currency)}.`
    if (!date) return 'Payment date is required.'
    if (!method) return 'Payment method is required.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setSubmitting(true)
    try {
      const amt = parseFloat(amount)
      const result = await paymentsApi.create({
        invoice_id: inv.id,
        amount: amt,
        date,
        currency: inv.currency || 'INR',
        method,
        reference: reference.trim(),
        notes: notes.trim(),
      })
      const txnId = reference.trim() || (result?.id ? 'TXN-' + result.id.replace(/-/g, '').slice(-8).toUpperCase() : '—')
      const newPaid = paidTotal + amt
      const newBalance = Math.max(0, total - newPaid)
      setReceipt({
        txnId,
        amount: amt,
        method,
        reference: reference.trim(),
        date,
        previousBalance: balance,
        newBalance,
        status: paymentStatusFor(total, newPaid),
      })
      toast.success(`Payment recorded · ${txnId}`)
      qc.invalidateQueries(['invoices'])
      qc.invalidateQueries(['invoice', invoiceId])
    } catch (e2) {
      toast.error(e2.message)
      setError(e2.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrintReceipt = () => {
    if (!receipt || !inv) return
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${receipt.txnId}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:sans-serif;padding:36px;color:#111;font-size:13px}
.title{font-size:20px;font-weight:800;color:#0a8754;margin-bottom:4px}
.sub{color:#555;margin-bottom:20px}
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
.label{color:#666}.val{font-weight:600}
.grand{font-size:16px;font-weight:800;color:#0a8754;border-top:2px solid #111;margin-top:8px;padding-top:8px}
</style></head><body>
<div class="title">✓ Payment Receipt</div>
<div class="sub">Invoice ${inv.number} — ${inv.customer_name}</div>
<div class="row"><span class="label">Transaction ID</span><span class="val">${receipt.txnId}</span></div>
<div class="row"><span class="label">Payment Date</span><span class="val">${fmt.date(receipt.date)}</span></div>
<div class="row"><span class="label">Payment Method</span><span class="val">${receipt.method.replace(/_/g,' ').toUpperCase()}</span></div>
${receipt.reference ? `<div class="row"><span class="label">Reference</span><span class="val">${receipt.reference}</span></div>` : ''}
<div class="row"><span class="label">Previous Balance</span><span class="val">${fmt.currency(receipt.previousBalance, inv.currency)}</span></div>
<div class="row grand"><span>Amount Paid</span><span>${fmt.currency(receipt.amount, inv.currency)}</span></div>
<div class="row"><span class="label">Remaining Balance</span><span class="val">${fmt.currency(receipt.newBalance, inv.currency)}</span></div>
</body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <Modal title={inv ? `Record Payment — ${inv.number}` : 'Record Payment'} onClose={onClose} size="sm">
      {isLoading || !inv ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : receipt ? (
        // ── Success / receipt state ──────────────────────────────
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--c-green-lt)', border: '1px solid #b2dfce', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <CheckCircle2 size={20} color="var(--c-green)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-green)' }}>Payment recorded</div>
              <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{receipt.txnId}</div>
            </div>
          </div>

          <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 14, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--c-text2)' }}>Previous Balance</span>
              <span style={{ fontWeight: 600 }}>{fmt.currency(receipt.previousBalance, inv.currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--c-text2)' }}>Amount Paid</span>
              <span style={{ fontWeight: 700, color: 'var(--c-green)' }}>{fmt.currency(receipt.amount, inv.currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--c-border)' }}>
              <span style={{ fontWeight: 700 }}>Remaining Balance</span>
              <span style={{ fontWeight: 800, color: receipt.newBalance > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>{fmt.currency(receipt.newBalance, inv.currency)}</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <Badge status={receipt.status === 'paid' ? 'paid' : receipt.status === 'partial' ? 'partial' : 'draft'} label={receipt.status === 'paid' ? 'Paid' : receipt.status === 'partial' ? 'Partially Paid' : 'Unpaid'} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={handlePrintReceipt}><Printer size={14} /> Print Receipt</button>
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      ) : (
        // ── Payment entry form ───────────────────────────────────
        <form onSubmit={handleSubmit}>
          {/* Invoice summary */}
          <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 10, padding: 14, marginBottom: 18, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{inv.number}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{inv.customer_name}</div>
              </div>
              <Badge status={derivedStatus === 'paid' ? 'paid' : derivedStatus === 'partial' ? 'partial' : 'draft'} label={derivedStatus === 'paid' ? 'Paid' : derivedStatus === 'partial' ? 'Partially Paid' : 'Unpaid'} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-text2)', marginBottom: 2 }}>
              <span>Invoice Date</span><span>{fmt.date(inv.date)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-text2)', marginBottom: 8 }}>
              <span>Due Date</span><span>{fmt.date(inv.due_date)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--c-border)', paddingTop: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--c-text2)' }}>Invoice Total</span>
              <strong>{fmt.currency(total, inv.currency)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--c-text2)' }}>Total Paid</span>
              <span style={{ color: 'var(--c-green)', fontWeight: 600 }}>{fmt.currency(paidTotal, inv.currency)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--c-border)', paddingTop: 4, marginTop: 4 }}>
              <span style={{ fontWeight: 700 }}>Remaining Balance</span>
              <span style={{ fontWeight: 800, color: balance > 0 ? 'var(--c-red)' : 'var(--c-green)' }}>{fmt.currency(balance, inv.currency)}</span>
            </div>
          </div>

          {balance <= 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--c-green-lt)', border: '1px solid #b2dfce', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--c-green)', fontWeight: 600 }}>
              <CheckCircle2 size={18} /> This invoice is fully paid — no balance remaining.
            </div>
          ) : (
            <>
              {/* Payment type */}
              <div className="form-group">
                <label className="form-label">Payment Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className={`pill-tab${payType === 'full' ? ' active' : ''}`} style={{ flex: 1, padding: '8px 0' }}
                    onClick={() => { setPayType('full'); setAmount(balance.toFixed(2)) }}>
                    Full Payment
                  </button>
                  <button type="button" className={`pill-tab${payType === 'partial' ? ' active' : ''}`} style={{ flex: 1, padding: '8px 0' }}
                    onClick={() => setPayType('partial')}>
                    Installment / Partial
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label req">Payment Amount</label>
                <input
                  className="form-input" type="number" step="0.01" min="0.01" max={balance}
                  value={amount} onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={payType === 'full'}
                />
                <div className="form-hint">Maximum: {fmt.currency(balance, inv.currency)}</div>
              </div>

              <div className="form-group">
                <label className="form-label req">Payment Date</label>
                <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reference / Transaction #</label>
                <input className="form-input mono" placeholder="UTR / TXN / Cheque No. (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--c-red-lt)', border: '1px solid #f5c6c6', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--c-red)', marginBottom: 12 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                </div>
              )}

              <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--c-text2)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Receipt size={14} />
                A unique <strong style={{ color: 'var(--c-primary)', margin: '0 3px' }}>Transaction ID</strong> will be auto-generated for this payment.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <Spinner size={14} /> : 'Confirm Payment'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  )
}
