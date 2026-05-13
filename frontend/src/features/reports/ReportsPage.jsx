import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { TrendingUp, TrendingDown, PieChart as PieChartIcon } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ fontSize: 13, color: p.color, fontWeight: 700 }}>{p.name}: {fmt.currency(p.value)}</div>)}
    </div>
  )
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['reports-summary'], queryFn: reportsApi.summary })
  if (isLoading) return <PageLoading />
  const s = data || {}

  const chartData = (s.monthlyRevenue || []).map((r) => {
    const exp = (s.monthlyExpenses || []).find((e) => e.month === r.month)
    return { month: r.month?.slice(0, 7), revenue: Number(r.total || 0), expenses: Number(exp?.total || 0), profit: Number(r.total || 0) - Number(exp?.total || 0) }
  })
  const pieData = (s.invoicesByStatus || []).map((r) => ({ name: r.status, value: Number(r.count || 0) }))

  const totalRev = Number(s.totalRevenue || 0)
  const totalExp = Number(s.totalExpenses || 0)
  const netProfit = totalRev - totalExp

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1>Financial Reports</h1>
          <p>P&L and business insights</p>
        </div>
      </div>

      {/* P&L Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Revenue */}
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c-green-lt)', color: 'var(--c-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-text)' }}>{fmt.currency(totalRev)}</div>
          </div>
        </div>

        {/* Expenses */}
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c-red-lt)', color: 'var(--c-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Expenses</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-text)' }}>{fmt.currency(totalExp)}</div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: netProfit >= 0 ? 'var(--c-blue-lt)' : 'var(--c-red-lt)', color: netProfit >= 0 ? 'var(--c-primary)' : 'var(--c-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PieChartIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Net Profit</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: netProfit >= 0 ? 'var(--c-primary)' : 'var(--c-red)' }}>{fmt.currency(netProfit)}</div>
          </div>
        </div>
      </div>

      {/* Revenue vs Expenses Line Chart */}
      <div className="card" style={{ marginBottom: 16, padding: '20px 20px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 24 }}>Monthly Revenue vs Expenses</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} axisLine={false} tickLine={false} dy={10} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} dx={-10} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--c-border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)', marginTop: 20 }} iconType="circle" />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--c-green)" strokeWidth={3} dot={{ r: 4, fill: 'var(--c-green)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--c-red)" strokeWidth={3} dot={{ r: 4, fill: 'var(--c-red)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="profit" name="Profit" stroke="var(--c-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--c-primary)', strokeWidth: 0 }} strokeDasharray="5 5" activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Invoice Status Pie */}
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 24 }}>Invoice Status Breakdown</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={4}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by Category */}
        <div className="card" style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 24 }}>Expense by Category</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={(s.expenseByCategory || []).slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--c-text3)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'var(--c-text3)', fontWeight: 600 }} width={100} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-surface2)' }} />
              <Bar dataKey="total" name="Expense" fill="var(--c-primary)" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="card">
        <div className="card-header" style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>Top Customers by Revenue</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: 'center' }}>Rank</th>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Total Revenue</th>
                <th style={{ textAlign: 'center' }}>Invoices</th>
              </tr>
            </thead>
            <tbody>
              {(s.topCustomers || []).map((c, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--c-text3)', textAlign: 'center', fontWeight: 600 }}>#{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--c-text)' }}>{c.customer_name}</td>
                  <td style={{ color: 'var(--c-green)', fontWeight: 700, textAlign: 'right' }}>{fmt.currency(c.total)}</td>
                  <td style={{ color: 'var(--c-text2)', textAlign: 'center', fontWeight: 500 }}>{c.count}</td>
                </tr>
              ))}
              {!(s.topCustomers?.length) && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--c-text3)', padding: 32 }}>No top customer data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
