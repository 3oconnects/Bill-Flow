import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, CreditCard, FileText, TrendingUp, Search, Calendar, Landmark } from 'lucide-react'
import { paymentsApi, invoicesApi } from '@/api'
import { fmt, PAYMENT_METHODS } from '@/lib/utils'
import { PageLoading, EmptyState, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { useTopbarStore } from '@/store/topbarStore'
import Modal from '@/components/Modal'
import { useForm } from 'react-hook-form'

function PaymentForm({ invoices, onSuccess, onCancel }) {
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { method: 'bank_transfer', currency: 'INR', date: new Date().toISOString().split('T')[0] },
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
          <label className="form-label">REFERENCE / UTR #</label>
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
  const { setActions, setContext, clear } = useTopbarStore()
  const [formOpen, setFormOpen] = useState(false)
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: paymentsApi.list })
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: invoicesApi.list })

  useEffect(() => {
    setContext('Payments', 'Customer Collections')
    setActions(
      <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
        <Plus size={15} /> Record Payment
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const deleteMut = useMutation({
    mutationFn: paymentsApi.remove,
    onSuccess: () => { qc.invalidateQueries(['payments', 'invoices']); toast.success('Payment deleted') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = payments.filter((p) => {
    const matchesMethod = methodFilter === 'all' || p.method === methodFilter
    const matchesSearch = !search || 
      p.customer_name?.toLowerCase().includes(search.toLowerCase()) || 
      p.reference?.toLowerCase().includes(search.toLowerCase())
    return matchesMethod && matchesSearch
  })

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const unlinkedCount = payments.filter(p => !p.invoice_id).length

  if (isLoading) return <PageLoading />

  return (
    <div className="payments-container">
      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card green">
          <div className="kpi-icon"><TrendingUp size={20} /></div>
          <div className="kpi-label">Total Collected</div>
          <div className="kpi-value">{fmt.currency(totalCollected)}</div>
          <div className="kpi-sub">Lifetime revenue</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon"><FileText size={20} /></div>
          <div className="kpi-label">Payment Records</div>
          <div className="kpi-value">{payments.length}</div>
          <div className="kpi-sub">Processed transactions</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Landmark size={20} /></div>
          <div className="kpi-label">Unlinked Payments</div>
          <div className="kpi-value">{unlinkedCount}</div>
          <div className="kpi-sub">Needs invoice mapping</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" />
            <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="spacer" />
          <div className="pill-tabs">
            <button className={`pill-tab${methodFilter === 'all' ? ' active' : ''}`} onClick={() => setMethodFilter('all')}>All</button>
            {PAYMENT_METHODS.map(m => (
              <button key={m} className={`pill-tab${methodFilter === m ? ' active' : ''}`} onClick={() => setMethodFilter(m)}>
                {m.replace(/_/g, ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState 
            icon={<CreditCard size={48} />} 
            title="No payments found" 
            action={<button className="btn btn-primary btn-md" onClick={() => setFormOpen(true)}><Plus size={14} /> Record Payment</button>} 
          />
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>INVOICE</th>
                  <th>CUSTOMER</th>
                  <th className="right">AMOUNT</th>
                  <th>METHOD</th>
                  <th>REFERENCE</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const inv = invoices.find((i) => i.id === p.invoice_id)
                  return (
                    <tr key={p.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{fmt.date(p.date)}</td>
                      <td>
                        {inv ? (
                          <span className="link-text" onClick={() => navigate(`/invoices/${inv.id}`)}>
                            {inv.number}
                          </span>
                        ) : <span style={{ color: 'var(--c-text3)' }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{inv?.customer_name || p.customer_name || '—'}</td>
                      <td className="item-amount" style={{ fontSize: 15 }}>{fmt.currency(p.amount)}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                          {p.method?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11, color: 'var(--c-text3)' }}>{p.reference || '—'}</td>
                      <td>
                        <div className="tbl-actions">
                          <button className="topbar-icon-btn red" title="Delete"
                            onClick={() => window.confirm('Delete this payment record?') && deleteMut.mutate(p.id)}>
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
        )}
      </div>

      {formOpen && (
        <Modal title="Record Payment" onClose={() => setFormOpen(false)} size="md">
          <PaymentForm
            invoices={invoices}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['payments', 'invoices']) }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
