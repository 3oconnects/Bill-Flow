import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Tip, COLORS } from './ReportsShared'
import { TrendingDown, CreditCard, Tag, AlertTriangle } from 'lucide-react'

export default function ExpenseAnalyticsSection() {
  const { data, isLoading } = useQuery({ queryKey: ['reports-summary'], queryFn: reportsApi.summary })
  if (isLoading) return <PageLoading/>
  const expData = data?.expenseByCategory || []
  
  const totalExp = expData.reduce((s,r) => s + Number(r.total), 0)
  const topCat = expData[0] || { category: 'None', total: 0 }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Expenses</div><div className="kpi-value">{fmt.currency(totalExp)}</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><Tag size={20}/></div><div className="kpi-label">Top Category</div><div className="kpi-value">{topCat.category}</div><div className="kpi-sub">{fmt.currency(topCat.total)}</div></div>
        <div className="kpi-card purple"><div className="kpi-icon"><CreditCard size={20}/></div><div className="kpi-label">Categories</div><div className="kpi-value">{expData.length}</div></div>
        <div className="kpi-card blue"><div className="kpi-icon"><AlertTriangle size={20}/></div><div className="kpi-label">Uncategorized</div><div className="kpi-value">{fmt.currency(expData.find(e=>e.category==='Uncategorized')?.total || 0)}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Expense Distribution</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={expData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="total" nameKey="category" paddingAngle={2}>
                {expData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} stroke="none"/>)}
              </Pie>
              <Tooltip content={<Tip/>}/>
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} iconType="circle"/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Top Expense Categories</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expData.slice(0,10)} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false}/>
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} width={110} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)' }}/>
              <Bar dataKey="total" name="Expense" fill="#ef4444" radius={[0,4,4,0]} barSize={20}>
                {expData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>Expense Breakdown</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>Total Amount</th><th style={{ textAlign: 'center' }}>% of Total</th></tr></thead>
          <tbody>
            {expData.map((r,i) => (
              <tr key={r.category} style={{ background: i%2===0?'transparent':'var(--c-surface2)' }}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: COLORS[i%COLORS.length] }}></div>
                    {r.category}
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--c-text)' }}>{fmt.currency(r.total)}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--c-border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(Number(r.total)/totalExp*100)}%`, height: '100%', background: COLORS[i%COLORS.length] }}></div>
                    </div>
                    <span style={{ width: 40, textAlign: 'right' }}>{((Number(r.total)/totalExp)*100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {expData.length===0 && <tr><td colSpan={3} style={{ textAlign:'center', padding:48, color:'var(--c-text3)' }}>No expense data available</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
