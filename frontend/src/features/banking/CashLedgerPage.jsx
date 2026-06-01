import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { useTopbarStore } from '@/store/topbarStore'
import { TrendingUp, TrendingDown, DollarSign, Search, Download, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

const DATE_FILTERS = [
  { id: 'all',   label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: 'qtr',   label: 'This Quarter' },
  { id: 'year',  label: 'This Year' },
]

function getRange(filter) {
  const now = new Date()
  if (filter === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), now]
  if (filter === 'qtr')   return [new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1), now]
  if (filter === 'year')  return [new Date(now.getFullYear(), 0, 1), now]
  return [null, null]
}

const METHOD_COLORS = {
  upi: '#6366f1', neft: '#0ea5e9', rtgs: '#0284c7', cash: '#10b981',
  cheque: '#f59e0b', card: '#ec4899', bank_transfer: '#8b5cf6',
}

export default function CashLedgerPage() {
  const { setContext, setActions, clear } = useTopbarStore()
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('month')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    setContext('Finance', 'Cash & Bank Ledger')
    setActions(null)
    return clear
  }, [setActions, setContext, clear])

  const { data = [], isLoading } = useQuery({
    queryKey: ['cash-ledger'],
    queryFn:  reportsApi.cashLedger,
  })

  const filtered = useMemo(() => {
    const [from, to] = getRange(filter)
    return data.filter(txn => {
      const d = new Date(txn.date)
      const matchDate   = (!from || d >= from) && (!to || d <= to)
      const matchType   = typeFilter === 'all' || txn.txn_type === typeFilter
      const q = search.toLowerCase()
      const matchSearch = !q || txn.reference?.toLowerCase().includes(q) ||
        txn.party?.toLowerCase().includes(q) || txn.narration?.toLowerCase().includes(q)
      return matchDate && matchType && matchSearch
    })
  }, [data, filter, typeFilter, search])

  // Running balance — receipts are in, payments are out
  const withBalance = useMemo(() => {
    let balance = 0
    return [...filtered].reverse().map(txn => {
      balance += Number(txn.txn_type === 'receipt' ? txn.amount : -txn.out_amount)
      return { ...txn, running_balance: balance }
    }).reverse()
  }, [filtered])

  const totalIn  = filtered.reduce((s,t) => s + Number(t.txn_type==='receipt' ? t.amount : 0), 0)
  const totalOut = filtered.reduce((s,t) => s + Number(t.txn_type==='payment' ? t.out_amount : 0), 0)
  const netFlow  = totalIn - totalOut

  const handleExport = () => {
    const headers = ['Date','Type','Party','Reference','Narration','Method','Money In','Money Out','Balance']
    const rows = withBalance.map(t => [
      t.date?.split('T')[0], t.txn_type, t.party, t.reference, t.narration,
      t.method||'—', t.txn_type==='receipt'?t.amount:0, t.txn_type==='payment'?t.out_amount:0, t.running_balance
    ].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'cash_ledger.csv'
    a.click()
  }

  if (isLoading) return <PageLoading/>

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <div className="kpi-card green">
          <div className="kpi-icon"><TrendingUp size={20}/></div>
          <div className="kpi-label">Total Received</div>
          <div className="kpi-value">{fmt.currency(totalIn)}</div>
          <div className="kpi-sub">{filtered.filter(t=>t.txn_type==='receipt').length} receipts</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon"><TrendingDown size={20}/></div>
          <div className="kpi-label">Total Paid Out</div>
          <div className="kpi-value">{fmt.currency(totalOut)}</div>
          <div className="kpi-sub">{filtered.filter(t=>t.txn_type==='payment').length} payments</div>
        </div>
        <div className={`kpi-card ${netFlow>=0?'blue':'red'}`}>
          <div className="kpi-icon"><DollarSign size={20}/></div>
          <div className="kpi-label">Net Cash Flow</div>
          <div className="kpi-value">{fmt.currency(netFlow)}</div>
          <div className="kpi-sub">{netFlow>=0?'Positive':'Negative'} flow</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><DollarSign size={20}/></div>
          <div className="kpi-label">Transactions</div>
          <div className="kpi-value">{filtered.length}</div>
          <div className="kpi-sub">In selected period</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {DATE_FILTERS.map(f => (
          <button key={f.id} className={'tab-btn'+(filter===f.id?' active':'')} onClick={()=>setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="filter-bar" style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)' }}>
          <div className="search-wrap" style={{ width: 280 }}>
            <Search className="search-icon" size={15}/>
            <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search party, reference…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="pill-tabs">
            {[{id:'all',label:'ALL'},{id:'receipt',label:'RECEIPTS'},{id:'payment',label:'PAYMENTS'}].map(t=>(
              <button key={t.id} className={'pill-tab'+(typeFilter===t.id?' active':'')} onClick={()=>setTypeFilter(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="spacer"/>
          <button className="btn btn-ghost" onClick={handleExport} style={{ gap: 6 }}>
            <Download size={14}/> Export
          </button>
        </div>

        {withBalance.length === 0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center', color:'var(--c-text3)' }}>
            <DollarSign size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.3 }}/>
            <div style={{ fontWeight:600, marginBottom:4 }}>No transactions found</div>
            <div style={{ fontSize:13 }}>Record payments and expenses to see your ledger.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>Reference</th>
                  <th>Narration</th>
                  <th>Method</th>
                  <th style={{textAlign:'right'}}>Money In</th>
                  <th style={{textAlign:'right'}}>Money Out</th>
                  <th style={{textAlign:'right'}}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {withBalance.map((txn, i) => {
                  const isIn = txn.txn_type === 'receipt'
                  const methodColor = METHOD_COLORS[txn.method] || '#6366f1'
                  return (
                    <tr key={i} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                      <td style={{ fontSize:12, fontFamily:'monospace', color:'var(--c-text2)', whiteSpace:'nowrap' }}>
                        {txn.date?.split('T')[0]}
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {isIn
                            ? <ArrowDownLeft size={14} color="#10b981"/>
                            : <ArrowUpRight  size={14} color="#ef4444"/>}
                          <span style={{ fontSize:11, fontWeight:700, color: isIn?'#10b981':'#ef4444', textTransform:'uppercase' }}>
                            {isIn ? 'In' : 'Out'}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight:600 }}>{txn.party || '—'}</td>
                      <td style={{ fontFamily:'monospace', fontSize:11, color:'var(--c-text3)' }}>{txn.reference || '—'}</td>
                      <td style={{ fontSize:12, color:'var(--c-text2)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {txn.narration || '—'}
                      </td>
                      <td>
                        {txn.method ? (
                          <span style={{ padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, textTransform:'uppercase', background:methodColor+'18', color:methodColor }}>
                            {txn.method.replace(/_/g,' ')}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign:'right', fontFamily:'monospace', color:'#10b981', fontWeight: isIn?700:400 }}>
                        {isIn ? fmt.currency(txn.amount) : '—'}
                      </td>
                      <td style={{ textAlign:'right', fontFamily:'monospace', color:'#ef4444', fontWeight: !isIn?700:400 }}>
                        {!isIn ? fmt.currency(txn.out_amount) : '—'}
                      </td>
                      <td style={{ textAlign:'right', fontFamily:'monospace', fontWeight:700, color: txn.running_balance>=0?'var(--c-primary)':'var(--c-red)' }}>
                        {fmt.currency(txn.running_balance)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid var(--c-border)', background:'var(--c-surface2)', fontWeight:800 }}>
                  <td colSpan={6} style={{ padding:'10px 14px', fontSize:12 }}>{filtered.length} transactions</td>
                  <td style={{ textAlign:'right', padding:'10px 14px', fontFamily:'monospace', color:'#10b981', fontSize:13 }}>{fmt.currency(totalIn)}</td>
                  <td style={{ textAlign:'right', padding:'10px 14px', fontFamily:'monospace', color:'#ef4444', fontSize:13 }}>{fmt.currency(totalOut)}</td>
                  <td style={{ textAlign:'right', padding:'10px 14px', fontFamily:'monospace', color: netFlow>=0?'var(--c-primary)':'var(--c-red)', fontSize:14 }}>{fmt.currency(netFlow)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
