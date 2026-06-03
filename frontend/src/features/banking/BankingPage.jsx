import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { useTopbarStore } from '@/store/topbarStore'
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Download, CheckCircle2 } from 'lucide-react'

import { DATE_FILTERS, getRange, METHOD_META } from './BankingShared'
import OverviewTab from './OverviewTab'
import AccountsTab from './AccountsTab'
import TransactionsTab from './TransactionsTab'

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
    queryKey: ['cash-ledger'], queryFn: reportsApi.cashLedger,
  })

  const { data: cashFlow, isLoading: flowLoading } = useQuery({
    queryKey: ['cash-flow'], queryFn: reportsApi.cashFlow,
  })

  const isLoading = ledgerLoading || flowLoading

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

  const totalIn  = filtered.reduce((s, t) => s + Number(t.txn_type === 'receipt' ? t.amount : 0), 0)
  const totalOut = filtered.reduce((s, t) => s + Number(t.txn_type === 'payment' ? t.out_amount : 0), 0)
  const netFlow  = totalIn - totalOut

  const accountsByMethod = useMemo(() => {
    const map = {}
    filtered.forEach(txn => {
      const m = txn.method || 'bank_transfer'
      if (!map[m]) map[m] = { in: 0, out: 0, count: 0 }
      if (txn.txn_type === 'receipt') map[m].in  += Number(txn.amount || 0)
      else                            map[m].out += Number(txn.out_amount || 0)
      map[m].count++
    })
    return Object.entries(map).map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => (b.in + b.out) - (a.in + a.out))
  }, [filtered])

  const pieData = useMemo(() =>
    accountsByMethod.map(a => ({
      name: (METHOD_META[a.method] || METHOD_META.bank_transfer).label,
      value: Math.round(a.in + a.out),
      color: (METHOD_META[a.method] || METHOD_META.bank_transfer).color,
    }))
  , [accountsByMethod])

  const chartData = useMemo(() => {
    if (!cashFlow) return []
    const inflowMap  = {}; const outflowMap = {}
    ;(cashFlow.inflows  || []).forEach(r => { inflowMap[r.month?.slice(0, 7)]  = Number(r.total || 0) })
    ;(cashFlow.outflows || []).forEach(r => { outflowMap[r.month?.slice(0, 7)] = Number(r.total || 0) })
    const months = [...new Set([...Object.keys(inflowMap), ...Object.keys(outflowMap)])].sort()
    return months.slice(-8).map(m => ({
      month: m, inflow: inflowMap[m] || 0, outflow: outflowMap[m] || 0,
      net: (inflowMap[m] || 0) - (outflowMap[m] || 0),
    }))
  }, [cashFlow])

  const withBalance = useMemo(() => {
    let balance = 0
    return [...filtered].reverse().map(txn => {
      balance += Number(txn.txn_type === 'receipt' ? txn.amount : -(txn.out_amount || 0))
      return { ...txn, running_balance: balance }
    }).reverse()
  }, [filtered])

  const reconciled   = filtered.filter(t => t.reference && t.reference !== '—').length
  const unreconciled = filtered.length - reconciled
  const reconPct     = filtered.length ? Math.round((reconciled / filtered.length) * 100) : 0

  const handleExport = () => {
    const headers = ['Date', 'Type', 'Party', 'Reference', 'Method', 'Money In', 'Money Out', 'Balance']
    const rows = withBalance.map(t => [
      t.date?.split('T')[0], t.txn_type, t.party, t.reference, t.method || '—',
      t.txn_type === 'receipt' ? t.amount : 0, t.txn_type === 'payment' ? t.out_amount : 0,
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

      <div className="tabs" style={{ marginBottom: 20 }}>
        {DATE_FILTERS.map(f => (
          <button key={f.id} className={`tab-btn${dateFilter === f.id ? ' active' : ''}`} onClick={() => setDateFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20} /></div><div className="kpi-label">Total Received</div><div className="kpi-value">{fmt.currency(totalIn)}</div><div className="kpi-sub">{filtered.filter(t => t.txn_type === 'receipt').length} receipts</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20} /></div><div className="kpi-label">Total Paid Out</div><div className="kpi-value">{fmt.currency(totalOut)}</div><div className="kpi-sub">{filtered.filter(t => t.txn_type === 'payment').length} payments</div></div>
        <div className={`kpi-card ${netFlow >= 0 ? 'blue' : 'red'}`}><div className="kpi-icon"><Wallet size={20} /></div><div className="kpi-label">Net Cash Flow</div><div className="kpi-value" style={{ color: netFlow >= 0 ? 'var(--c-primary)' : 'var(--c-red)' }}>{fmt.currency(netFlow)}</div><div className="kpi-sub">{netFlow >= 0 ? '↑ Positive' : '↓ Negative'}</div></div>
        <div className="kpi-card purple"><div className="kpi-icon"><CheckCircle2 size={20} /></div><div className="kpi-label">Reconciliation</div><div className="kpi-value">{reconPct}%</div><div className="kpi-sub">{reconciled} of {filtered.length} matched</div></div>
      </div>

      <div className="pill-tabs" style={{ marginBottom: 20, display: 'inline-flex' }}>
        {[{ id: 'overview', label: 'Overview' }, { id: 'accounts', label: 'Accounts' }, { id: 'transactions', label: 'Transactions' }].map(t => (
          <button key={t.id} className={`pill-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab chartData={chartData} pieData={pieData} reconciled={reconciled} unreconciled={unreconciled} reconPct={reconPct} />}
      {activeTab === 'accounts' && <AccountsTab accountsByMethod={accountsByMethod} filtered={filtered} totalIn={totalIn} totalOut={totalOut} netFlow={netFlow} />}
      {activeTab === 'transactions' && <TransactionsTab search={search} setSearch={setSearch} typeFilter={typeFilter} setTypeFilter={setTypeFilter} withBalance={withBalance} handleExport={handleExport} totalIn={totalIn} totalOut={totalOut} netFlow={netFlow} />}
    </div>
  )
}
