import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Search, Tag, User, Trash2 } from 'lucide-react'
import { warrantyApi, customersApi, invoicesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, EmptyState, Badge, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { useTopbarStore } from '@/store/topbarStore'
import Modal from '@/components/Modal'
import { useForm } from 'react-hook-form'

const STATUS_OPTS = ['pending', 'approved', 'rejected', 'resolved']

function ClaimForm({ customers, invoices, onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { status: 'pending' } })
  const mutation = useMutation({
    mutationFn: warrantyApi.create,
    onSuccess: () => { toast.success('Claim created'); onSuccess() },
    onError: (e) => toast.error(e.message),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="warranty-form-compact">
      <div className="form-row cols-2 compact">
        <div className="form-group">
          <label className="form-label">CUSTOMER *</label>
          <select className="form-select select-sm" {...register('customer_id', { required: true })}>
            <option value="">Select customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">LINKED INVOICE</label>
          <select className="form-select select-sm" {...register('invoice_id')}>
            <option value="">No specific invoice</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.number} — {i.customer_name}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">PRODUCT NAME *</label>
        <input className="form-input input-sm" {...register('product_name', { required: true })} placeholder="e.g. iPhone 15 Pro Max" />
      </div>

      <div className="form-row cols-2 compact" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">MODEL NUMBER</label>
          <input className="form-input input-sm mono" {...register('model_number')} placeholder="e.g. A3106" />
        </div>
        <div className="form-group">
          <label className="form-label">SERIAL NUMBER</label>
          <input className="form-input input-sm mono" {...register('serial_number')} placeholder="S/N: 0987654321" />
        </div>
      </div>

      <div className="form-row cols-2 compact" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">PURCHASE DATE</label>
          <input className="form-input input-sm" type="date" {...register('purchase_date')} />
        </div>
        <div className="form-group">
          <label className="form-label">WARRANTY TYPE</label>
          <select className="form-select select-sm" {...register('warranty_type')}>
            <option value="warranty">Standard Warranty</option>
            <option value="guarantee">Product Guarantee</option>
            <option value="amc">AMC Support</option>
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">ISSUE DESCRIPTION *</label>
        <textarea className="form-textarea input-sm" {...register('issue_description', { required: true })} placeholder="Describe the technical issue in detail..." rows={3} />
      </div>

      <div className="modal-footer-actions" style={{ marginTop: 24, padding: '16px 0 0', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ minWidth: 140, fontWeight: 700 }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : 'Submit Claim'}
        </button>
      </div>
    </form>
  )
}

function StatusModal({ claim, onSuccess, onCancel }) {
  const [status, setStatus] = useState(claim.status)
  const [notes, setNotes] = useState(claim.resolution_notes || '')
  const mutation = useMutation({
    mutationFn: () => warrantyApi.updateStatus(claim.id, status, notes),
    onSuccess: () => { toast.success('Status updated'); onSuccess() },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div className="status-update-compact">
      <div className="form-group">
        <label className="form-label">UPDATE STATUS</label>
        <select className="form-select select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTS.map((s) => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s.toUpperCase()}</option>)}
        </select>
      </div>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">RESOLUTION NOTES</label>
        <textarea className="form-textarea input-sm" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Provide resolution details for the customer..." />
      </div>
      <div className="modal-footer-actions" style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ minWidth: 120 }} disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner size={14} /> : 'Save Status'}
        </button>
      </div>
    </div>
  )
}

export default function WarrantyPage() {
  const qc = useQueryClient()
  const { setActions, setContext, clear } = useTopbarStore()
  const [formOpen, setFormOpen] = useState(false)
  const [statusClaim, setStatusClaim] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: claims = [], isLoading } = useQuery({ queryKey: ['warranty'], queryFn: warrantyApi.list })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: invoicesApi.list })

  useEffect(() => {
    setContext('Warranty Claims', 'Guarantee & AMC Management')
    setActions(
      <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
        <Plus size={15} /> New Claim
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const deleteMut = useMutation({
    mutationFn: warrantyApi.remove,
    onSuccess: () => { qc.invalidateQueries(['warranty']); toast.success('Claim deleted') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = claims.filter((c) => {
    const matchStatus = filter === 'all' || c.status === filter
    const matchSearch = !search || 
      c.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.serial_number?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const counts = STATUS_OPTS.reduce((acc, s) => ({ ...acc, [s]: claims.filter((c) => c.status === s).length }), {})

  if (isLoading) return <PageLoading />

  return (
    <div className="warranty-container">
      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card orange">
          <div className="kpi-icon"><Clock size={20} /></div>
          <div className="kpi-label">Pending Claims</div>
          <div className="kpi-value">{counts.pending || 0}</div>
          <div className="kpi-sub">Awaiting technical review</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><CheckCircle size={20} /></div>
          <div className="kpi-label">Approved</div>
          <div className="kpi-value">{counts.approved || 0}</div>
          <div className="kpi-sub">Ready for resolution</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><XCircle size={20} /></div>
          <div className="kpi-label">Rejected</div>
          <div className="kpi-value">{counts.rejected || 0}</div>
          <div className="kpi-sub">Ineligible requests</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon"><Shield size={20} /></div>
          <div className="kpi-label">Resolved</div>
          <div className="kpi-value">{counts.resolved || 0}</div>
          <div className="kpi-sub">Successfully closed</div>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" />
            <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search claims / serials..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="spacer" />
          <div className="pill-tabs">
            <button className={`pill-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All</button>
            {STATUS_OPTS.map(s => (
              <button key={s} className={`pill-tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState 
            icon={<Shield size={48} />} 
            title="No warranty claims found"
            action={<button className="btn btn-primary" onClick={() => setFormOpen(true)}><Plus size={14} /> New Claim</button>} 
          />
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>PRODUCT DETAILS</th>
                  <th>CUSTOMER</th>
                  <th>INVOICE</th>
                  <th>WARRANTY TYPE</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--c-text)' }}>{c.product_name}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 2 }}>
                        {c.model_number ? `MOD: ${c.model_number}` : ''} {c.serial_number ? `· S/N: ${c.serial_number}` : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <User size={14} style={{ color: 'var(--c-text3)' }} />
                         <span style={{ fontWeight: 600 }}>{c.customer_name}</span>
                      </div>
                    </td>
                    <td>
                      {c.invoice_number ? (
                        <span className="link-text" style={{ fontSize: 12 }}>{c.invoice_number}</span>
                      ) : <span style={{ color: 'var(--c-text3)' }}>—</span>}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                        {c.warranty_type || 'warranty'}
                      </span>
                    </td>
                    <td>
                       <Badge status={c.status} />
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>{fmt.date(c.created_at)}</td>
                    <td>
                      <div className="tbl-actions">
                        <button className="btn btn-ghost btn-xs" onClick={() => setStatusClaim(c)}>Update</button>
                        <button className="topbar-icon-btn red" onClick={() => window.confirm('Delete this claim?') && deleteMut.mutate(c.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <Modal title="New Warranty Claim" onClose={() => setFormOpen(false)} size="md">
          <ClaimForm customers={customers} invoices={invoices}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['warranty']) }}
            onCancel={() => setFormOpen(false)} />
        </Modal>
      )}
      {statusClaim && (
        <Modal title="Update Claim Status" onClose={() => setStatusClaim(null)} size="sm">
          <StatusModal claim={statusClaim}
            onSuccess={() => { setStatusClaim(null); qc.invalidateQueries(['warranty']) }}
            onCancel={() => setStatusClaim(null)} />
        </Modal>
      )}
    </div>
  )
}
