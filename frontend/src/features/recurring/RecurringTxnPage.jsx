import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTopbarStore } from '@/store/topbarStore'
import { Badge, EmptyState, PageLoading } from '@/components/ui'
import {
  RefreshCw, Plus, FileText, CreditCard, Play, Pause, Trash2,
  Search, DollarSign, CheckCircle2, Clock, Calendar, User, ChevronLeft
} from 'lucide-react'
import PurchaseTemplateModal from './PurchaseTemplateModal'
import RecurringInvoiceModal from './RecurringInvoiceModal'
import { fmt } from '@/lib/utils'
import { recurringApi } from '@/api'
import { toast } from '@/store/toastStore'

const REC_NAV = [
  { id: 'rec_inv',  label: 'Recurring Invoices', icon: FileText,  group: 'Sales Automation'   },
  { id: 'pur_tpl',  label: 'Purchase Templates', icon: RefreshCw, group: 'Purchase Automation' },
  { id: 'auto_pay', label: 'Automated Payments', icon: CreditCard, group: 'Purchase Automation' },
]

const STATUS_OPTS = ['all', 'active', 'paused', 'draft']

const FREQ_LABELS = {
  daily: 'Daily', weekly: 'Weekly', bimonthly: 'Bi-Monthly',
  monthly: 'Monthly', quarterly: 'Quarterly', biannual: 'Bi-Annual', yearly: 'Yearly',
}

const HEADERS = {
  rec_inv:  ['TEMPLATE NAME', 'CUSTOMER', 'FREQUENCY', 'AMOUNT / CYCLE', 'NEXT RUN', 'AUTO-SEND', 'STATUS'],
  pur_tpl:  ['TEMPLATE NAME', 'VENDOR',   'FREQUENCY', 'AMOUNT / CYCLE', 'NEXT RUN', 'STATUS'],
  auto_pay: ['TEMPLATE NAME', 'VENDOR',   'FREQUENCY', 'AMOUNT / CYCLE', 'NEXT RUN', 'STATUS'],
}

