import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { TrendingUp, TrendingDown, Clock, AlertCircle, FileText, Users } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'

const COLORS = ['#1a6be8', '#0a8754', '#c97b10', '#d63d3d', '#6b3fd4', '#0891b2']

function KpiCard({ label, value, icon: Icon, variant, change, onClick }) {
  return (
    <div className={`kpi-card ${variant}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="kpi-icon"><Icon size={22} /></div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {change && <div className="kpi-change">{change}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, color: p.color, fontWeight: 600 }}>
          {p.name}: {fmt.currency(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['reports-summary'], queryFn: reportsApi.summary })
  const navigate = useNavigate()
 
  if (isLoading) return <PageLoading />
 
  const s = data || {}
 
  const chartData = (s.monthlyRevenue || []).map((r) => {
    const exp = (s.monthlyExpenses || []).find((e) => e.month === r.month)
    return { month: r.month?.slice(0, 7), revenue: Number(r.total || 0), expenses: Number(exp?.total || 0) }
  })
 
  const pieData = (s.invoicesByStatus || []).map((r) => ({ name: r.status, value: Number(r.count || 0) }))
 
  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Your business at a glance</p>
        </div>
      </div>
 
      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <KpiCard label="Total Revenue" value={fmt.currency(s.totalRevenue)} icon={TrendingUp} variant="green" onClick={() => navigate('/reports')} />
        <KpiCard label="Total Expenses" value={fmt.currency(s.totalExpenses)} icon={TrendingDown} variant="red" onClick={() => navigate('/expenses')} />
        <KpiCard label="Outstanding" value={fmt.currency(s.outstanding)} icon={Clock} variant="orange" onClick={() => navigate('/invoices')} />
        <KpiCard label="Overdue" value={fmt.currency(s.overdue || 0)} icon={AlertCircle} variant="red" onClick={() => navigate('/invoices')} />
        <KpiCard label="Total Invoices" value={fmt.number(s.invoiceCount)} icon={FileText} variant="blue" onClick={() => navigate('/invoices')} />
        <KpiCard label="Total Customers" value={fmt.number(s.customerCount)} icon={Users} variant="purple" onClick={() => navigate('/customers')} />
      </div>



      {/* Charts Row */}
      <div className="responsive-grid cols-2-1" style={{ marginBottom: 24 }}>
        {/* Revenue vs Expenses */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue vs Expenses</div>
              <div className="card-subtitle">Monthly trend</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--c-green)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--c-red)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Invoice Status Pie */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Invoice Status</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="responsive-grid cols-1-1">
        {/* Top Customers */}
        <div className="card">
          <div className="card-header"><div className="card-title">Top Customers</div></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Revenue</th>
                  <th>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {(s.topCustomers || []).slice(0, 5).map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{c.customer_name}</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt.currency(c.total)}</td>
                    <td style={{ color: 'var(--text-2)' }}>{c.count}</td>
                  </tr>
                ))}
                {!(s.topCustomers?.length) && (
                  <tr><td colSpan={3} style={{ color: 'var(--text-3)', textAlign: 'center', padding: 24 }}>No data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense by Category */}
        <div className="card">
          <div className="card-header"><div className="card-title">Expense by Category</div></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(s.expenseByCategory || []).slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'var(--text-3)' }} width={80} />
              <Tooltip formatter={(v) => [fmt.currency(v)]} />
              <Bar dataKey="total" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
