import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, Trash2, FileText, Clock, AlertCircle } from 'lucide-react'
import { invoicesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge } from '@/components/ui'
import { useTopbarStore } from '@/store/topbarStore'
import { useEffect } from 'react'
import InvoicePreview from './InvoicePreview'
import InvoiceForm from './InvoiceForm'
import InvoiceScanner from './InvoiceScanner'
import Modal from '@/components/Modal'
import { Scan } from 'lucide-react'

const STATUS_TABS = ['all','draft','sent','paid','overdue','cancelled']

export default function InvoicesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [previewId, setPreviewId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesApi.list,
  })

  const deleteMut = useMutation({
    mutationFn: invoicesApi.remove,
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Invoice deleted') },
    onError: (e) => toast.error(e.message),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => invoicesApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['invoices']),
    onError: (e) => toast.error(e.message),
  })

  const filtered = invoices.filter((inv) => {
    const matchStatus = activeTab === 'all' || inv.status === activeTab
    const matchSearch = !search ||
      inv.number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const { setActions, setContext, clear } = useTopbarStore()
 
  useEffect(() => {
    setContext('Invoices', 'Sales & Billings')
    setActions(
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="topbar-icon-btn action-glow" onClick={() => setScannerOpen(true)} title="Scan Invoice">
          <Scan size={18} />
        </button>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus size={15} /> New Invoice
        </button>
      </div>
    )
    return clear
  }, [setActions, setContext, clear])
 
  const totals = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent: invoices.filter((i) => i.status === 'sent').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    cancelled: invoices.filter((i) => i.status === 'cancelled').length,
  }
 
  const totalValue = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPending = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.total || 0), 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total || 0), 0)

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card blue">
          <div className="kpi-icon"><FileText size={20} /></div>
          <div className="kpi-label">Total Invoices</div>
          <div className="kpi-value">{fmt.currency(totalValue)}</div>
          <div className="kpi-sub">{invoices.length} Records</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><Eye size={20} /></div>
          <div className="kpi-label">Collected</div>
          <div className="kpi-value">{fmt.currency(totalPaid)}</div>
          <div className="kpi-sub">{totals.paid} Paid</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Clock size={20} /></div>
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value">{fmt.currency(totalPending)}</div>
          <div className="kpi-sub">{totals.draft + totals.sent} Pending</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><AlertCircle size={20} /></div>
          <div className="kpi-label">Overdue</div>
          <div className="kpi-value">{fmt.currency(totalOverdue)}</div>
          <div className="kpi-sub">{totals.overdue} Overdue</div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {STATUS_TABS.map((s) => (
          <button key={s} className={`tab-btn${activeTab === s ? ' active' : ''}`} onClick={() => setActiveTab(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="filter-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" />
            <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="spacer" />
          <button className="btn btn-ghost" style={{ gap: 8 }} onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> New Invoice
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2347', marginBottom: 6 }}>No invoices found</div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>Create your first invoice to get started.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Shipment</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => setPreviewId(inv.id)}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{inv.number}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{inv.customer_name}</div>
                      {inv.customer_email && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{inv.customer_email}</div>}
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{fmt.date(inv.date)}</td>
                    <td style={{ color: 'var(--text-2)' }}>{fmt.date(inv.due_date)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt.currency(inv.total, inv.currency)}</td>
                    <td><Badge status={inv.status} /></td>
                    <td><Badge status={inv.shipment_status} label={inv.shipment_status?.replace('_', ' ')} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="topbar-icon-btn" title="Quick Preview" onClick={() => setPreviewId(inv.id)}>
                          <Eye size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Edit" onClick={() => { setEditing(inv); setFormOpen(true) }}>
                          <Edit2 size={14} />
                        </button>
                        {inv.status === 'draft' && (
                          <button className="topbar-icon-btn" title="Mark Sent" onClick={() => statusMut.mutate({ id: inv.id, status: 'sent' })}
                            style={{ fontSize: 10, width: 'auto', padding: '0 8px', color: 'var(--blue)' }}>
                            Send
                          </button>
                        )}
                        <button className="topbar-icon-btn" title="Delete" onClick={() => window.confirm('Delete this invoice?') && deleteMut.mutate(inv.id)} style={{ color: 'var(--red)' }}>
                          <Trash2 size={14} />
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
      {previewId && (
        <InvoicePreview
          invoiceId={previewId}
          onClose={() => setPreviewId(null)}
          onStatusChange={async (status) => {
            await statusMut.mutateAsync({ id: previewId, status })
            setPreviewId(null)
          }}
          onShipmentChange={async (status) => {
            await invoicesApi.updateShipment(previewId, status)
            qc.invalidateQueries(['invoices', 'invoice'])
          }}
        />
      )}

      {formOpen && (
        <Modal title={editing ? `Edit Invoice ${editing.number}` : 'New Invoice'} onClose={() => setFormOpen(false)} size="xl">
          <InvoiceForm
            initial={editing}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['invoices']) }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}

      {scannerOpen && (
        <Modal onClose={() => setScannerOpen(false)} size="md">
          <InvoiceScanner onClose={() => setScannerOpen(false)} />
        </Modal>
      )}
    </div>
  )
}
