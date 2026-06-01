// Shared shell used by all 4 AP tab components
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apApi } from '@/api'
import { fmt } from '@/lib/utils'
import { EmptyState, PageLoading } from '@/components/ui'
import { Search, Download, Calendar, X, RefreshCw, FileText } from 'lucide-react'
import { toast } from '@/store/toastStore'

// ── Status badge colours per doc type ─────────────────────────────────
const STATUS_COLORS = {
  draft:            { bg: 'var(--c-surface2)',   fg: 'var(--c-text2)' },
  submitted:        { bg: '#eef4fd',             fg: 'var(--c-primary)' },
  approved:         { bg: 'var(--c-green-lt)',   fg: 'var(--c-green)' },
  pending_approval: { bg: 'var(--c-orange-lt)', fg: 'var(--c-orange)' },
  partially_paid:   { bg: '#f3effe',             fg: 'var(--c-purple)' },
  paid:             { bg: 'var(--c-green-lt)',   fg: 'var(--c-green)' },
  reserved:         { bg: '#eef4fd',             fg: 'var(--c-primary)' },
  converted:        { bg: 'var(--c-green-lt)',   fg: 'var(--c-green)' },
  applied:          { bg: 'var(--c-green-lt)',   fg: 'var(--c-green)' },
  closed:           { bg: 'var(--c-surface2)',   fg: 'var(--c-text3)' },
  cancelled:        { bg: '#fdf0f0',             fg: 'var(--c-red)' },
}

export function APStatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft
  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Draft'
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: c.bg, color: c.fg, fontWeight: 600, fontSize: 11 }}>
      {label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────
export function APStatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'var(--c-primary-lt)', fg: 'var(--c-primary)' },
    green:  { bg: 'var(--c-green-lt)',   fg: 'var(--c-green)' },
    orange: { bg: 'var(--c-orange-lt)', fg: 'var(--c-orange)' },
    red:    { bg: 'var(--c-red-lt)',     fg: 'var(--c-red)' },
    purple: { bg: 'var(--c-purple-lt)', fg: 'var(--c-purple)' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className="stat-card">
      <div className="stat-card-body" style={{ paddingLeft: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: c.fg }}>{value}</div>
        <div className="stat-card-label">{label}</div>
        {sub && <div className="stat-card-sub" style={{ color: c.fg, opacity: 0.7 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Main Tab Shell ─────────────────────────────────────────────────────
export default function APTabShell({
  type,          // 'invoices' | 'down-payments' | 'credit-memos' | 'reserve-invoices'
  statCards,     // fn(stats) => [{label,value,sub,color}]
  statusOptions, // [{ value, label }]
  columns,       // [{ key, label, render?, align? }]
  emptyTitle,
  emptyDescription,
  onRowClick,    // fn(id) — opens drawer in parent
}) {
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ap-stats', type],
    queryFn:  () => apApi.stats(type),
    staleTime: 60_000,
  })

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['ap-list', type, status, dateFrom, dateTo],
    queryFn:  () => apApi.list(type, { status, from: dateFrom, to: dateTo }),
    staleTime: 30_000,
  })

  const filtered = search
    ? rows.filter(r =>
        r.doc_no?.toLowerCase().includes(search.toLowerCase()) ||
        r.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
        (r.vendor_inv_no || r.ref_invoice_no || r.vendor_ref_no || '').toLowerCase().includes(search.toLowerCase()) ||
        r.po_ref?.toLowerCase().includes(search.toLowerCase())
      )
    : rows

  const hasFilters = status !== 'all' || dateFrom || dateTo || search
  const clearFilters = () => { setStatus('all'); setDateFrom(''); setDateTo(''); setSearch('') }

  const exportCSV = () => {
    const headers = columns.map(c => c.label)
    const csvRows = filtered.map(row =>
      columns.map(c => {
        const val = row[c.key]
        return `"${val ?? ''}"`
      })
    )
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `ap-${type}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const cards = statCards ? statCards(stats || {}) : []

  return (
    <div>
      {/* Stat Cards */}
      {cards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length}, 1fr)`, gap: 14, marginBottom: 20 }}>
          {cards.map((c, i) => (
            <div key={i} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--c-text2)', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color === 'red' ? 'var(--c-red)' : c.color === 'green' ? 'var(--c-green)' : c.color === 'orange' ? 'var(--c-orange)' : 'var(--c-primary)' }}>{c.value}</div>
              {c.sub && <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 2 }}>{c.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div className="search-wrap" style={{ flex: '1 1 220px', minWidth: 180 }}>
          <Search className="search-icon" size={15} />
          <input className="form-input" placeholder={`Search ${type.replace('-', ' ')}…`}
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>

        <select className="form-select sm" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 150 }}>
          <option value="all">All Status</option>
          {(statusOptions || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={13} style={{ color: 'var(--c-text2)' }} />
          <input type="date" className="form-input sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 126 }} />
          <span style={{ fontSize: 11, color: 'var(--c-text2)' }}>to</span>
          <input type="date" className="form-input sm" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 126 }} />
        </div>

        {hasFilters && (
          <button className="btn btn-ghost btn-xs" onClick={clearFilters} style={{ color: 'var(--c-red)' }}>
            <X size={12} /> Clear
          </button>
        )}
        <button className="btn btn-ghost btn-xs" onClick={() => refetch()}>
          <RefreshCw size={12} /> Refresh
        </button>
        <button className="btn btn-ghost btn-xs" onClick={exportCSV} title="Export CSV">
          <Download size={12} /> Export
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 10 }}>
        {filtered.length} {filtered.length === 1 ? 'document' : 'documents'} found
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 60 }}><PageLoading /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60 }}>
            <EmptyState icon={<FileText size={32} />}
              title={hasFilters ? 'No documents match your filters' : emptyTitle}
              description={hasFilters ? 'Try adjusting your search or filters.' : emptyDescription}
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map(c => (
                    <th key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} className="clickable-row"
                    onClick={() => onRowClick?.(row.id)}>
                    {columns.map(c => (
                      <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                        {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
