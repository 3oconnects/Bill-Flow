import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tip } from './ReportsShared'
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react'

export default function CashFlowSection() {
  const { data, isLoading } = useQuery({ queryKey: ['cashflow'], queryFn: reportsApi.cashFlow })
  if (isLoading) return <PageLoading/>
  const d = data || { operating: [], investing: [], financing: [] }

  const processCategory = (catData) => {
    return (catData || []).reduce((acc, curr) => {
      const existing = acc.find(item => item.month === curr.month)
      if (existing) {
        if (curr.type === 'inflow') existing.inflow += Number(curr.amount)
        if (curr.type === 'outflow') existing.outflow += Number(curr.amount)
        existing.net = existing.inflow - existing.outflow
      } else {
        acc.push({
          month: curr.month,
          inflow: curr.type === 'inflow' ? Number(curr.amount) : 0,
          outflow: curr.type === 'outflow' ? Number(curr.amount) : 0,
          net: curr.type === 'inflow' ? Number(curr.amount) : -Number(curr.amount)
        })
      }
      return acc
    }, []).sort((a,b) => a.month.localeCompare(b.month))
  }

  const opFlow = processCategory(d.operating)
  const netOp = opFlow.reduce((sum, m) => sum + m.net, 0)
  
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Operating Inflows</div><div className="kpi-value">{fmt.currency(opFlow.reduce((s,m)=>s+m.inflow,0))}</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Operating Outflows</div><div className="kpi-value">{fmt.currency(opFlow.reduce((s,m)=>s+m.outflow,0))}</div></div>
        <div className={`kpi-card ${netOp>=0?'blue':'red'}`}><div className="kpi-icon"><Activity size={20}/></div><div className="kpi-label">Net Operating Cash Flow</div><div className="kpi-value">{fmt.currency(netOp)}</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><DollarSign size={20}/></div><div className="kpi-label">Cash Position</div><div className="kpi-value">{fmt.currency(netOp)}</div><div className="kpi-sub">Estimated</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '20px 20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Operating Cash Flow Trend</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={opFlow} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={8}/>
            <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)', opacity: 0.5 }}/>
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, marginTop: 16 }} iconType="square"/>
            <Bar dataKey="inflow" name="Cash Inflow" fill="#10b981" radius={[4,4,0,0]} barSize={24}/>
            <Bar dataKey="outflow" name="Cash Outflow" fill="#ef4444" radius={[4,4,0,0]} barSize={24}/>
            <Bar dataKey="net" name="Net Cash Flow" fill="#3b82f6" radius={[4,4,0,0]} barSize={24}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>Cash Flow Statement Detail (Operating)</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Cash Inflow</th><th style={{ textAlign: 'right' }}>Cash Outflow</th><th style={{ textAlign: 'right' }}>Net Cash Flow</th></tr></thead>
          <tbody>
            {opFlow.map((r,i) => (
              <tr key={r.month} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                <td style={{ fontWeight: 600 }}>{r.month}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--c-green)' }}>{fmt.currency(r.inflow)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--c-red)' }}>{fmt.currency(r.outflow)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: r.net>=0?'var(--c-primary)':'var(--c-red)' }}>{fmt.currency(r.net)}</td>
              </tr>
            ))}
            {opFlow.length===0 && <tr><td colSpan={4} style={{ textAlign:'center', padding:48, color:'var(--c-text3)' }}>No cash flow data available</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
