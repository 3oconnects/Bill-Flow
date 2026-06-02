import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { useTopbarStore } from '@/store/topbarStore'
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft,
  Search, Download, RefreshCw, CreditCard, Banknote, Smartphone,
  Building2, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

/* ── Constants ────────────────────────────────────────────────── */
const METHOD_META = {
  upi:           { label: 'UPI',           color: '#6366f1', icon: Smartphone },
  neft:          { label: 'NEFT',          color: '#0ea5e9', icon: Building2 },
  rtgs:          { label: 'RTGS',          color: '#0284c7', icon: Building2 },
  cash:          { label: 'Cash',          color: '#10b981', icon: Banknote },
  cheque:        { label: 'Cheque',        color: '#f59e0b', icon: CreditCard },
  card:          { label: 'Card',          color: '#ec4899', icon: CreditCard },
  bank_transfer: { label: 'Bank Transfer', color: '#8b5cf6', icon: Building2 },
}

const DATE_FILTERS = [
  { id: 'month', label: 'This Month' },
  { id: 'qtr',   label: 'This Quarter' },
  { id: 'year',  label: 'This Year' },
  { id: 'all',   label: 'All Time' },
]

function getRange(filter) {
  const now = new Date()
  if (filter === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), now]
  if (filter === 'qtr')   return [new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), now]
  if (filter === 'year')  return [new Date(now.getFullYear(), 0, 1), now]
  return [null, null]
}

/* ── Sub-components ───────────────────────────────────────────── */

