import { useState, useEffect, useCallback } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { useQuery } from '@tanstack/react-query'
import { goodsReturnsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { EmptyState, Badge, PageLoading, Modal } from '@/components/ui'
import GoodsReturnForm   from './GoodsReturnForm'
import GoodsReturnDetail from './GoodsReturnDetail'
import {
  Plus, Search, Download, Filter, RotateCcw, TrendingDown,
  Package, AlertCircle, ChevronDown, RefreshCw, BarChart2,
  FileText, Calendar, Warehouse, Truck, X,
} from 'lucide-react'
import { toast } from '@/store/toastStore'

const STATUS_OPTS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'returned', label: 'Returned' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const WAREHOUSES = ['All Warehouses', 'Main Warehouse', 'Secondary Warehouse', 'Cold Storage', 'Transit Hub']

const REPORT_TYPES = [
  { value: 'register', label: 'Goods Return Register' },
  { value: 'by-supplier', label: 'Supplier Return Report' },
  { value: 'trend', label: 'Return Trend Analysis' },
  { value: 'inventory-impact', label: 'Inventory Impact Report' },
]

function StatCard({ icon: Icon, label, value, sub, color = 'blue', subIcon: SubIcon }) {
  const PALETTE = {
    blue:   { border: 'var(--c-primary)', iconBg: 'var(--c-primary-lt)', iconFg: 'var(--c-primary)', valFg: 'var(--c-text)' },
    green:  { border: 'var(--c-green)',   iconBg: 'var(--c-green-lt)',   iconFg: 'var(--c-green)',   valFg: 'var(--c-green)' },
    red:    { border: 'var(--c-red)',     iconBg: 'var(--c-red-lt)',     iconFg: 'var(--c-red)',     valFg: 'var(--c-red)' },
    orange: { border: 'var(--c-orange)', iconBg: 'var(--c-orange-lt)',  iconFg: 'var(--c-orange)',  valFg: 'var(--c-orange)' },
    purple: { border: 'var(--c-purple)', iconBg: 'var(--c-purple-lt)',  iconFg: 'var(--c-purple)',  valFg: 'var(--c-purple)' },
  }
  const p = PALETTE[color] || PALETTE.blue
  return (
    <div style={{
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border)',
      borderLeft: `4px solid ${p.border}`,
      borderRadius: 10,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: 'var(--shadow)',
    }}>
      {/* Icon bubble */}
      <div style={{
        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
        background: p.iconBg, color: p.iconFg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={24} strokeWidth={2} />
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text2)',
          textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 5 }}>
          {label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: p.valFg, marginBottom: 5 }}>
          {value}
        </div>
        {sub && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--c-text3)' }}>
            {SubIcon && <SubIcon size={12} />}
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusPipeline({ stats }) {
  const steps = [
    { key: 'draft_count',     label: 'Draft',    color: '#9aa3b2' },
    { key: 'submitted_count', label: 'Submitted', color: 'var(--c-orange)' },
    { key: 'approved_count',  label: 'Approved',  color: 'var(--c-primary)' },
    { key: 'returned_count',  label: 'Returned',  color: 'var(--c-purple)' },
    { key: 'closed_count',    label: 'Closed',    color: 'var(--c-green)' },
  ]
  const total = steps.reduce((s, st) => s + parseInt(stats?.[st.key] || 0), 0) || 1

  return (
    <div>
      {/* Bar */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', height: 44, marginBottom: 10 }}>
        {steps.map((st) => {
          const count = parseInt(stats?.[st.key] || 0)
          const pct   = Math.max(6, (count / total) * 100)
          return (
            <div key={st.key} title={`${st.label}: ${count}`}
              style={{ flex: pct, background: st.color, borderRadius: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minWidth: 44, transition: 'flex .35s ease', opacity: count === 0 ? 0.2 : 1 }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 16, lineHeight: 1 }}>{count}</div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 9, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{st.label}</div>
            </div>
          )
        })}
      </div>
      {/* Legend dots */}
      <div style={{ display: 'flex', gap: 16 }}>
        {steps.map(st => (
          <div key={st.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--c-text2)' }}>{st.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CLOSED = { open: false, mode: null, docId: null }

export default function GoodsReturnPage() {
  const { setActions, setContext, clear } = useTopbarStore()

  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('all')
  const [warehouse, setWarehouse] = useState('All Warehouses')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [showReport, setShowReport] = useState(false)
  const [activeReport, setActiveReport] = useState('register')
  const [reportData,   setReportData]   = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  // ── Modal state ───────────────────────────────────────────────────
  const [modal,       setModal]       = useState(CLOSED)
  const [modalFooter, setModalFooter] = useState(null)

  const openCreate = () => { setModalFooter(null); setModal({ open: true, mode: 'create', docId: null }) }
  const openDetail = (docId) => { setModalFooter(null); setModal({ open: true, mode: 'detail', docId }) }
  const openEdit   = (docId) => { setModalFooter(null); setModal({ open: true, mode: 'edit', docId }) }
  const closeModal = () => { setModal(CLOSED); setModalFooter(null) }

  const modalTitle = modal.mode === 'create' ? 'New Goods Return'
    : modal.mode === 'edit'   ? 'Edit Goods Return'
    : 'Goods Return Details'

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['goods-returns-stats'],
    queryFn:  () => goodsReturnsApi.stats(),
    staleTime: 60_000,
  })

  const { data: returns = [], isLoading, refetch } = useQuery({
    queryKey: ['goods-returns', status, warehouse, dateFrom, dateTo],
    queryFn:  () => goodsReturnsApi.list({ status, warehouse: warehouse === 'All Warehouses' ? '' : warehouse, from: dateFrom, to: dateTo }),
    staleTime: 30_000,
  })

  const filtered = search
    ? returns.filter(r =>
        r.return_no?.toLowerCase().includes(search.toLowerCase()) ||
        r.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.base_receipt_no?.toLowerCase().includes(search.toLowerCase())
      )
    : returns

  useEffect(() => {
    setContext('Purchase & A/P', 'Goods Returns')
    setActions(
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => setShowReport(r => !r)}>
          <BarChart2 size={15} /> Reports
        </button>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> New Return
        </button>
      </div>
    )
    return clear
  }, [setActions, setContext, clear])

  const exportCSV = () => {
    const rows = [
      ['Return No', 'Vendor', 'Base Receipt', 'Date', 'Warehouse', 'Status', 'Items', 'Total (INR)'],
      ...filtered.map(r => [
        r.return_no, r.vendor_name, r.base_receipt_no || '', r.return_date,
        r.warehouse, r.status, r.item_count, r.total_amount,
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
    const a   = document.createElement('a')
    a.href    = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `goods-returns-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const loadReport = async () => {
    setReportLoading(true)
    try {
      const data = await goodsReturnsApi.report(activeReport, dateFrom, dateTo)
      setReportData(data)
    } catch (e) {
      toast.error('Failed to load report')
    } finally {
      setReportLoading(false)
    }
  }

  const clearFilters = () => { setStatus('all'); setWarehouse('All Warehouses'); setDateFrom(''); setDateTo(''); setSearch('') }
  const hasFilters = status !== 'all' || warehouse !== 'All Warehouses' || dateFrom || dateTo || search

  if (isLoading && !returns.length) return <PageLoading />

  return (
    <div className="page-content">

      {/* ── KPI Cards ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 }}>
        <StatCard
          icon={RotateCcw}
          label="Total Returns"
          color="blue"
          value={statsLoading ? '…' : (stats?.stats?.total_returns ?? 0)}
          sub={`${stats?.stats?.returns_this_month ?? 0} this month`}
        />
        <StatCard
          icon={TrendingDown}
          label="Total Return Value"
          color="orange"
          value={statsLoading ? '…' : fmt.currency(stats?.stats?.total_value ?? 0)}
          sub={`${fmt.currency(stats?.stats?.value_this_month ?? 0)} this month`}
        />
        <StatCard
          icon={AlertCircle}
          label="Pending Approval"
          color="red"
          value={statsLoading ? '…' : (stats?.stats?.submitted_count ?? 0)}
          sub="Awaiting admin review"
        />
        <StatCard
          icon={Package}
          label="Stock Adjusted"
          color="green"
          value={statsLoading ? '…' : (stats?.stats?.returned_count ?? 0)}
          sub="Items returned to supplier"
        />
      </div>

      {/* ── Status Pipeline ──────────────────────────── */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Return Workflow Pipeline</span>
          <button className="btn btn-ghost btn-xs" onClick={() => refetch()}><RefreshCw size={13} /> Refresh</button>
        </div>
        {statsLoading ? <div style={{ height: 48, background: 'var(--c-surface2)', borderRadius: 6 }} /> : <StatusPipeline stats={stats?.stats} />}
      </div>

      {/* ── Top Suppliers ────────────────────────────── */}
      {stats?.topSuppliers?.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: '14px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
            Top Suppliers by Returns
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {stats.topSuppliers.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                background: 'var(--c-surface2)', borderRadius: 8, border: '1px solid var(--c-border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-primary-lt)',
                  color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12 }}>
                  {s.vendor_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.vendor_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{s.return_count} returns · {fmt.currency(s.total_value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reports Panel ────────────────────────────── */}
      {showReport && (
        <div className="card" style={{ marginBottom: 20, padding: '18px 20px', border: '1px solid var(--c-primary)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Generate Report</span>
            <button className="btn-icon-sm" onClick={() => setShowReport(false)}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>Report Type</label>
              <select className="form-select sm" value={activeReport} onChange={e => setActiveReport(e.target.value)} style={{ width: 220 }}>
                {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>From</label>
              <input type="date" className="form-input sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>To</label>
              <input type="date" className="form-input sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={loadReport} disabled={reportLoading}>
              {reportLoading ? 'Loading…' : 'Generate'} <BarChart2 size={14} />
            </button>
          </div>

          {reportData && (
            <div style={{ marginTop: 16, overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {Object.keys(reportData[0] || {}).map(k => (
                      <th key={k}>{k.replace(/_/g, ' ').toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j}>{typeof v === 'number' && j > 0 ? fmt.currency(v) : v ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────── */}
      <div className="filter-bar" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div className="search-wrap" style={{ flex: '1 1 240px', minWidth: 200 }}>
          <Search className="search-icon" size={15} />
          <input className="form-input" placeholder="Search return no, vendor, receipt…"
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>

        <select className="form-select sm" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 140 }}>
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select className="form-select sm" value={warehouse} onChange={e => setWarehouse(e.target.value)} style={{ width: 170 }}>
          {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} style={{ color: 'var(--c-text2)' }} />
          <input type="date" className="form-input sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 130 }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>to</span>
          <input type="date" className="form-input sm" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 130 }} />
        </div>

        {hasFilters && (
          <button className="btn btn-ghost btn-xs" onClick={clearFilters} style={{ color: 'var(--c-red)' }}>
            <X size={13} /> Clear
          </button>
        )}

        <button className="btn btn-ghost btn-xs" onClick={exportCSV} title="Export CSV">
          <Download size={13} /> Export
        </button>
      </div>

      {/* ── Result count ─────────────────────────────── */}
      <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 10 }}>
        {filtered.length} {filtered.length === 1 ? 'return' : 'returns'} found
        {hasFilters && <span style={{ marginLeft: 6, color: 'var(--c-primary)', cursor: 'pointer', fontWeight: 500 }} onClick={clearFilters}>Clear filters</span>}
      </div>

      {/* ── Table ────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 60 }}>
            <EmptyState
              icon={<RotateCcw size={32} />}
              title={hasFilters ? 'No returns match your filters' : 'No goods returns yet'}
              description={hasFilters ? 'Try adjusting your search or filters.' : 'Create your first goods return to get started.'}
              action={!hasFilters && (
                <button className="btn btn-primary" onClick={openCreate}>
                  <Plus size={15} /> Create Goods Return
                </button>
              )}
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Return No</th>
                  <th>Vendor</th>
                  <th>Base Receipt</th>
                  <th>Return Date</th>
                  <th>Warehouse</th>
                  <th style={{ textAlign: 'center' }}>Items</th>
                  <th style={{ textAlign: 'right' }}>Total Value</th>
                  <th>Credit Note</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="clickable-row" onClick={() => openDetail(r.id)}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--c-primary)', fontFamily: 'monospace', fontSize: 13 }}>
                        {r.return_no}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.vendor_name}</div>
                      {r.vendor_gstin && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{r.vendor_gstin}</div>}
                    </td>
                    <td style={{ color: 'var(--c-text2)', fontSize: 12 }}>{r.base_receipt_no || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmt.date(r.return_date)}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Warehouse size={12} style={{ color: 'var(--c-text3)' }} />
                        {r.warehouse}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: 'var(--c-blue-lt)', color: 'var(--c-primary)', borderRadius: 20,
                        padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                        {r.item_count}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt.currency(r.total_amount)}</td>
                    <td style={{ fontSize: 12 }}>
                      {r.credit_note_no
                        ? <span style={{ color: 'var(--c-green)', fontWeight: 500 }}>{r.credit_note_no}</span>
                        : <span style={{ color: 'var(--c-text3)' }}>—</span>}
                    </td>
                    <td><ReturnStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Popup Modal ──────────────────────────────── */}
      <Modal
        isOpen={modal.open}
        onClose={closeModal}
        title={modalTitle}
        size="xl"
        footer={modalFooter}
      >
        {(modal.mode === 'create' || modal.mode === 'edit') && (
          <GoodsReturnForm
            docId={modal.mode === 'edit' ? modal.docId : null}
            onClose={closeModal}
            onSuccess={(id) => setModal({ open: true, mode: 'detail', docId: id })}
            onSetFooter={setModalFooter}
          />
        )}
        {modal.mode === 'detail' && modal.docId && (
          <GoodsReturnDetail
            docId={modal.docId}
            onClose={closeModal}
            onEdit={(id) => { setModalFooter(null); setModal({ open: true, mode: 'edit', docId: id }) }}
            onSetFooter={setModalFooter}
          />
        )}
      </Modal>
    </div>
  )
}

export function ReturnStatusBadge({ status }) {
  const map = {
    draft:     { label: 'Draft',             cls: 'badge-draft' },
    submitted: { label: 'Submitted',          cls: 'badge-pending' },
    approved:  { label: 'Approved',           cls: 'badge-blue' },
    returned:  { label: 'Returned',           cls: 'badge-purple' },
    closed:    { label: 'Closed',             cls: 'badge-green' },
    cancelled: { label: 'Cancelled',          cls: 'badge-gray' },
  }
  const b = map[status] || { label: status, cls: 'badge-draft' }
  return <span className={`badge ${b.cls}`}>{b.label}</span>
}