export default function RecurringTxnPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('rec_inv')
  const [collapsed, setCollapsed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')

  const currentNav = REC_NAV.find(n => n.id === activeTab)
  const isInvoice  = activeTab === 'rec_inv'

  // ── Queries ────────────────────────────────────────────────────
  const { data: recurringInvoices = [], isLoading: loadInv } = useQuery({
    queryKey: ['recurring-invoices'],
    queryFn: recurringApi.listInvoices,
  })

  const { data: purchaseTemplates = [], isLoading: loadTpl } = useQuery({
    queryKey: ['purchase-templates'],
    queryFn: recurringApi.listTemplates,
  })

  const isLoading = loadInv || loadTpl

  // ── Mutations ──────────────────────────────────────────────────
  const createInvoiceMut = useMutation({
    mutationFn: recurringApi.createInvoice,
    onSuccess: () => { qc.invalidateQueries(['recurring-invoices']); toast.success('Recurring invoice created') },
    onError:   e => toast.error(e.message),
  })

  const createTemplateMut = useMutation({
    mutationFn: recurringApi.createTemplate,
    onSuccess: () => { qc.invalidateQueries(['purchase-templates']); toast.success('Template created') },
    onError:   e => toast.error(e.message),
  })

  const toggleInvoiceMut = useMutation({
    mutationFn: ({ id, status }) => recurringApi.updateInvoiceStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['recurring-invoices']),
    onError:   e => toast.error(e.message),
  })

  const toggleTemplateMut = useMutation({
    mutationFn: ({ id, status }) => recurringApi.updateTemplateStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['purchase-templates']),
    onError:   e => toast.error(e.message),
  })

  const deleteInvoiceMut = useMutation({
    mutationFn: recurringApi.removeInvoice,
    onSuccess: () => { qc.invalidateQueries(['recurring-invoices']); toast.success('Deleted') },
    onError:   e => toast.error(e.message),
  })

  const deleteTemplateMut = useMutation({
    mutationFn: recurringApi.removeTemplate,
    onSuccess: () => { qc.invalidateQueries(['purchase-templates']); toast.success('Deleted') },
    onError:   e => toast.error(e.message),
  })

  // ── Derived data ───────────────────────────────────────────────
  // auto_pay tab reuses purchase templates until a dedicated table is added
  const allItems =
    activeTab === 'rec_inv'  ? recurringInvoices :
    activeTab === 'pur_tpl'  ? purchaseTemplates :
    purchaseTemplates  // auto_pay same source for now

  const filtered = allItems.filter(item => {
    const matchStatus = filter === 'all' || item.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      item.name?.toLowerCase().includes(q) ||
      item.customer_name?.toLowerCase().includes(q) ||
      item.vendor_name?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const counts = {
    all:    allItems.length,
    active: allItems.filter(i => i.status === 'active').length,
    paused: allItems.filter(i => i.status === 'paused').length,
    draft:  allItems.filter(i => i.status === 'draft').length,
  }

  // ── Handlers ───────────────────────────────────────────────────
  const handleSave = (data) => {
    if (isInvoice) createInvoiceMut.mutate(data)
    else           createTemplateMut.mutate(data)
    setModalOpen(false)
  }

  const handleToggle = (item) => {
    const newStatus = item.status === 'active' ? 'paused' : 'active'
    if (isInvoice) toggleInvoiceMut.mutate({ id: item.id, status: newStatus })
    else           toggleTemplateMut.mutate({ id: item.id, status: newStatus })
  }

  const handleDelete = (item) => {
    if (!window.confirm('Delete this template?')) return
    if (isInvoice) deleteInvoiceMut.mutate(item.id)
    else           deleteTemplateMut.mutate(item.id)
  }

  const switchTab = (id) => { setActiveTab(id); setSearch(''); setFilter('all') }

  useEffect(() => {
    setContext('Recurring Billing', currentNav?.label)
    setActions(
      <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
        <Plus size={15} /> New {currentNav?.label?.replace(/s$/, '')}
      </button>
    )
    return clear
  }, [setActions, setContext, clear, activeTab]) // eslint-disable-line

  if (isLoading) return <PageLoading />

  const headers = HEADERS[activeTab] || []
  const groups  = [...new Set(REC_NAV.map(n => n.group))]

  return (
    <div className="secondary-layout">

      {/* ── Sidebar ── */}
      <aside className={'secondary-sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="secondary-sidebar-title">
          <span>Automation</span>
          <button
            className="secondary-header-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {groups.map(group => (
            <div key={group}>
              {!collapsed && (
                <div style={{
                  fontSize: 10, fontWeight: 800, color: 'var(--c-text3)',
                  textTransform: 'uppercase', letterSpacing: '.08em',
                  padding: '10px 12px 4px', marginTop: 4,
                }}>
                  {group}
                </div>
              )}
              {REC_NAV.filter(n => n.group === group).map(item => (
                <div
                  key={item.id}
                  className={'secondary-nav-item' + (activeTab === item.id ? ' active' : '')}
                  onClick={() => switchTab(item.id)}
                  title={collapsed ? item.label : ''}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="secondary-content">

        {/* KPI strip */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="kpi-card blue">
            <div className="kpi-icon"><FileText size={20} /></div>
            <div className="kpi-label">Total</div>
            <div className="kpi-value">{allItems.length}</div>
            <div className="kpi-sub">{fmt.currency(allItems.reduce((s, i) => s + Number(i.amount || 0), 0))} / cycle</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon"><CheckCircle2 size={20} /></div>
            <div className="kpi-label">Active</div>
            <div className="kpi-value">{counts.active}</div>
            <div className="kpi-sub">Running now</div>
          </div>
          <div className="kpi-card orange">
            <div className="kpi-icon"><Clock size={20} /></div>
            <div className="kpi-label">Paused</div>
            <div className="kpi-value">{counts.paused}</div>
            <div className="kpi-sub">{counts.draft} draft</div>
          </div>
          <div className="kpi-card purple">
            <div className="kpi-icon"><DollarSign size={20} /></div>
            <div className="kpi-label">Monthly Value</div>
            <div className="kpi-value">
              {fmt.currency(
                allItems
                  .filter(i => i.status === 'active' && i.frequency === 'monthly')
                  .reduce((s, i) => s + Number(i.amount || 0), 0)
              )}
            </div>
            <div className="kpi-sub">Active monthly</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <div className="search-wrap" style={{ width: 300 }}>
            <Search className="search-icon" size={15} />
            <input
              className="form-input"
              style={{ paddingLeft: 34 }}
              placeholder={`Search ${(currentNav?.label || '').toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="spacer" />
          <div className="pill-tabs">
            {STATUS_OPTS.map(s => (
              <button key={s} className={'pill-tab' + (filter === s ? ' active' : '')} onClick={() => setFilter(s)}>
                {s.toUpperCase()}
                {s !== 'all' && counts[s] > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, opacity: .8 }}>({counts[s]})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  {headers.map(h => <th key={h}>{h}</th>)}
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} style={{ padding: '80px 0' }}>
                      <EmptyState
                        icon={<RefreshCw size={44} />}
                        title={allItems.length === 0
                          ? `No ${(currentNav?.label || '').toLowerCase()} yet`
                          : 'No results found'}
                        description={allItems.length === 0
                          ? isInvoice
                            ? 'Automate repeat billing — retainers, subscriptions, supply invoices.'
                            : 'Create reusable templates for recurring purchase transactions.'
                          : 'Try a different search or status filter.'}
                        action={allItems.length === 0 && (
                          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                            <Plus size={15} /> New {currentNav?.label?.replace(/s$/, '')}
                          </button>
                        )}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={13} color="var(--c-text3)" />
                          <span>{item.customer_name || item.vendor_name || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: 999,
                          background: 'var(--c-primary-lt)', color: 'var(--c-primary)',
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {FREQ_LABELS[item.frequency] || item.frequency}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {fmt.currency(item.amount || 0)}
                      </td>
                      <td style={{ color: 'var(--c-text2)', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={12} color="var(--c-text3)" />
                          {item.next_run
                            ? new Date(item.next_run).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </div>
                      </td>
                      {isInvoice && (
                        <td>
                          <span style={{ fontSize: 12 }}>{item.auto_send ? '📧 Auto' : '📋 Draft'}</span>
                        </td>
                      )}
                      <td>
                        <Badge
                          status={item.status === 'active' ? 'paid' : item.status === 'paused' ? 'sent' : 'draft'}
                          label={item.status === 'active' ? 'Active' : item.status === 'paused' ? 'Paused' : 'Draft'}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="topbar-icon-btn"
                            title={item.status === 'active' ? 'Pause' : 'Resume'}
                            onClick={() => handleToggle(item)}
                          >
                            {item.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <button
                            className="topbar-icon-btn"
                            title="Delete"
                            style={{ color: 'var(--c-red)' }}
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      {modalOpen && activeTab === 'rec_inv' && (
        <RecurringInvoiceModal onClose={() => setModalOpen(false)} onSave={handleSave} />
      )}
      {modalOpen && (activeTab === 'pur_tpl' || activeTab === 'auto_pay') && (
        <PurchaseTemplateModal onClose={() => setModalOpen(false)} onSave={handleSave} />
      )}
    </div>
  )
}
