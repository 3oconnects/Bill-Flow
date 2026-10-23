import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, Edit2, Trash2, FileText, Clock, AlertCircle,
  CheckCircle2, Scan, Download, LayoutGrid, List as ListIcon, CreditCard, Loader2,
} from 'lucide-react'
import { invoicesApi, paymentsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge } from '@/components/ui'
import { useTopbarStore } from '@/store/topbarStore'
import { toast } from '@/store/toastStore'
import { confirmAction } from '@/store/confirmStore'
import InvoicePreview from './InvoicePreview'
import InvoiceForm from './InvoiceForm'
import InvoiceScanner from './InvoiceScanner'
import InvoicePaymentModal from './InvoicePaymentModal'
import Modal from '@/components/Modal'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'partially_paid', label: 'Partially Paid' },
  { id: 'paid', label: 'Paid' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'cancelled', label: 'Cancelled' },
]
const CARD_AVATAR_COLORS = ['blue','green','orange','purple','teal']

const SHIPMENT_LABELS = { not_shipped: 'Not Shipped', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' }
const SHIPMENT_COLORS = { not_shipped: '#9aa3b2', processing: '#f59e0b', shipped: '#3b82f6', delivered: '#10b981' }

function ShipmentBadge({ status }) {
  const s = status || 'not_shipped'
  const col = SHIPMENT_COLORS[s] || '#9aa3b2'
  return (
    <span style={{ background: `${col}22`, color: col, border: `1px solid ${col}44`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
      {SHIPMENT_LABELS[s] || s}
    </span>
  )
}

function txnIdFor(p) {
  if (!p) return ''
  return p.reference || (p.id ? 'TXN-' + p.id.replace(/-/g, '').slice(-8).toUpperCase() : '')
}

function ReceiptSearchModal({ invoices, onClose, onViewInvoice }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [match, setMatch] = useState(null) // { payment, invoice }

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) { toast.error('Enter a Transaction ID'); return }
    setLoading(true)
    setSearched(true)
    setMatch(null)
    try {
      const payments = await paymentsApi.list()
      const needle = q.toLowerCase()
      const found = payments.find((p) => txnIdFor(p).toLowerCase() === needle || p.id?.toLowerCase() === needle)
      if (!found) { setMatch(null); return }
      const inv = invoices.find((i) => i.id === found.invoice_id)
      setMatch({ payment: found, invoice: inv })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="🔍 Find Receipt by Transaction ID" onClose={onClose} size="sm">
      <div className="form-group">
        <label className="form-label">Transaction ID</label>
        <input
          className="form-input"
          placeholder="e.g. TXN-AB12CD34"
          style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: '.05em' }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
        />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner spinner-dark" style={{ margin: '0 auto' }} /></div>
      )}

      {!loading && searched && match && (
        <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 8, padding: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, color: 'var(--c-primary)', fontSize: 15 }}>{txnIdFor(match.payment)}</span>
            <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>PAID</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--c-text2)' }}>Invoice</span><span>{match.invoice?.number || '—'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--c-text2)' }}>Customer</span><span>{match.invoice?.customer_name || '—'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: 'var(--c-text2)' }}>Amount Paid</span><span style={{ fontWeight: 700, color: 'var(--c-green)' }}>{fmt.currency(match.payment.amount)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ color: 'var(--c-text2)' }}>Date</span><span>{fmt.date(match.payment.date)}</span></div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { onClose(); if (match.invoice) onViewInvoice(match.invoice.id) }}>View Full Receipt →</button>
        </div>
      )}

      {!loading && searched && !match && (
        <div style={{ background: '#fdf0f0', border: '1px solid #f5c6c6', borderRadius: 8, padding: 12, fontSize: 13, color: '#d63d3d' }}>
          ❌ Transaction not found
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>Search</button>
      </div>
    </Modal>
  )
}

