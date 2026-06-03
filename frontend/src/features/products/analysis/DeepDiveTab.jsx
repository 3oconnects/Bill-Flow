import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Filter, TrendingUp, ShoppingBag, DollarSign, BarChart2 } from 'lucide-react'
import { C, inr, num, pct, monthKey, monthLabel } from './analyticsEngine'
import { StatCard, ChartTooltip } from './AnalysisShared'

export default function DeepDiveTab({ salesHistory, product: p }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [customer, setCustomer] = useState('')
  const [status,   setStatus]   = useState('')

  const allCustomers = useMemo(() => {
    const set = new Set(salesHistory.map(r => r.customer_name).filter(Boolean))
    return Array.from(set).sort()
  }, [salesHistory])

  const filtered = useMemo(() => {
    return salesHistory.filter(r => {
      if (dateFrom && r.invoice_date < dateFrom) return false
      if (dateTo   && r.invoice_date > dateTo)   return false
      if (customer && r.customer_name !== customer) return false
      if (status   && (r.invoice_status || '').toLowerCase() !== status) return false
      return true
    })
  }, [salesHistory, dateFrom, dateTo, customer, status])

  const stats = useMemo(() => {
    const revenue  = filtered.reduce((s, r) => s + num(r.amount), 0)
    const units    = filtered.reduce((s, r) => s + num(r.quantity), 0)
    const profit   = filtered.reduce((s, r) => s + (num(r.amount) - num(r.quantity) * num(p.purchase_price)), 0)
    const invoices = new Set(filtered.map(r => r.invoice_id)).size
    return { revenue, units, profit, invoices }
  }, [filtered, p.purchase_price])

  const chartData = useMemo(() => {
    const bm = {}
    filtered.forEach(r => {
      const d = new Date(r.invoice_date)
      const key = monthKey(d)
      if (!bm[key]) bm[key] = { label: monthLabel(d), revenue: 0, units: 0 }
      bm[key].revenue += num(r.amount)
      bm[key].units   += num(r.quantity)
    })
    return Object.entries(bm).sort(([a], [b]) => a.localeCompare(b)).map(([,v]) => v)
  }, [filtered])

  const statusOptions = ['paid','unpaid','partial','cancelled']
  const statusColor = { paid: C.emerald, unpaid: C.amber, partial: C.sky, cancelled: C.rose }

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setCustomer(''); setStatus('') }
  const hasFilters = dateFrom || dateTo || customer || status

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter bar */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Filter size={14} color={C.indigo} />
          <span style={{ fontWeight: 700, fontSize: 13 }}>Filters</span>
          {hasFilters && (
            <button onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: 11, color: C.rose, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              × Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Customer</label>
            <select value={customer} onChange={e => setCustomer(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }}>
              <option value="">All customers</option>
              {allCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Invoice Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }}>
              <option value="">All statuses</option>
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
          Showing <strong>{filtered.length}</strong> of {salesHistory.length} records
          {hasFilters && ' (filtered)'}
        </div>
      </div>

      {/* Filtered KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard icon={TrendingUp}  label="Filtered Revenue" value={inr(stats.revenue)}                                     sub={`${stats.invoices} invoices`}               color={C.indigo}  bg="#eef2ff" />
        <StatCard icon={ShoppingBag} label="Units Sold"       value={`${stats.units.toLocaleString()} ${p.unit}`}            sub="in selected period"                         color={C.sky}     bg="#e0f2fe" />
        <StatCard icon={DollarSign}  label="Gross Profit"     value={inr(stats.profit)}                                      sub={`${stats.revenue > 0 ? pct(stats.profit, stats.revenue) : 0}% margin`} color={stats.profit >= 0 ? C.emerald : C.rose} bg={stats.profit >= 0 ? '#ecfdf5' : '#fef2f2'} />
        <StatCard icon={BarChart2}   label="Avg per Invoice"  value={stats.invoices > 0 ? inr(stats.revenue / stats.invoices) : '₹0'} sub="average order value"            color={C.amber}   bg="#fffbeb" />
      </div>

      {/* Filtered trend chart */}
      {chartData.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Revenue Trend — Filtered Period</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<ChartTooltip formatter={v => inr(v)} />} />
              <Bar dataKey="revenue" name="Revenue" fill={C.indigo} radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtered table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Transaction Detail</div>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{filtered.length} rows</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: '#94a3b8', fontSize: 13 }}>No records match the selected filters</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Date','Invoice','Customer','Qty','Unit Price','Amount','Status'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const st = (r.invoice_status || 'unpaid').toLowerCase()
                  const sc = statusColor[st] || C.slate
                  return (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: C.indigo }}>{r.invoice_number || '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500 }}>{r.customer_name || '—'}</td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12 }}>{num(r.quantity).toLocaleString()}</td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12 }}>{inr(r.unit_price)}</td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{inr(r.amount)}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc + '18', color: sc, textTransform: 'capitalize' }}>{st}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                  <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 12 }}>Total ({filtered.length} rows)</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{stats.units.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px' }} />
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: C.indigo }}>{inr(stats.revenue)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
