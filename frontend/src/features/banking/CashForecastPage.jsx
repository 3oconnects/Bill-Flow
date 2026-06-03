import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock, Target } from 'lucide-react'
import { fmt } from '@/lib/utils'

const FORECAST_DATA = [
  { date: 'Today', cash: 375000, inflow: 0, outflow: 0, net: 375000 },
  { date: 'Jun 5', cash: 420000, inflow: 125000, outflow: 80000, net: 465000 },
  { date: 'Jun 10', cash: 465000, inflow: 185000, outflow: 95000, net: 555000 },
  { date: 'Jun 15', cash: 555000, inflow: 95000, outflow: 125000, net: 525000 },
  { date: 'Jun 20', cash: 525000, inflow: 75000, outflow: 145000, net: 455000 },
  { date: 'Jun 25', cash: 455000, inflow: 225000, outflow: 110000, net: 570000 },
  { date: 'Jun 30', cash: 570000, inflow: 45000, outflow: 95000, net: 520000 },
]

const DAILY_BREAKDOWN = [
  { date: 'Jun 5', type: 'Invoice INV-2024-001', category: 'Customer Payment', amount: 125000, status: 'inflow', confidence: 95 },
  { date: 'Jun 5', type: 'Vendor ACME', category: 'Vendor Payment', amount: -80000, status: 'outflow', confidence: 90 },
  { date: 'Jun 10', type: 'Invoice INV-2024-002', category: 'Customer Payment', amount: 185000, status: 'inflow', confidence: 98 },
  { date: 'Jun 10', type: 'Salary Payroll', category: 'Salary & Benefits', amount: -95000, status: 'outflow', confidence: 100 },
  { date: 'Jun 15', type: 'Invoice INV-2024-003', category: 'Customer Payment', amount: 95000, status: 'inflow', confidence: 75 },
  { date: 'Jun 15', type: 'Loan EMI', category: 'Loan Payment', amount: -125000, status: 'outflow', confidence: 100 },
]

const PERIOD_DATA = {
  '1day': [
    { label: 'Current Cash', value: 375000 },
    { label: 'Projected Inflow', value: 85000 },
    { label: 'Projected Outflow', value: 45000 },
    { label: 'Projected Balance', value: 415000 },
  ],
  '7days': [
    { label: 'Current Cash', value: 375000 },
    { label: 'Projected Inflow', value: 125000 },
    { label: 'Projected Outflow', value: 80000 },
    { label: 'Projected Balance', value: 420000 },
  ],
  '14days': [
    { label: 'Current Cash', value: 375000 },
    { label: 'Projected Inflow', value: 280000 },
    { label: 'Projected Outflow', value: 195000 },
    { label: 'Projected Balance', value: 460000 },
  ],
  '30days': [
    { label: 'Current Cash', value: 375000 },
    { label: 'Projected Inflow', value: 625000 },
    { label: 'Projected Outflow', value: 550000 },
    { label: 'Projected Balance', value: 450000 },
  ],
  '90days': [
    { label: 'Current Cash', value: 375000 },
    { label: 'Projected Inflow', value: 1850000 },
    { label: 'Projected Outflow', value: 1625000 },
    { label: 'Projected Balance', value: 600000 },
  ],
  '180days': [
    { label: 'Current Cash', value: 375000 },
    { label: 'Projected Inflow', value: 3850000 },
    { label: 'Projected Outflow', value: 3225000 },
    { label: 'Projected Balance', value: 1000000 },
  ],
}

const CATEGORY_DATA = [
  { name: 'Customer Payments', value: 625000, color: 'var(--c-success)' },
  { name: 'Vendor Payments', value: 280000, color: 'var(--c-warning)' },
  { name: 'Salary & Benefits', value: 185000, color: 'var(--c-info)' },
  { name: 'Loan Payments', value: 85000, color: 'var(--c-error)' },
]

