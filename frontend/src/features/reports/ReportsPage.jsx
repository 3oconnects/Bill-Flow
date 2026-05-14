import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'

const COLORS = ['#1a6be8', '#0a8754', '#c97b10', '#d63d3d', '#6b3fd4', '#0891b2']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>{p.name}: {fmt.currency(p.value)}</div>)}
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

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left"><h1>Financial Reports</h1><p>P&L and business insights</p></div>
      </div>

      {/* P&L Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Revenue', value: fmt.currency(s.totalRevenue), color: 'var(--green)' },
          { label: 'Total Expenses', value: fmt.currency(s.totalExpenses), color: 'var(--red)' },
          { label: 'Net Profit', value: fmt.currency((s.totalRevenue || 0) - (s.totalExpenses || 0)), color: (s.totalRevenue || 0) >= (s.totalExpenses || 0) ? 'var(--green)' : 'var(--red)' },
        ].map((k) => (
          <div key={k.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue vs Expenses Line Chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">Monthly Revenue vs Expenses</div></div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="profit" name="Profit" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Invoice Status Pie */}
        <div className="card">
          <div className="card-header"><div className="card-title">Invoice Status Breakdown</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by Category */}
        <div className="card">
          <div className="card-header"><div className="card-title">Expense by Category</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={(s.expenseByCategory || []).slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'var(--text-3)' }} width={90} />
              <Tooltip formatter={(v) => [fmt.currency(v)]} />
              <Bar dataKey="total" fill="var(--accent)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="card">
        <div className="card-header"><div className="card-title">Top Customers by Revenue</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Customer</th><th>Total Revenue</th><th>Invoices</th></tr></thead>
            <tbody>
              {(s.topCustomers || []).map((c, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-3)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{c.customer_name}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 700 }}>{fmt.currency(c.total)}</td>
                  <td style={{ color: 'var(--text-2)' }}>{c.count}</td>
                </tr>
              ))}
              {!(s.topCustomers?.length) && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 24 }}>No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