function exportInvoicesCSV(invoices) {
  const rows = [['Invoice #','Customer','Date','Due Date','Status','Total','Currency']]
  invoices.forEach((inv) => {
    rows.push([
      inv.number || '',
      inv.customer_name || '',
      inv.date || '',
      inv.due_date || '',
      inv.status || '',
      Number(inv.total || 0).toFixed(2),
      inv.currency || 'INR',
    ])
  })
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'invoices-' + new Date().toISOString().slice(0, 10) + '.csv'
  a.click()
  toast.success('Invoices exported as CSV')
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [view, setView] = useState('table')
  const [previewId, setPreviewId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  // Fetch the FULL invoice (with items) before opening the edit form.
  // The list endpoint only returns summary columns — no line items.
  const fetchAndEdit = async (inv) => {
    setEditLoading(inv.id)
    try {
      const full = await invoicesApi.get(inv.id)
      setEditing(full)
      setFormOpen(true)
    } catch (e) {
      toast.error('Could not load invoice details: ' + e.message)
    } finally {
      setEditLoading(false)
    }
  }

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
    const isPartial = inv.status === 'partially_paid' || (Number(inv.paid_amount || 0) > 0 && inv.status !== 'paid' && inv.status !== 'cancelled')
    const matchStatus = activeTab === 'all' ||
      (activeTab === 'partially_paid' ? isPartial : inv.status === activeTab)
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
    partially_paid: invoices.filter((i) => i.status === 'partially_paid' || (Number(i.paid_amount || 0) > 0 && i.status !== 'paid' && i.status !== 'cancelled')).length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    cancelled: invoices.filter((i) => i.status === 'cancelled').length,
  }
 
  const totalValue = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount || (i.status === 'paid' ? i.total : 0)), 0)
  const totalPending = invoices
    .filter((i) => !['draft', 'paid', 'cancelled', 'void'].includes(i.status))
    .reduce((s, i) => s + Math.max(0, Number(i.total || 0) - Number(i.paid_amount || 0)), 0)
  const totalOverdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((s, i) => s + Math.max(0, Number(i.total || 0) - Number(i.paid_amount || 0)), 0)

  if (isLoading) return <PageLoading />

  const renderPaymentCell = (inv) => {
    if (inv.status === 'paid') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          background: 'var(--c-green-lt, #d1fae5)',
          color: 'var(--c-green, #065f46)',
          fontSize: 11,
          fontWeight: 700,
        }}>
          ✓ Paid
        </span>
      )
    }
    if (inv.status === 'cancelled') {
      return <span style={{ color: 'var(--c-text3)' }}>—</span>
    }

    const totalAmt = Number(inv.total || 0)
    const paidAmt = Number(inv.paid_amount || 0)
    const balDue = Math.max(0, totalAmt - paidAmt)
    const isPartial = inv.status === 'partially_paid' || (paidAmt > 0 && balDue > 0.005)
    const pct = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 0

    if (isPartial) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 124 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
            <span style={{ fontWeight: 700, color: '#b45309' }}>Paid {fmt.currency(paidAmt)}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)' }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: '#fef3c7', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>Due: {fmt.currency(balDue)}</span>
            <button
              className="btn btn-primary btn-xs"
              style={{ padding: '2px 6px', fontSize: 10, height: 18, lineHeight: 1 }}
              onClick={(e) => { e.stopPropagation(); setPaymentInvoiceId(inv.id) }}
              title="Record payment"
            >
              + Collect
            </button>
          </div>
        </div>
      )
    }

    return (
      <button
        className="btn btn-primary btn-sm"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', fontSize: 12 }}
        onClick={(e) => { e.stopPropagation(); setPaymentInvoiceId(inv.id) }}
      >
        <CreditCard size={13} /> Collect
      </button>
    )
  }

  return (
    <div>
      {/* ── STATS CARDS ── */}
      <div className="inv-stats-grid">
        <div className="inv-stat-card">
          <div className="inv-stat-icon inv-stat-icon--blue"><FileText /></div>
          <div className="inv-stat-body">
            <span className="inv-stat-label">Total Invoices</span>
            <div className="inv-stat-row">
              <span className="inv-stat-value">{fmt.currency(totalValue)}</span>
              <span className="inv-stat-sub">{invoices.length} Records</span>
            </div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon inv-stat-icon--green"><CheckCircle2 /></div>
          <div className="inv-stat-body">
            <span className="inv-stat-label">Collected</span>
            <div className="inv-stat-row">
              <span className="inv-stat-value">{fmt.currency(totalPaid)}</span>
              <span className="inv-stat-sub">{totals.paid} Paid</span>
            </div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon inv-stat-icon--orange"><Clock /></div>
          <div className="inv-stat-body">
            <span className="inv-stat-label">Outstanding</span>
            <div className="inv-stat-row">
              <span className="inv-stat-value">{fmt.currency(totalPending)}</span>
              <span className="inv-stat-sub">{totals.draft + totals.sent} Pending</span>
            </div>
          </div>
        </div>
        <div className="inv-stat-card">
          <div className="inv-stat-icon inv-stat-icon--red"><AlertCircle /></div>
          <div className="inv-stat-body">
            <span className="inv-stat-label">Overdue</span>
            <div className="inv-stat-row">
              <span className="inv-stat-value">{fmt.currency(totalOverdue)}</span>
              <span className="inv-stat-sub">{totals.overdue} Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK SCANNER BANNER ── */}
      <div className="inv-quick-pos-banner">
        <div className="inv-quick-pos-glow" />
        <div className="inv-quick-pos-left">
          <div className="inv-quick-pos-icon"><Scan size={22} /></div>
          <div>
            <div className="inv-quick-pos-title">Quick Invoice Scanner</div>
            <div className="inv-quick-pos-sub">Scan a barcode or QR code to instantly look up any invoice</div>
          </div>
        </div>
        <div className="inv-quick-pos-actions">
          <button className="inv-qpos-btn-scan" onClick={() => setScannerOpen(true)}>
            <Scan size={15} /> Scan &amp; Lookup
          </button>
          <button className="inv-qpos-btn-new" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> New Invoice
          </button>
          <button className="inv-qpos-btn-export" onClick={() => exportInvoicesCSV(invoices)}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── FILTER / SEARCH BAR ── */}
      <div className="inv-filter-bar">
        <div className="inv-filter-left">
          <div className="inv-search-wrap">
            <Search className="inv-search-icon" />
            <input
              className="inv-search-input"
              type="text"
              placeholder="Search by invoice # or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="inv-filter-right">
          <div className="pill-tabs">
            {STATUS_TABS.map((t) => {
              const count = t.id === 'all' ? invoices.length : totals[t.id] || 0
              return (
                <button
                  key={t.id}
                  className={`pill-tab${activeTab === t.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label} ({count})
                </button>
              )
            })}
          </div>
          <div className="view-toggle-bar">
            <button className={`view-toggle-btn${view === 'table' ? ' active' : ''}`} title="Table view" onClick={() => setView('table')}>
              <ListIcon />
            </button>
            <button className={`view-toggle-btn${view === 'card' ? ' active' : ''}`} title="Card view" onClick={() => setView('card')}>
              <LayoutGrid />
            </button>
          </div>
        </div>
      </div>

      {/* ── INVOICE TABLE / CARD ── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2347', marginBottom: 6 }}>No invoices found</div>
            <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>{search ? 'No results for your search.' : 'Create your first invoice to get started.'}</div>
          </div>
        </div>
      ) : view === 'card' ? (
        <div className="card-grid">
          {filtered.map((inv, i) => (
            <div className="item-card" key={inv.id}>
              <div className="item-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div className={`item-card-avatar ${CARD_AVATAR_COLORS[i % CARD_AVATAR_COLORS.length]}`}>
                    <FileText size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="item-card-title" onClick={() => setPreviewId(inv.id)}>{inv.number}</div>
                    <div className="item-card-sub">{inv.customer_name}</div>
                  </div>
                </div>
                <Badge status={inv.status} />
              </div>
              <hr className="item-card-divider" />
              <div className="item-card-fields">
                <div className="item-card-field"><span className="item-card-field-label">Invoice Date</span><span className="item-card-field-val">{fmt.date(inv.date)}</span></div>
                <div className="item-card-field"><span className="item-card-field-label">Due Date</span><span className="item-card-field-val" style={inv.status === 'overdue' ? { color: 'var(--c-red)', fontWeight: 600 } : undefined}>{fmt.date(inv.due_date)}</span></div>
                <div className="item-card-field"><span className="item-card-field-label">Amount</span><span className="item-card-amount">{fmt.currency(inv.total, inv.currency)}</span></div>
                {Number(inv.paid_amount || 0) > 0 && inv.status !== 'paid' && (
                  <div className="item-card-field">
                    <span className="item-card-field-label">Balance Due</span>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>
                      {fmt.currency(Math.max(0, Number(inv.total || 0) - Number(inv.paid_amount || 0)))}
                    </span>
                  </div>
                )}
                <div className="item-card-field"><span className="item-card-field-label">Payment</span>{renderPaymentCell(inv)}</div>
              </div>
              <hr className="item-card-divider" />
              <div className="item-card-actions">
                <button className="topbar-icon-btn" title="Preview" onClick={() => setPreviewId(inv.id)}><Eye size={14} /></button>
                <button className="topbar-icon-btn" title="Edit" onClick={() => fetchAndEdit(inv)} disabled={editLoading === inv.id}>
                  {editLoading === inv.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Edit2 size={14} />}
                </button>
                {inv.status === 'draft' && (
                  <button className="btn btn-primary btn-sm" onClick={() => statusMut.mutate({ id: inv.id, status: 'sent' })}>Send</button>
                )}
                <button className="topbar-icon-btn" title="Delete" onClick={() => confirmAction('Delete this invoice?', () => deleteMut.mutate(inv.id))} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
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
                  <th>Payment</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td><span className="inv-num-link">{inv.number}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{inv.customer_name}</div>
                      {inv.customer_email && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{inv.customer_email}</div>}
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{fmt.date(inv.date)}</td>
                    <td style={inv.status === 'overdue' ? { color: 'var(--c-red)', fontWeight: 500 } : { color: 'var(--text-2)' }}>{fmt.date(inv.due_date)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt.currency(inv.total, inv.currency)}</td>
                    <td><Badge status={inv.status} /></td>
                    <td><ShipmentBadge status={inv.shipment_status} /></td>
                    <td onClick={(e) => e.stopPropagation()}>{renderPaymentCell(inv)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="tbl-actions">
                        <button className="topbar-icon-btn" title="Quick Preview" onClick={() => setPreviewId(inv.id)}>
                          <Eye size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Edit" onClick={() => fetchAndEdit(inv)} disabled={editLoading === inv.id}>
                          {editLoading === inv.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Edit2 size={14} />}
                        </button>
                        {inv.status === 'draft' && (
                          <button className="btn btn-primary" title="Mark Sent" onClick={() => statusMut.mutate({ id: inv.id, status: 'sent' })}>
                            Send
                          </button>
                        )}
                        <button className="topbar-icon-btn" title="Delete" onClick={() => confirmAction('Delete this invoice?', () => deleteMut.mutate(inv.id))} style={{ color: 'var(--red)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
          <InvoiceScanner 
            invoices={invoices} 
            onViewInvoice={(id) => { setScannerOpen(false); setPreviewId(id) }} 
          />
        </Modal>
      )}

      {paymentInvoiceId && (
        <InvoicePaymentModal
          invoiceId={paymentInvoiceId}
          onClose={() => setPaymentInvoiceId(null)}
        />
      )}
    </div>
  )
}