function AccountCard({ method, totalIn, totalOut, txnCount, color, Icon }) {
  const balance = totalIn - totalOut
  return (
    <div style={{
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border)',
      borderRadius: 12,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      {/* Accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: color, borderRadius: '12px 0 0 12px' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} color={color} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)' }}>{method}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 1 }}>{txnCount} transactions</div>
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
          padding: '3px 8px', borderRadius: 20,
          background: balance >= 0 ? '#e6f5ee' : '#fdf0f0',
          color: balance >= 0 ? '#0a8754' : '#d63d3d',
        }}>
          {balance >= 0 ? '▲ Positive' : '▼ Negative'}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 3 }}>Net Balance</div>
        <div style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-.5px',
          color: balance >= 0 ? '#0a8754' : '#d63d3d',
        }}>
          {fmt.currency(Math.abs(balance))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#e6f5ee', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#0a8754', fontWeight: 700, marginBottom: 2 }}>↓ RECEIVED</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0a8754' }}>{fmt.currency(totalIn)}</div>
        </div>
        <div style={{ background: '#fdf0f0', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#d63d3d', fontWeight: 700, marginBottom: 2 }}>↑ PAID</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#d63d3d' }}>{fmt.currency(totalOut)}</div>
        </div>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--c-surface)', border: '1px solid var(--c-border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{p.name}:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)' }}>{fmt.currency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function BankingPage() {
  const { setContext, setActions, clear } = useTopbarStore()
  const [dateFilter, setDateFilter] = useState('month')
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeTab, setActiveTab]   = useState('overview')

  useEffect(() => {
    setContext('Banking', 'Accounts & Reconciliation')
    setActions(null)
    return clear
  }, [setContext, setActions, clear])

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ['cash-ledger'],
    queryFn: reportsApi.cashLedger,
  })

  const { data: cashFlow, isLoading: flowLoading } = useQuery({
    queryKey: ['cash-flow'],
    queryFn: reportsApi.cashFlow,
  })

  const isLoading = ledgerLoading || flowLoading

  /* ── Filtered ledger for date range ── */
  const filtered = useMemo(() => {
    const [from, to] = getRange(dateFilter)
    return ledger.filter(txn => {
      const d = new Date(txn.date)
      const matchDate   = (!from || d >= from) && (!to || d <= to)
      const matchType   = typeFilter === 'all' || txn.txn_type === typeFilter
      const q = search.toLowerCase()
      const matchSearch = !q ||
        txn.reference?.toLowerCase().includes(q) ||
        txn.party?.toLowerCase().includes(q) ||
        txn.narration?.toLowerCase().includes(q) ||
        txn.method?.toLowerCase().includes(q)
      return matchDate && matchType && matchSearch
    })
  }, [ledger, dateFilter, typeFilter, search])

  /* ── KPI totals ── */
  const totalIn  = filtered.reduce((s, t) => s + Number(t.txn_type === 'receipt' ? t.amount : 0), 0)
  const totalOut = filtered.reduce((s, t) => s + Number(t.txn_type === 'payment' ? t.out_amount : 0), 0)
  const netFlow  = totalIn - totalOut

  /* ── Accounts by payment method ── */
  const accountsByMethod = useMemo(() => {
    const map = {}
    filtered.forEach(txn => {
      const m = txn.method || 'bank_transfer'
      if (!map[m]) map[m] = { in: 0, out: 0, count: 0 }
      if (txn.txn_type === 'receipt') map[m].in  += Number(txn.amount || 0)
      else                            map[m].out += Number(txn.out_amount || 0)
      map[m].count++
    })
    return Object.entries(map)
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => (b.in + b.out) - (a.in + a.out))
  }, [filtered])

  /* ── Payment method pie data ── */
  const pieData = useMemo(() =>
    accountsByMethod.map(a => ({
      name: (METHOD_META[a.method] || METHOD_META.bank_transfer).label,
      value: Math.round(a.in + a.out),
      color: (METHOD_META[a.method] || METHOD_META.bank_transfer).color,
    }))
  , [accountsByMethod])

  /* ── Cash flow chart from API ── */
  const chartData = useMemo(() => {
    if (!cashFlow) return []
    const inflowMap  = {}
    const outflowMap = {}
    ;(cashFlow.inflows  || []).forEach(r => { inflowMap[r.month?.slice(0, 7)]  = Number(r.total || 0) })
    ;(cashFlow.outflows || []).forEach(r => { outflowMap[r.month?.slice(0, 7)] = Number(r.total || 0) })
    const months = [...new Set([...Object.keys(inflowMap), ...Object.keys(outflowMap)])].sort()
    return months.slice(-8).map(m => ({
      month: m,
      inflow:  inflowMap[m]  || 0,
      outflow: outflowMap[m] || 0,
      net: (inflowMap[m] || 0) - (outflowMap[m] || 0),
    }))
  }, [cashFlow])

  /* ── Running balance for ledger table ── */
  const withBalance = useMemo(() => {
    let balance = 0
    return [...filtered].reverse().map(txn => {
      balance += Number(txn.txn_type === 'receipt' ? txn.amount : -(txn.out_amount || 0))
      return { ...txn, running_balance: balance }
    }).reverse()
  }, [filtered])

  /* ── Reconciliation stats ── */
  const reconciled   = filtered.filter(t => t.reference && t.reference !== '—').length
  const unreconciled = filtered.length - reconciled
  const reconPct     = filtered.length ? Math.round((reconciled / filtered.length) * 100) : 0

  /* ── Export CSV ── */
  const handleExport = () => {
    const headers = ['Date', 'Type', 'Party', 'Reference', 'Method', 'Money In', 'Money Out', 'Balance']
    const rows = withBalance.map(t => [
      t.date?.split('T')[0], t.txn_type, t.party, t.reference,
      t.method || '—',
      t.txn_type === 'receipt' ? t.amount : 0,
      t.txn_type === 'payment' ? t.out_amount : 0,
      t.running_balance,
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'bank_transactions.csv'
    a.click()
  }

  if (isLoading) return <PageLoading />

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Banking</h1>
          <p>Track accounts, cash flow and reconcile transactions</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => window.location.reload()} style={{ gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleExport} style={{ gap: 6 }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── Date Filter Tabs ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {DATE_FILTERS.map(f => (
          <button key={f.id}
            className={`tab-btn${dateFilter === f.id ? ' active' : ''}`}
            onClick={() => setDateFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card green">
          <div className="kpi-icon"><TrendingUp size={20} /></div>
          <div className="kpi-label">Total Received</div>
          <div className="kpi-value">{fmt.currency(totalIn)}</div>
          <div className="kpi-sub">{filtered.filter(t => t.txn_type === 'receipt').length} receipts</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><TrendingDown size={20} /></div>
          <div className="kpi-label">Total Paid Out</div>
          <div className="kpi-value">{fmt.currency(totalOut)}</div>
          <div className="kpi-sub">{filtered.filter(t => t.txn_type === 'payment').length} payments</div>
        </div>
        <div className={`kpi-card ${netFlow >= 0 ? 'blue' : 'red'}`}>
          <div className="kpi-icon"><Wallet size={20} /></div>
          <div className="kpi-label">Net Cash Flow</div>
          <div className="kpi-value" style={{ color: netFlow >= 0 ? 'var(--c-primary)' : 'var(--c-red)' }}>
            {fmt.currency(netFlow)}
          </div>
          <div className="kpi-sub">{netFlow >= 0 ? '↑ Positive' : '↓ Negative'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><CheckCircle2 size={20} /></div>
          <div className="kpi-label">Reconciliation</div>
          <div className="kpi-value">{reconPct}%</div>
          <div className="kpi-sub">{reconciled} of {filtered.length} matched</div>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="pill-tabs" style={{ marginBottom: 20, display: 'inline-flex' }}>
        {[
          { id: 'overview',     label: 'Overview' },
          { id: 'accounts',     label: 'Accounts' },
          { id: 'transactions', label: 'Transactions' },
        ].map(t => (
          <button key={t.id}
            className={`pill-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {activeTab === 'overview' && (
        <div>
          {/* Charts Row */}
          <div className="responsive-grid cols-2-1" style={{ marginBottom: 24 }}>
            {/* Cash Flow Area Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Cash Flow Trend</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>Monthly inflow vs outflow</div>
                </div>
              </div>
              <div style={{ padding: '16px 20px 12px' }}>
                {chartData.length === 0 ? (
                  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
                    No cash flow data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#0a8754" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#0a8754" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#d63d3d" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#d63d3d" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="inflow"  name="Inflow"  stroke="#0a8754" fill="url(#inflowGrad)"  strokeWidth={2} />
                      <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#d63d3d" fill="url(#outflowGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Payment Channels</div>
              </div>
              <div style={{ padding: '8px 20px 16px' }}>
                {pieData.length === 0 ? (
                  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
                    No data
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65}
                          dataKey="value" paddingAngle={3}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [fmt.currency(v), n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      {pieData.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{d.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', fontFamily: 'monospace' }}>
                            {fmt.currency(d.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Net Flow Bar Chart */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Monthly Net Cash Position</div>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>Positive = surplus, Negative = deficit</div>
              </div>
            </div>
            <div style={{ padding: '16px 20px 12px' }}>
              {chartData.length === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text3)', fontSize: 13 }}>
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="net" name="Net Flow" radius={[4, 4, 0, 0]}
                      fill="#1a6be8"
                      label={false}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.net >= 0 ? '#0a8754' : '#d63d3d'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Reconciliation Status Panel */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Reconciliation Status</div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div style={{ textAlign: 'center', padding: '16px', background: '#e6f5ee', borderRadius: 10 }}>
                  <CheckCircle2 size={28} color="#0a8754" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0a8754' }}>{reconciled}</div>
                  <div style={{ fontSize: 12, color: '#0a8754', fontWeight: 600 }}>Reconciled</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: '#fef7e7', borderRadius: 10 }}>
                  <Clock size={28} color="#c97b10" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#c97b10' }}>{unreconciled}</div>
                  <div style={{ fontSize: 12, color: '#c97b10', fontWeight: 600 }}>Unmatched</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'var(--c-blue-lt)', borderRadius: 10 }}>
                  <AlertCircle size={28} color="var(--c-primary)" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-primary)' }}>{reconPct}%</div>
                  <div style={{ fontSize: 12, color: 'var(--c-primary)', fontWeight: 600 }}>Match Rate</div>
                </div>
              </div>
              {/* Progress Bar */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--c-text2)' }}>
                  <span>Reconciliation Progress</span>
                  <span style={{ fontWeight: 700 }}>{reconPct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--c-border)', borderRadius: 99 }}>
                  <div style={{
                    height: '100%', borderRadius: 99, transition: 'width .4s ease',
                    width: `${reconPct}%`,
                    background: reconPct >= 80 ? '#0a8754' : reconPct >= 50 ? '#c97b10' : '#d63d3d',
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ACCOUNTS TAB ══════════ */}
      {activeTab === 'accounts' && (
        <div>
          {accountsByMethod.length === 0 ? (
            <div className="empty-state">
              <Wallet className="empty-state-icon" />
              <h3>No account activity</h3>
              <p>Record payments and receipts to see your account breakdown here.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                {accountsByMethod.map(acc => {
                  const meta = METHOD_META[acc.method] || METHOD_META.bank_transfer
                  return (
                    <AccountCard
                      key={acc.method}
                      method={meta.label}
                      totalIn={acc.in}
                      totalOut={acc.out}
                      txnCount={acc.count}
                      color={meta.color}
                      Icon={meta.icon}
                    />
                  )
                })}
              </div>

              {/* Summary table */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Account Summary</div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Payment Channel</th>
                        <th style={{ textAlign: 'right' }}>Transactions</th>
                        <th style={{ textAlign: 'right' }}>Total Received</th>
                        <th style={{ textAlign: 'right' }}>Total Paid</th>
                        <th style={{ textAlign: 'right' }}>Net Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsByMethod.map(acc => {
                        const meta = METHOD_META[acc.method] || METHOD_META.bank_transfer
                        const net = acc.in - acc.out
                        return (
                          <tr key={acc.method}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                                <span style={{ fontWeight: 600 }}>{meta.label}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', color: 'var(--c-text2)' }}>{acc.count}</td>
                            <td style={{ textAlign: 'right', color: '#0a8754', fontWeight: 600, fontFamily: 'monospace' }}>
                              {fmt.currency(acc.in)}
                            </td>
                            <td style={{ textAlign: 'right', color: '#d63d3d', fontWeight: 600, fontFamily: 'monospace' }}>
                              {fmt.currency(acc.out)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: net >= 0 ? '#0a8754' : '#d63d3d' }}>
                              {fmt.currency(net)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--c-border)', background: 'var(--c-surface2)', fontWeight: 800 }}>
                        <td style={{ padding: '10px 14px' }}>Total</td>
                        <td style={{ textAlign: 'right', padding: '10px 14px' }}>{filtered.length}</td>
                        <td style={{ textAlign: 'right', padding: '10px 14px', color: '#0a8754', fontFamily: 'monospace' }}>{fmt.currency(totalIn)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 14px', color: '#d63d3d', fontFamily: 'monospace' }}>{fmt.currency(totalOut)}</td>
                        <td style={{ textAlign: 'right', padding: '10px 14px', color: netFlow >= 0 ? '#0a8754' : '#d63d3d', fontFamily: 'monospace' }}>{fmt.currency(netFlow)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ TRANSACTIONS TAB ══════════ */}
      {activeTab === 'transactions' && (
        <div className="card">
          {/* Filter bar */}
          <div className="filter-bar" style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
            <div className="search-wrap" style={{ width: 280 }}>
              <Search className="search-icon" size={15} />
              <input className="form-input" style={{ paddingLeft: 34 }}
                placeholder="Search party, reference, method…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="pill-tabs">
              {[
                { id: 'all',     label: 'ALL' },
                { id: 'receipt', label: 'RECEIVED' },
                { id: 'payment', label: 'PAID' },
              ].map(t => (
                <button key={t.id}
                  className={`pill-tab${typeFilter === t.id ? ' active' : ''}`}
                  onClick={() => setTypeFilter(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>
              {withBalance.length} transactions
            </div>
            <button className="btn btn-ghost" onClick={handleExport} style={{ gap: 6 }}>
              <Download size={14} /> Export CSV
            </button>
          </div>

          {withBalance.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--c-text3)' }}>
              <Wallet size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>No transactions found</div>
              <div style={{ fontSize: 13 }}>Try changing the date range or search filters.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Flow</th>
                    <th>Party</th>
                    <th>Reference</th>
                    <th>Method</th>
                    <th>Narration</th>
                    <th style={{ textAlign: 'right' }}>Money In</th>
                    <th style={{ textAlign: 'right' }}>Money Out</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {withBalance.map((txn, i) => {
                    const isIn = txn.txn_type === 'receipt'
                    const meta = METHOD_META[txn.method] || METHOD_META.bank_transfer
                    const hasRef = txn.reference && txn.reference !== '—'
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--c-text2)', whiteSpace: 'nowrap' }}>
                          {txn.date?.split('T')[0]}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {isIn
                              ? <ArrowDownLeft size={14} color="#0a8754" />
                              : <ArrowUpRight  size={14} color="#d63d3d" />}
                            <span style={{ fontSize: 11, fontWeight: 700, color: isIn ? '#0a8754' : '#d63d3d', textTransform: 'uppercase' }}>
                              {isIn ? 'In' : 'Out'}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{txn.party || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {hasRef
                              ? <CheckCircle2 size={12} color="#0a8754" />
                              : <Clock size={12} color="#c97b10" />}
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-text3)' }}>
                              {txn.reference || 'Pending'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                            background: meta.color + '18', color: meta.color,
                          }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--c-text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {txn.narration || '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#0a8754', fontWeight: isIn ? 700 : 400 }}>
                          {isIn ? fmt.currency(txn.amount) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#d63d3d', fontWeight: !isIn ? 700 : 400 }}>
                          {!isIn ? fmt.currency(txn.out_amount) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: txn.running_balance >= 0 ? 'var(--c-primary)' : '#d63d3d' }}>
                          {fmt.currency(txn.running_balance)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--c-border)', background: 'var(--c-surface2)', fontWeight: 800 }}>
                    <td colSpan={6} style={{ padding: '10px 14px', fontSize: 12 }}>
                      {withBalance.length} transactions
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 14px', fontFamily: 'monospace', color: '#0a8754', fontSize: 13 }}>
                      {fmt.currency(totalIn)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 14px', fontFamily: 'monospace', color: '#d63d3d', fontSize: 13 }}>
                      {fmt.currency(totalOut)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 14px', fontFamily: 'monospace', color: netFlow >= 0 ? 'var(--c-primary)' : '#d63d3d', fontSize: 14 }}>
                      {fmt.currency(netFlow)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
