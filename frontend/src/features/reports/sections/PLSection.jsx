import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { TrendingUp, TrendingDown, BarChart2, ShieldCheck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tip } from './shared'

export default function PLSection() {
  const { data, isLoading } = useQuery({ queryKey: ['pl-statement'], queryFn: reportsApi.plStatement })
  if (isLoading) return <PageLoading/>
  const d = data || { revenue: [], expenses: [] }
  const months = [...new Set([...d.revenue.map(r=>r.month), ...d.expenses.map(e=>e.month)])].sort()
  const rows = months.map(m => {
    const rev  = d.revenue.find(r=>r.month===m)
    const exps = d.expenses.filter(e=>e.month===m)
    const totalRev = Number(rev?.revenue||0)
    const totalExp = exps.reduce((s,e)=>s+Number(e.total||0),0)
    return { month:m, revenue:totalRev, expenses:totalExp, profit:totalRev-totalExp, gstCollected:Number(rev?.gst_collected||0) }
  })
  const totRev=rows.reduce((s,r)=>s+r.revenue,0), totExp=rows.reduce((s,r)=>s+r.expenses,0)
  const totGST=rows.reduce((s,r)=>s+r.gstCollected,0), totProfit=totRev-totExp

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Gross Revenue</div><div className="kpi-value">{fmt.currency(totRev)}</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Expenses</div><div className="kpi-value">{fmt.currency(totExp)}</div></div>
        <div className={`kpi-card ${totProfit>=0?'blue':'red'}`}><div className="kpi-icon"><BarChart2 size={20}/></div><div className="kpi-label">Net Profit / Loss</div><div className="kpi-value">{fmt.currency(totProfit)}</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><ShieldCheck size={20}/></div><div className="kpi-label">GST Collected</div><div className="kpi-value">{fmt.currency(totGST)}</div></div>
      </div>
      <div className="card" style={{ marginBottom:16, padding:'20px 20px 24px' }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:20 }}>Monthly Profit / Loss</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize:11, fill:'var(--c-text3)' }} axisLine={false} tickLine={false} dy={8}/>
            <YAxis tick={{ fontSize:11, fill:'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>} cursor={{ fill:'var(--c-surface2)', opacity:0.5 }}/>
            <Legend wrapperStyle={{ fontSize:12, fontWeight:600, marginTop:16 }} iconType="square"/>
            <Bar dataKey="revenue"  name="Revenue"  fill="#10b981" radius={[4,4,0,0]} barSize={20}/>
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} barSize={20}/>
            <Bar dataKey="profit"   name="Net Profit" fill="#6366f1" radius={[4,4,0,0]} barSize={20}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--c-border)', fontWeight:700, fontSize:14 }}>Monthly P&L Statement</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Month</th><th style={{textAlign:'right'}}>Revenue</th><th style={{textAlign:'right'}}>Expenses</th><th style={{textAlign:'right'}}>GST</th><th style={{textAlign:'right'}}>Net Profit</th><th style={{textAlign:'center'}}>Margin</th></tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.month} style={{ background:i%2===0?'transparent':'var(--c-surface2)' }}>
                <td style={{fontWeight:600}}>{r.month}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--c-green)',fontWeight:700}}>{fmt.currency(r.revenue)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--c-red)'}}>{fmt.currency(r.expenses)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--c-text2)'}}>{fmt.currency(r.gstCollected)}</td>
                <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,color:r.profit>=0?'var(--c-primary)':'var(--c-red)'}}>{fmt.currency(r.profit)}</td>
                <td style={{textAlign:'center'}}><span style={{padding:'2px 10px',borderRadius:999,fontSize:11,fontWeight:700,background:r.profit>=0?'var(--c-green-lt)':'var(--c-red-lt)',color:r.profit>=0?'var(--c-green)':'var(--c-red)'}}>{r.revenue>0?((r.profit/r.revenue)*100).toFixed(1):0}%</span></td>
              </tr>
            ))}
            {!rows.length&&<tr><td colSpan={6} style={{textAlign:'center',padding:48,color:'var(--c-text3)'}}>No revenue data yet</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
