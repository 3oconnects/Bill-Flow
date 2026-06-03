import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Tip } from './shared'

export default function ExpenseAnalyticsSection() {
  const { data, isLoading } = useQuery({ queryKey: ['expense-analytics'], queryFn: reportsApi.expenseAnalytics })
  if (isLoading) return <PageLoading/>
  const d = data || { topVendors: [], trend: [], byCategory: [] }
  const trendData = d.trend.map(r => ({ month: r.month, total: Number(r.total||0) })).reverse()
  const catData = Object.entries(
    d.byCategory.reduce((acc,r) => { acc[r.category]=(acc[r.category]||0)+Number(r.total||0); return acc }, {})
  ).map(([category,total]) => ({ category, total })).sort((a,b) => b.total-a.total)

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div className="card" style={{ padding:'20px 20px 24px' }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:20 }}>Expense Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs><linearGradient id="gradExpA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:10, fill:'var(--c-text3)' }} axisLine={false} tickLine={false} dy={6}/>
              <YAxis tick={{ fontSize:10, fill:'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="total" name="Expenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradExpA)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding:'20px 20px 24px' }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>Expense by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData.slice(0,8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false}/>
              <XAxis type="number" tick={{ fontSize:10, fill:'var(--c-text3)' }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="category" tick={{ fontSize:10, fill:'var(--c-text3)' }} width={90} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>} cursor={{ fill:'var(--c-surface2)' }}/>
              <Bar dataKey="total" name="Amount" fill="#6366f1" radius={[0,6,6,0]} barSize={16}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--c-border)', fontWeight:700, fontSize:14 }}>Top Vendors by Spend</div>
        <div className="table-wrap"><table>
          <thead><tr><th style={{width:40,textAlign:'center'}}>#</th><th>Vendor</th><th style={{textAlign:'right'}}>Total Spend</th><th style={{textAlign:'center'}}>Transactions</th><th>Bar</th></tr></thead>
          <tbody>
            {d.topVendors.map((v,i) => {
              const pct = d.topVendors[0]?.total>0 ? (Number(v.total)/Number(d.topVendors[0].total)*100).toFixed(0) : 0
              return (
                <tr key={i} style={{background:i%2===0?'transparent':'var(--c-surface2)'}}>
                  <td style={{textAlign:'center',fontWeight:700,color:'var(--c-text3)'}}>#{i+1}</td>
                  <td style={{fontWeight:600}}>{v.vendor_name}</td>
                  <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700,color:'var(--c-red)'}}>{fmt.currency(v.total)}</td>
                  <td style={{textAlign:'center',color:'var(--c-text2)'}}>{v.count}</td>
                  <td style={{width:160}}><div style={{background:'var(--c-border)',borderRadius:4,height:8}}><div style={{width:`${pct}%`,height:'100%',background:'var(--c-primary)',borderRadius:4}}/></div></td>
                </tr>
              )
            })}
            {!d.topVendors.length&&<tr><td colSpan={5} style={{textAlign:'center',padding:48,color:'var(--c-text3)'}}>No vendor data yet</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
