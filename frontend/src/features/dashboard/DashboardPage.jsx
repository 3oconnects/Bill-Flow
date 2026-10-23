import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { reportsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { TrendingUp, TrendingDown, Clock, AlertCircle, FileText, Users, Calendar } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'

const COLORS = ['#1a6be8', '#0a8754', '#c97b10', '#d63d3d', '#6b3fd4', '#0891b2']

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Helper to convert YYYY-MM-DD to DD-MM-YYYY
function toDDMMYYYY(dateStr) {
  if (!dateStr) return ''
  const parts = String(dateStr).split('-')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
}

// Formatter for X-Axis tick labels
function formatXAxisTick(value, mode) {
  if (!value) return ''
  if (mode === 'month') {
    const parts = String(value).split('-')
    const monthIdx = parseInt(parts[1], 10) - 1
    if (monthIdx >= 0 && monthIdx < 12) {
      return SHORT_MONTHS[monthIdx]
    }
    return value
  }
  return toDDMMYYYY(value)
}

// Formatter for Tooltip title
function formatTooltipLabel(value, mode) {
  if (!value) return ''
  if (mode === 'month') {
    const parts = String(value).split('-')
    const monthIdx = parseInt(parts[1], 10) - 1
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${FULL_MONTHS[monthIdx]} ${parts[0]}`
    }
    return value
  }
  if (mode === 'week') {
    return `Week of ${toDDMMYYYY(value)}`
  }
  return toDDMMYYYY(value)
}

function getDefaultDates() {
  const end = new Date()
  const start = new Date(Date.now() - 29 * 86400000)
  const to = end.toISOString().split('T')[0]
  const from = start.toISOString().split('T')[0]
  return { from, to }
}

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

const ChartTooltip = ({ active, payload, label, mode }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, fontWeight: 600 }}>
        {formatTooltipLabel(label, mode)}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, color: p.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span>{p.name}: {fmt.currency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Styles for the chart filter bar ───────────────────────────────── */
const filterBarStyle = {
  display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
}
const tabBtnStyle = (active) => ({
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: active ? 'var(--accent)' : 'transparent',
  color: active ? '#fff' : 'var(--text-2)',
  cursor: 'pointer',
  transition: 'all .15s ease',
})
const dateInputStyle = {
  padding: '5px 8px',
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-1)',
  color: 'var(--text-1)',
  outline: 'none',
}
const applyBtnStyle = {
  padding: '5px 14px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  cursor: 'pointer',
}

/* ── Revenue vs Expenses Chart with filters ────────────────────────── */
function RevenueExpensesChart() {
  const [chartMode, setChartMode] = useState('month')
  const defaultDates = useMemo(() => getDefaultDates(), [])
  const [customFrom, setCustomFrom] = useState(defaultDates.from)
  const [customTo, setCustomTo] = useState(defaultDates.to)
  const [appliedFrom, setAppliedFrom] = useState(defaultDates.from)
  const [appliedTo, setAppliedTo] = useState(defaultDates.to)

  const isCustom = chartMode === 'custom'
  const apiMode = isCustom ? 'day' : chartMode
  const queryFrom = isCustom ? appliedFrom : undefined
  const queryTo = isCustom ? appliedTo : undefined

  const { data: chartRes, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-chart', apiMode, queryFrom, queryTo],
    queryFn: () => reportsApi.chart(apiMode, queryFrom, queryTo),
    keepPreviousData: true,
  })

  const chartData = useMemo(() => {
    const points = chartRes?.points || []
    return points.map((p) => ({
      label: p.label,
      revenue: Number(p.revenue || 0),
      expenses: Number(p.expenses || 0),
    }))
  }, [chartRes])

  const handleModeClick = (mode) => {
    setChartMode(mode)
  }

  const handleCustomToggle = () => {
    if (chartMode !== 'custom') {
      setChartMode('custom')
      if (!appliedFrom || !appliedTo) {
        setAppliedFrom(customFrom || defaultDates.from)
        setAppliedTo(customTo || defaultDates.to)
      }
    } else {
      setChartMode('month')
    }
  }

  const handleApply = () => {
    if (customFrom && customTo) {
      setAppliedFrom(customFrom)
      setAppliedTo(customTo)
    }
  }

  const subtitle = isCustom
    ? `${toDDMMYYYY(appliedFrom)} to ${toDDMMYYYY(appliedTo)}`
    : chartMode === 'day' ? 'Last 30 days (daily)'
    : chartMode === 'week' ? 'Last 12 weeks (weekly)'
    : 'This year (monthly)'

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div className="card-title">Revenue vs Expenses</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
        <div style={filterBarStyle}>
          <button
            style={tabBtnStyle(chartMode === 'day')}
            onClick={() => handleModeClick('day')}
          >
            Day
          </button>
          <button
            style={tabBtnStyle(chartMode === 'week')}
            onClick={() => handleModeClick('week')}
          >
            Week
          </button>
          <button
            style={tabBtnStyle(chartMode === 'month')}
            onClick={() => handleModeClick('month')}
          >
            Month
          </button>
          <button
            style={tabBtnStyle(isCustom)}
            onClick={handleCustomToggle}
            title="Custom date range"
          >
            <Calendar size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
            Custom
          </button>
        </div>
      </div>

      {/* Custom date picker row */}
      {isCustom && (
        <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>From:</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={dateInputStyle}
          />
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>To:</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            style={dateInputStyle}
          />
          <button
            style={applyBtnStyle}
            onClick={handleApply}
            disabled={!customFrom || !customTo}
          >
            Apply
          </button>
        </div>
      )}

      {chartLoading && !chartData.length ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 220, color: 'var(--text-3)', fontSize: 13 }}>
          Loading chart…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-3)' }}
              tickFormatter={(val) => formatXAxisTick(val, chartMode)}
              minTickGap={16}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-3)' }}
              tickFormatter={(v) => `₹${(v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<ChartTooltip mode={chartMode} />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#10b981' }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#ef4444' }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['reports-summary'], queryFn: reportsApi.summary })
  const navigate = useNavigate()
 
  if (isLoading) return <PageLoading />
 
  const s = data || {}
 
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
        {/* Revenue vs Expenses — with Day / Week / Month / Custom filter */}
        <RevenueExpensesChart />

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