export default function CashForecastPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [period, setPeriod] = useState('30days')
  const [selectedAccount, setSelectedAccount] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showForecasted, setShowForecasted] = useState(true)

  useEffect(() => {
    setContext('Banking', 'Cash Flow Forecast')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('Generate Forecast Report - connect to export')}>
        <TrendingUp size={15} /> Export Report
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const periodData = PERIOD_DATA[period]
  const currentCash = periodData[0].value
  const projectedInflow = periodData[1].value
  const projectedOutflow = periodData[2].value
  const projectedBalance = periodData[3].value
  const deficit = projectedBalance < 0

  const netFlow = projectedInflow - projectedOutflow
  const minBalance = Math.min(...FORECAST_DATA.map(d => d.net))
  const maxBalance = Math.max(...FORECAST_DATA.map(d => d.net))

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Cash Flow Forecast</h1>
          <p>Multi-period cash position forecasting with inflow/outflow analysis and deficit warnings.</p>
        </div>
      </div>

      {/* Period & Filter Bar */}
      <div style={{ marginBottom: 24 }}>
        {/* Period Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: '1day', label: '1 Day' },
            { key: '7days', label: '7 Days' },
            { key: '14days', label: '14 Days' },
            { key: '30days', label: '30 Days' },
            { key: '90days', label: '90 Days' },
            { key: '180days', label: '6 Months' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '8px 14px',
                background: period === p.key ? 'var(--c-primary)' : 'var(--c-surface2)',
                color: period === p.key ? 'white' : 'var(--c-text)',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseOver={(e) => {
                if (period !== p.key) {
                  e.target.style.background = 'var(--c-surface)'
                }
              }}
              onMouseOut={(e) => {
                if (period !== p.key) {
                  e.target.style.background = 'var(--c-surface2)'
                }
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="all">All Accounts</option>
            <option value="sbi">SBI Current</option>
            <option value="hdfc">HDFC Savings</option>
            <option value="icici">ICICI Current</option>
          </select>

          <select
            className="form-select"
            style={{ width: '100%' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="customer">Customer Payments</option>
            <option value="vendor">Vendor Payments</option>
            <option value="salary">Salary & Benefits</option>
            <option value="loan">Loan Payments</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', background: 'var(--c-surface2)', borderRadius: 6 }}>
            <input
              type="checkbox"
              checked={showForecasted}
              onChange={(e) => setShowForecasted(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, fontWeight: 500 }}>Show Forecasted</span>
          </label>
        </div>
      </div>

      {/* Summary Cards - Enhanced with Colors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--c-primary-lt) 0%, rgba(26,107,232,0.05) 100%)', borderLeft: '4px solid var(--c-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Current Cash</span>
            <DollarSign size={20} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-primary)', marginBottom: 4 }}>
            {fmt.currency(currentCash)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>on hand today</div>
        </div>

        <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--c-success-lt) 0%, rgba(16,185,129,0.05) 100%)', borderLeft: '4px solid var(--c-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Inflows (+)</span>
            <TrendingUp size={20} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-success)', marginBottom: 4 }}>
            {fmt.currency(projectedInflow)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>expected receipts</div>
        </div>

        <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--c-warning-lt) 0%, rgba(245,158,11,0.05) 100%)', borderLeft: '4px solid var(--c-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Outflows (−)</span>
            <TrendingDown size={20} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--c-warning)', marginBottom: 4 }}>
            {fmt.currency(projectedOutflow)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>expected payments</div>
        </div>

        <div className="card" style={{ padding: 24, background: `linear-gradient(135deg, ${deficit ? 'var(--c-error-lt)' : 'var(--c-success-lt)'} 0%, rgba(${deficit ? '239,68,68' : '16,185,129'},0.05) 100%)`, borderLeft: `4px solid ${deficit ? 'var(--c-error)' : 'var(--c-success)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Net Flow</span>
            {netFlow >= 0 ? <TrendingUp size={20} style={{ color: 'var(--c-success)' }} /> : <TrendingDown size={20} style={{ color: 'var(--c-error)' }} />}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: netFlow >= 0 ? 'var(--c-success)' : 'var(--c-error)', marginBottom: 4 }}>
            {fmt.currency(netFlow)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{netFlow >= 0 ? 'positive flow' : 'negative flow'}</div>
        </div>

        <div className="card" style={{ padding: 24, background: `linear-gradient(135deg, ${deficit ? 'var(--c-error-lt)' : 'var(--c-info-lt)'} 0%, rgba(${deficit ? '239,68,68' : '59,130,246'},0.05) 100%)`, borderLeft: `4px solid ${deficit ? 'var(--c-error)' : 'var(--c-info)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Projected Balance</span>
            {deficit ? <AlertTriangle size={20} style={{ color: 'var(--c-error)' }} /> : <Target size={20} style={{ color: 'var(--c-info)' }} />}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: deficit ? 'var(--c-error)' : 'var(--c-info)', marginBottom: 4 }}>
            {fmt.currency(projectedBalance)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>forecasted position</div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16, background: 'var(--c-surface2)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', marginBottom: 8 }}>MINIMUM BALANCE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-warning)' }}>{fmt.currency(minBalance)}</div>
        </div>
        <div className="card" style={{ padding: 16, background: 'var(--c-surface2)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', marginBottom: 8 }}>MAXIMUM BALANCE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-success)' }}>{fmt.currency(maxBalance)}</div>
        </div>
        <div className="card" style={{ padding: 16, background: 'var(--c-surface2)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', marginBottom: 8 }}>BALANCE RANGE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-primary)' }}>{fmt.currency(maxBalance - minBalance)}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Cash Position Line Chart */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Cash Position Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={FORECAST_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="date" stroke="var(--c-text3)" style={{ fontSize: 12 }} />
              <YAxis stroke="var(--c-text3)" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--c-text)' }}
                formatter={(value) => fmt.currency(value)}
              />
              <Legend wrapperStyle={{ paddingTop: 16 }} />
              <Line type="monotone" dataKey="net" stroke="var(--c-primary)" strokeWidth={3} dot={{ fill: 'var(--c-primary)', r: 4 }} name="Net Cash Position" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Inflow vs Outflow Bar Chart */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Inflows vs Outflows</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={FORECAST_DATA.slice(1).map(d => ({ ...d, outflow: Math.abs(d.outflow) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--c-text3)" style={{ fontSize: 12 }} tick={{ fill: 'var(--c-text3)' }} />
              <YAxis stroke="var(--c-text3)" style={{ fontSize: 12 }} tick={{ fill: 'var(--c-text3)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--c-text)' }}
                formatter={(value) => fmt.currency(value)}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
              />
              <Legend wrapperStyle={{ paddingTop: 16, color: 'var(--c-text)' }} />
              <Bar dataKey="inflow" fill="var(--c-success)" radius={[6, 6, 0, 0]} name="Inflows (+)" />
              <Bar dataKey="outflow" fill="var(--c-warning)" radius={[6, 6, 0, 0]} name="Outflows (−)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast Summary Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--c-border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Forecast Summary ({period === '1day' ? '1 Day' : period === '7days' ? '7 Days' : period === '14days' ? '14 Days' : period === '30days' ? '30 Days' : period === '90days' ? '90 Days' : '6 Months'})</h3>
        </div>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>METRIC</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th style={{ textAlign: 'right', width: '25%' }}>VARIANCE</th>
              </tr>
            </thead>
            <tbody>
              {periodData.map((item, idx) => {
                const variance = idx === 0 ? 0 : idx === 1 ? projectedInflow : idx === 2 ? -projectedOutflow : projectedBalance - currentCash
                const variancePercent = idx === 0 ? 0 : Math.round((Math.abs(variance) / currentCash) * 100)
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>
                      {fmt.currency(item.value)}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: variance >= 0 ? 'var(--c-success)' : 'var(--c-warning)' }}>
                      {variance === 0 ? '—' : `${variance >= 0 ? '+' : '−'} ${variancePercent}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Daily Cash Transactions</h3>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', background: 'var(--c-surface2)', padding: '4px 12px', borderRadius: 4 }}>
            {DAILY_BREAKDOWN.length} Transactions
          </span>
        </div>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>DATE</th>
                <th style={{ width: '25%' }}>TRANSACTION</th>
                <th style={{ width: '20%' }}>CATEGORY</th>
                <th style={{ textAlign: 'right', width: '15%' }}>AMOUNT</th>
                <th style={{ textAlign: 'center', width: '12%' }}>TYPE</th>
                <th style={{ textAlign: 'right', width: '13%' }}>CONFIDENCE</th>
              </tr>
            </thead>
            <tbody>
              {DAILY_BREAKDOWN.map((item, idx) => {
                const categoryColors = {
                  'Customer Payment': { bg: 'var(--c-success-lt)', color: 'var(--c-success)' },
                  'Vendor Payment': { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)' },
                  'Salary & Benefits': { bg: 'var(--c-info-lt)', color: 'var(--c-info)' },
                  'Loan Payment': { bg: 'var(--c-error-lt)', color: 'var(--c-error)' },
                }
                const colors = categoryColors[item.category] || { bg: 'var(--c-surface2)', color: 'var(--c-text)' }
                const isInflow = item.status === 'inflow'
                return (
                  <tr key={idx}>
                    <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>
                      {item.date}
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>
                      {item.type}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: colors.bg,
                        color: colors.color,
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: isInflow ? 'var(--c-success)' : 'var(--c-warning)' }}>
                      {isInflow ? '+' : '−'} {fmt.currency(Math.abs(item.amount))}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        background: isInflow ? 'var(--c-success-lt)' : 'var(--c-warning-lt)',
                        color: isInflow ? 'var(--c-success)' : 'var(--c-warning)',
                        textTransform: 'uppercase',
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                      <span style={{
                        color: item.confidence >= 90 ? 'var(--c-success)' : item.confidence >= 75 ? 'var(--c-warning)' : 'var(--c-text3)',
                      }}>
                        {item.confidence}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Pie Chart */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Cash Outflow by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={CATEGORY_DATA}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {CATEGORY_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => fmt.currency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Legend */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Category Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CATEGORY_DATA.map((cat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: idx < CATEGORY_DATA.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: cat.color }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{cat.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                      {((cat.value / CATEGORY_DATA.reduce((sum, c) => sum + c.value, 0)) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--c-primary)', fontSize: 12 }}>
                  {fmt.currency(cat.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deficit Warning */}
      {deficit && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            background: 'var(--c-error-lt)',
            border: `1px solid var(--c-error)`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--c-error)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--c-error)', marginBottom: 4 }}>⚠️ Potential Cash Deficit</div>
            <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: '1.5' }}>
              Your projected cash balance may go negative in {period === '1day' ? '1 day' : period === '7days' ? '7 days' : period === '14days' ? '14 days' : period === '30days' ? '30 days' : period === '90days' ? '90 days' : '6 months'}. Consider adjusting payment schedules or accelerating collections.
            </div>
          </div>
        </div>
      )}

      {/* Forecast Insights */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--c-text3)' }}>Forecast Insights</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>💰 Strong Position:</strong> Your cash position is healthy with positive inflows exceeding outflows. Maintain current payment schedules.
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>📊 Peak Days:</strong> June 25 shows the strongest cash position. Plan large payments around lower-balance days.
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>📈 Trend:</strong> Outflows gradually increase over the period. Monitor vendor payment schedules and adjust if needed.
          </div>
        </div>
      </div>
    </div>
  )
}
