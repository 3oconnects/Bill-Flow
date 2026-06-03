import {
  TrendingUp, TrendingDown, BarChart2, Clock,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import { fmt } from '@/lib/utils'
import { COLORS, Tip } from './ReportsShared'

export default function OverviewSection({ s }) {
  const totalRev = Number(s.totalRevenue || 0)
  const totalExp = Number(s.totalExpenses || 0)
  const netProfit = totalRev - totalExp
  const outstanding = Number(s.outstanding || 0)

  const chartData = (s.monthlyRevenue || []).map(r => {
    const exp = (s.monthlyExpenses || []).find(e => e.month === r.month)
    return { month: r.month?.slice(0,7), revenue: Number(r.total||0), expenses: Number(exp?.total||0), profit: Number(r.total||0) - Number(exp?.total||0) }
  }).reverse()

  const pieData = (s.invoicesByStatus || []).map(r => ({ name: r.status, value: Number(r.count||0) }))

  return (
    <div>
      {/* KPI cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        <div className="kpi-card green"><div className="kpi-icon"><TrendingUp size={20}/></div><div className="kpi-label">Total Revenue</div><div className="kpi-value">{fmt.currency(totalRev)}</div><div className="kpi-sub">{s.invoiceCount} invoices</div></div>
        <div className="kpi-card red"><div className="kpi-icon"><TrendingDown size={20}/></div><div className="kpi-label">Total Expenses</div><div className="kpi-value">{fmt.currency(totalExp)}</div><div className="kpi-sub">All time</div></div>
        <div className={`kpi-card ${netProfit>=0?'blue':'red'}`}><div className="kpi-icon"><BarChart2 size={20}/></div><div className="kpi-label">Net Profit</div><div className="kpi-value">{fmt.currency(netProfit)}</div><div className="kpi-sub">{totalRev > 0 ? ((netProfit/totalRev)*100).toFixed(1) : 0}% margin</div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><Clock size={20}/></div><div className="kpi-label">Outstanding</div><div className="kpi-value">{fmt.currency(outstanding)}</div><div className="kpi-sub">Uncollected</div></div>
      </div>

      {/* Revenue vs Expenses area chart */}
      <div className="card" style={{ marginBottom: 16, padding: '20px 20px 24px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Monthly Revenue vs Expenses</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.12}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false}/>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={8}/>
            <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>} cursor={{ stroke: 'var(--c-border)', strokeDasharray: '4 4' }}/>
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, marginTop: 16 }} iconType="circle"/>
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gradRev)"/>
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradExp)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Invoice status */}
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Invoice Status Breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={4}>
              {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} stroke="none"/>)}
            </Pie><Tooltip content={<Tip/>}/><Legend wrapperStyle={{ fontSize: 12, fontWeight: 600 }} iconType="circle"/></PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by category */}
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>Expenses by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(s.expenseByCategory||[]).slice(0,8)} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false}/>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: 'var(--c-text3)' }} width={90} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>} cursor={{ fill: 'var(--c-surface2)' }}/>
              <Bar dataKey="total" name="Expense" fill="#6366f1" radius={[0,6,6,0]} barSize={18}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top customers */}
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 14 }}>Top Customers by Revenue</div>
        <div className="table-wrap">
          <table><thead><tr><th style={{ width: 48, textAlign: 'center' }}>#</th><th>Customer</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'center' }}>Invoices</th></tr></thead>
            <tbody>{(s.topCustomers||[]).map((c,i) => (
              <tr key={i}><td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--c-text3)' }}>#{i+1}</td>
                <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-green)' }}>{fmt.currency(c.total)}</td>
                <td style={{ textAlign: 'center', color: 'var(--c-text2)' }}>{c.count}</td></tr>
            ))}{!s.topCustomers?.length && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--c-text3)' }}>No data yet</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
