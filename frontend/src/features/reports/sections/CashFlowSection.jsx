import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from 'recharts'
import { Tip } from './shared'

export default function CashFlowSection() {
  const { data, isLoading } = useQuery({ queryKey: ['cash-flow'], queryFn: reportsApi.cashFlow })
  if (isLoading) return <PageLoading/>
  const d = data || { inflows: [], outflows: [] }
  const months = [...new Set([...d.inflows.map(r=>r.month), ...d.outflows.map(r=>r.month)])].sort()
  const rows = months.map(m => {
    const inflow  = d.inflows.filter(r=>r.month===m).reduce((s,r)=>s+Number(r.total||0),0)
    const outflow = d.outflows.filter(r=>r.month===m).reduce((s,r)=>s+Number(r.total||0),0)
    return { month:m, inflow, outflow, net: inflow-outflow }
  })
  const totIn=rows.reduce((s,r)=>s+r.inflow,0), totOut=rows.reduce((s,r)=>s+r.outflow,0), totNet=totIn-totOut

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Total Inflows</div><div className="kpi-value">{fmt.currency(totIn)}</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Outflows</div><div className="kpi-value">{fmt.currency(totOut)}</div></div>
        <div className={`kpi-card ${totNet>=0?'blue':'red'}`}><div className="kpi-icon"><DollarSign size={20}/></div><div className="kpi-label">Net Cash Flow</div><div className="kpi-value">{fmt.currency(totNet)}</div></div>
      </div>
      <div className="card" style={{ marginBottom:16, padding:'20px 20px 24px' }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:20 }}>Monthly Cash Flow</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize:11, fill:'var(--c-text3)' }} axisLine={false} tickLine={false} dy={8}/>
            <YAxis tick={{ fontSize:11, fill:'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>} cursor={{ fill:'var(--c-surface2)', opacity:0.5 }}/>
            <Legend wrapperStyle={{ fontSize:12, fontWeight:600, marginTop:16 }} iconType="square"/>
            <Bar dataKey="inflow"  name="Cash In"  fill="#10b981" radius={[4,4,0,0]} barSize={22}/>
            <Bar dataKey="outflow" name="Cash Out" fill="#ef4444" radius={[4,4,0,0]} barSize={22}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)', fontWeight:700, fontSize:14 }}>Monthly Cash Flow Statement</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Month</th><th style={{textAlign:'right'}}>Cash In</th><th style={{textAlign:'right'}}>Cash Out</th><th style={{textAlign:'right'}}>Net</th><th style={{textAlign:'center'}}>Status</th></tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.month} style={{ background:i%2===0?'transparent':'var(--c-surface2)' }}>
                <td style={{fontWeight:600}}>{r.month}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--c-green)',fontWeight:700}}>{fmt.currency(r.inflow)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--c-red)'}}>{fmt.currency(r.outflow)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,color:r.net>=0?'var(--c-primary)':'var(--c-red)'}}>{fmt.currency(r.net)}</td>
                <td style={{textAlign:'center'}}><span style={{padding:'2px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:r.net>=0?'var(--c-green-lt)':'var(--c-red-lt)',color:r.net>=0?'var(--c-green)':'var(--c-red)'}}>{r.net>=0?'Positive':'Negative'}</span></td>
              </tr>
            ))}
            {!rows.length&&<tr><td colSpan={5} style={{textAlign:'center',padding:48,color:'var(--c-text3)'}}>No cash flow data yet</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
