import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Eye, Edit2, Trash2, FileText, Clock, AlertCircle,
  Download, Printer, Share2, Copy, Filter, ArrowUpDown, 
  ChevronDown, MoreHorizontal, Mail, MessageSquare, Send, TrendingUp, Scan
} from 'lucide-react'
import { invoicesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge } from '@/components/ui'
import { useTopbarStore } from '@/store/topbarStore'
import InvoicePreview from './InvoicePreview'
import InvoiceForm from './InvoiceForm'
import InvoiceScanner from './InvoiceScanner'
import Modal from '@/components/Modal'
import { toast } from '@/store/toastStore'

const STATUS_TABS = ['all', 'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled']

function AnimatedCounter({ value, duration = 1000, formatter = (v) => v }) {
  const [display, setDisplay] = useState(0)
  
  useEffect(() => {
    let start = 0
    const end = parseFloat(value) || 0
    if (start === end) { setDisplay(end); return; }
    
    let timer = setInterval(() => {
      start += end / (duration / 16)
      if (start >= end) {
        setDisplay(end)
        clearInterval(timer)
      } else {
        setDisplay(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{formatter(display)}</span>
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [dateRange, setDateRange] = useState('all') // all, week, month, year
  const [sortOption, setSortOption] = useState('latest') // latest, oldest, amount_high, amount_low
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
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Invoice deleted successfully') },
    onError: (e) => toast.error(e.message),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => invoicesApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Status updated') },
    onError: (e) => toast.error(e.message),
  })

  const duplicateMut = useMutation({
    mutationFn: (id) => invoicesApi.duplicate(id),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Invoice duplicated') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = useMemo(() => {
    let result = [...invoices]

    // Tab Filter
    if (activeTab !== 'all') {
      result = result.filter(inv => inv.status === activeTab)
    }

    // Search Filter
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(inv => 
        inv.number?.toLowerCase().includes(s) ||
        inv.customer_name?.toLowerCase().includes(s) ||
        inv.customer_email?.toLowerCase().includes(s) ||
        inv.reference_number?.toLowerCase().includes(s)
      )
    }

    // Date Range Filter
    if (dateRange !== 'all') {
      const now = new Date()
      result = result.filter(inv => {
        const d = new Date(inv.date)
        if (dateRange === 'week') return (now - d) <= 7 * 24 * 60 * 60 * 1000
        if (dateRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        if (dateRange === 'year') return d.getFullYear() === now.getFullYear()
        return true
      })
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'latest') return new Date(b.date) - new Date(a.date)
      if (sortOption === 'oldest') return new Date(a.date) - new Date(b.date)
      if (sortOption === 'amount_high') return b.total - a.total
      if (sortOption === 'amount_low') return a.total - b.total
      return 0
    })

    return result
  }, [invoices, activeTab, search, dateRange, sortOption])

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
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0)
  const totalDue = invoices.reduce((s, i) => s + Number(i.due_amount || 0), 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card blue">
          <div className="kpi-icon"><FileText size={20} /></div>
          <div className="kpi-label">Revenue Generated</div>
          <div className="kpi-value"><AnimatedCounter value={totalValue} formatter={(v) => fmt.currency(v)} /></div>
          <div className="kpi-sub">{invoices.length} Invoices Created</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><TrendingUp size={20} /></div>
          <div className="kpi-label">Paid Amount</div>
          <div className="kpi-value"><AnimatedCounter value={totalPaid} formatter={(v) => fmt.currency(v)} /></div>
          <div className="kpi-sub">{invoices.filter(i => i.status === 'paid').length} Fully Paid</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Clock size={20} /></div>
          <div className="kpi-label">Pending Invoices</div>
          <div className="kpi-value"><AnimatedCounter value={totalDue} formatter={(v) => fmt.currency(v)} /></div>
          <div className="kpi-sub">Awaiting Payments</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><AlertCircle size={20} /></div>
          <div className="kpi-label">Overdue</div>
          <div className="kpi-value"><AnimatedCounter value={overdueCount} /></div>
          <div className="kpi-sub">Critical Collection</div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        {STATUS_TABS.map((s) => (
          <button key={s} className={`tab-btn${activeTab === s ? ' active' : ''}`} onClick={() => setActiveTab(s)}>
            {s === 'all' ? 'All Invoices' : s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            <span className="tab-count">{invoices.filter(inv => s === 'all' || inv.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="filter-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" size={16} />
            <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search #, customer, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="spacer" />

          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select sm" style={{ width: 120 }} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="all">Anytime</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>

            <select className="form-select sm" style={{ width: 120 }} value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Highest Amount</option>
              <option value="amount_low">Lowest Amount</option>
            </select>

            <button className="btn btn-ghost sm" onClick={() => { setSearch(''); setDateRange('all'); setActiveTab('all'); }}>
              <ArrowUpDown size={14} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>
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
                  <th>Customer Details</th>
                  <th>Date</th>
                  <th>Financials</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ verticalAlign: 'top', paddingTop: 16 }}>
                      <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 14 }}>{inv.number}</div>
                      {inv.reference_number && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Ref: {inv.reference_number}</div>}
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 16 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{inv.customer_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{inv.customer_email || inv.customer_phone || 'No contact'}</div>
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{fmt.date(inv.date)}</div>
                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2, fontWeight: 600 }}>Due {fmt.date(inv.due_date)}</div>
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{fmt.currency(inv.total)}</div>
                      <div style={{ fontSize: 11, marginTop: 4, display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>Paid: {fmt.currency(inv.paid_amount || 0)}</span>
                        <span style={{ color: Number(inv.due_amount) > 0 ? 'var(--red)' : 'var(--text-3)', fontWeight: 600 }}>Due: {fmt.currency(inv.due_amount || 0)}</span>
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Badge status={inv.status} />
                        {inv.shipment_status !== 'not_shipped' && <Badge status={inv.shipment_status} label={inv.shipment_status?.replace('_', ' ')} />}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="topbar-icon-btn sm" title="Preview" onClick={() => setPreviewId(inv.id)}><Eye size={14} /></button>
                        <button className="topbar-icon-btn sm" title="Edit" onClick={() => { setEditing(inv); setFormOpen(true) }}><Edit2 size={14} /></button>
                        <div className="dropdown">
                          <button className="topbar-icon-btn sm"><MoreHorizontal size={14} /></button>
                          <div className="dropdown-content right">
                            <button className="dropdown-item" onClick={() => duplicateMut.mutate(inv.id)}><Copy size={13} /> Duplicate</button>
                            <button className="dropdown-item" onClick={() => setPreviewId(inv.id)}><Printer size={13} /> Print Invoice</button>
                            <button className="dropdown-item" onClick={() => setPreviewId(inv.id)}><Download size={13} /> Download PDF</button>
                            <button className="dropdown-item" onClick={() => setPreviewId(inv.id)}><Mail size={13} /> Send Email</button>
                            <button className="dropdown-item" onClick={() => setPreviewId(inv.id)}><MessageSquare size={13} /> WhatsApp</button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item red" onClick={() => window.confirm('Are you sure you want to delete this invoice?') && deleteMut.mutate(inv.id)}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </div>
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
