import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Search, Tag, User, Trash2,
  ScanLine, Info, Eye,
} from 'lucide-react'
import { warrantyApi, customersApi, invoicesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, EmptyState, Badge, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { useTopbarStore } from '@/store/topbarStore'
import Modal from '@/components/Modal'
import CustomerCombobox from '@/features/customers/CustomerCombobox'
import ProductScanModal from '@/features/products/ProductScanModal'
import WarrantyDetailModal from './WarrantyDetailModal'

const STATUS_OPTS = ['pending', 'approved', 'rejected', 'resolved']

function ClaimForm({ customers, invoices, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    customer_id: '', customer_name: '',
    invoice_id: '', invoice_number: '',
    invoice_item_id: '',
    product_name: '', model_number: '', serial_number: '', sku: '',
    purchase_date: '',
    warranty_type: 'warranty',
    issue_description: '',
  })
  const [scanOpen, setScanOpen] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Only invoices for the picked customer.
  const customerInvoices = useMemo(
    () => invoices.filter(i => !form.customer_id || i.customer_id === form.customer_id),
    [invoices, form.customer_id],
  )

  // Pull full invoice (with items) once an invoice is selected.
  const { data: invoiceDetail } = useQuery({
    queryKey: ['invoice', form.invoice_id],
    queryFn:  () => invoicesApi.get(form.invoice_id),
    enabled:  !!form.invoice_id,
  })
  const invoiceItems = invoiceDetail?.items || []

  const mutation = useMutation({
    mutationFn: () => warrantyApi.create({
      customer_id:       form.customer_id,
      invoice_id:        form.invoice_id || null,
      invoice_number:    form.invoice_number || null,
      product_name:      form.product_name,
      model_number:      form.model_number || null,
      serial_number:     form.serial_number || null,
      purchase_date:     form.purchase_date || null,
      warranty_type:     form.warranty_type,
      issue_description: form.issue_description,
    }),
    onSuccess: () => { toast.success('Claim filed'); onSuccess() },
    onError:   (e) => toast.error(e.message || 'Failed to file claim'),
  })

  const selectCustomer = (c) => {
    if (!c) {
      setForm(f => ({
        ...f, customer_id: '', customer_name: '',
        invoice_id: '', invoice_number: '', invoice_item_id: '',
        product_name: '', model_number: '', sku: '', purchase_date: '',
      }))
      return
    }
    setForm(f => ({
      ...f, customer_id: c.id, customer_name: c.name || '',
      // Reset invoice + product if switching customer
      invoice_id: '', invoice_number: '', invoice_item_id: '',
      product_name: '', model_number: '', sku: '', purchase_date: '',
    }))
  }

  const selectInvoice = (id) => {
    const inv = invoices.find(x => x.id === id)
    setForm(f => ({
      ...f,
      invoice_id: id,
      invoice_number: inv?.number || '',
      invoice_item_id: '',
      // Auto-fill purchase date from invoice date — only if not already set manually.
      purchase_date: f.purchase_date || (inv?.date ? String(inv.date).slice(0, 10) : ''),
      // Wipe product fields so the user picks from the loaded items.
      product_name: '', model_number: '', sku: '',
    }))
  }

  const selectInvoiceItem = (itemId) => {
    const it = invoiceItems.find(x => x.id === itemId)
    if (!it) { setForm(f => ({ ...f, invoice_item_id: '' })); return }
    setForm(f => ({
      ...f,
      invoice_item_id: it.id,
      product_name: it.description || '',
      model_number: it.hsn_code || f.model_number || '',
      sku: it.sku || '',
    }))
  }

  // Scanner returns a Product row. If we have an invoice already loaded and
  // that product is on it, we auto-pick the matching invoice item. Otherwise
  // we just fill the product fields and let the user pick the invoice next.
  const onScanned = (p) => {
    const onInvoice = invoiceItems.find(it => it.product_id === p.id || (p.sku && it.sku === p.sku))
    setForm(f => ({
      ...f,
      invoice_item_id: onInvoice?.id || f.invoice_item_id,
      product_name: p.name || '',
      model_number: p.hsn_code || onInvoice?.hsn_code || '',
      sku: p.sku || '',
    }))
    if (form.invoice_id && !onInvoice) {
      toast.error(`"${p.name}" isn't on invoice ${form.invoice_number} — captured as a custom product.`)
    } else {
      toast.success(`Captured ${p.name}`)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.customer_id)       return toast.error('Pick a customer')
    if (!form.product_name)      return toast.error('Product name is required')
    if (!form.issue_description) return toast.error('Describe the issue')
    mutation.mutate()
  }

  return (
    <form onSubmit={submit} className="warranty-form-compact">
      {/* Customer + Invoice */}
      <div className="form-row cols-2 compact">
        <div className="form-group">
          <label className="form-label req">CUSTOMER</label>
          <CustomerCombobox customers={customers} value={form.customer_id} onPick={selectCustomer} />
        </div>
        <div className="form-group">
          <label className="form-label">LINKED INVOICE</label>
          <select
            className="form-select select-sm"
            value={form.invoice_id}
            onChange={e => selectInvoice(e.target.value)}
            disabled={!form.customer_id}
          >
            <option value="">
              {form.customer_id ? '— Pick an invoice to auto-fill product —' : 'Pick customer first'}
            </option>
            {customerInvoices.map(i => (
              <option key={i.id} value={i.id}>
                {i.number} · {fmt.date(i.date)} · {fmt.currency(i.total)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product picker — invoice items dropdown + scan button */}
      <div className="form-row cols-2 compact" style={{ marginTop: 12, alignItems: 'end' }}>
        <div className="form-group">
          <label className="form-label req">PRODUCT</label>
          {form.invoice_id ? (
            <select
              className="form-select select-sm"
              value={form.invoice_item_id}
              onChange={e => selectInvoiceItem(e.target.value)}
            >
              <option value="">— Pick item from invoice —</option>
              {invoiceItems.map(it => (
                <option key={it.id} value={it.id}>
                  {it.description}{it.sku ? ` · ${it.sku}` : ''} (Qty {it.quantity})
                </option>
              ))}
            </select>
          ) : (
            <input
              className="form-input input-sm"
              value={form.product_name}
              onChange={e => set('product_name', e.target.value)}
              placeholder="e.g. iPhone 15 Pro Max (or pick an invoice above)"
            />
          )}
        </div>
        <div className="form-group">
          <label className="form-label">SCAN PRODUCT</label>
          <button type="button" className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setScanOpen(true)}>
            <ScanLine size={14} /> Scan QR / Barcode
          </button>
        </div>
      </div>

      {/* Auto-filled product fields — read-only summary if from invoice item */}
      {(form.product_name || form.sku) && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          background: 'var(--c-primary-lt)', border: '1px solid var(--c-border)',
          fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          <Info size={12} color="var(--c-primary)" />
          <strong>{form.product_name || '(no product)'}</strong>
          {form.sku && <span style={{ fontFamily: 'monospace', color: 'var(--c-text3)' }}>SKU {form.sku}</span>}
          {form.model_number && <span style={{ color: 'var(--c-text3)' }}>HSN/Model {form.model_number}</span>}
        </div>
      )}

      {/* Model + Serial number (manual overrides) */}
      <div className="form-row cols-2 compact" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">MODEL NUMBER</label>
          <input className="form-input input-sm mono" value={form.model_number}
            onChange={e => set('model_number', e.target.value)} placeholder="e.g. A3106" />
        </div>
        <div className="form-group">
          <label className="form-label">SERIAL NUMBER</label>
          <input className="form-input input-sm mono" value={form.serial_number}
            onChange={e => set('serial_number', e.target.value)} placeholder="S/N: 0987654321" />
        </div>
      </div>

      {/* Purchase date + warranty type */}
      <div className="form-row cols-2 compact" style={{ marginTop: 12 }}>
        <div className="form-group">
          <label className="form-label">PURCHASE DATE</label>
          <input className="form-input input-sm" type="date" value={form.purchase_date}
            onChange={e => set('purchase_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">WARRANTY TYPE</label>
          <select className="form-select select-sm" value={form.warranty_type}
            onChange={e => set('warranty_type', e.target.value)}>
            <option value="warranty">Standard Warranty</option>
            <option value="guarantee">Product Guarantee</option>
            <option value="amc">AMC Support</option>
          </select>
        </div>
      </div>

      {/* Issue description */}
      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label req">ISSUE DESCRIPTION</label>
        <textarea className="form-textarea input-sm" rows={3}
          value={form.issue_description}
          onChange={e => set('issue_description', e.target.value)}
          placeholder="Describe the technical issue in detail..." />
      </div>

      <div className="modal-footer-actions" style={{ marginTop: 24, padding: '16px 0 0', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ minWidth: 140, fontWeight: 700 }} disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner size={14} /> : 'Submit Claim'}
        </button>
      </div>

      {scanOpen && (
        <ProductScanModal onClose={() => setScanOpen(false)} onSelect={onScanned} />
      )}
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
  const [viewClaim, setViewClaim] = useState(null)
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
                  <tr key={c.id} onClick={() => setViewClaim(c)} style={{ cursor: 'pointer' }}>
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
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="tbl-actions">
                        <button className="btn btn-ghost btn-xs" title="View" onClick={() => setViewClaim(c)}>
                          <Eye size={13} />
                        </button>
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
      {viewClaim && (
        <WarrantyDetailModal
          claim={viewClaim}
          onClose={() => setViewClaim(null)}
          onUpdate={(c) => setStatusClaim(c)}
          onDelete={(c) => window.confirm('Delete this claim?') && deleteMut.mutate(c.id)}
        />
      )}
    </div>
  )
}
