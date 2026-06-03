import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts'
import { AlertTriangle, TrendingUp, TrendingDown, Clock, DollarSign, Search, Download, AlertCircle, CheckCircle, Zap, Target, BarChart3, Users } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { EmptyState } from '@/components/ui'

const RISK_LEVELS = {
  critical: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Critical', icon: '🔴' },
  high: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'High', icon: '🟠' },
  medium: { bg: 'var(--c-info-lt)', color: 'var(--c-info)', label: 'Medium', icon: '🔵' },
  low: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Low', icon: '🟢' },
}

const LATE_PAYERS = [
  { id: 1, customer: 'Tech Corp India', amount: 425000, daysOverdue: 45, riskLevel: 'critical', lastPaymentDate: '2024-04-15', paymentHistory: 'Frequently late' },
  { id: 2, customer: 'Global Manufacturing', amount: 285000, daysOverdue: 28, riskLevel: 'high', lastPaymentDate: '2024-04-20', paymentHistory: 'Occasional delays' },
  { id: 3, customer: 'Metro Logistics', amount: 165000, daysOverdue: 15, riskLevel: 'medium', lastPaymentDate: '2024-05-08', paymentHistory: 'First time late' },
  { id: 4, customer: 'Prime Solutions', amount: 95000, daysOverdue: 8, riskLevel: 'low', lastPaymentDate: '2024-05-20', paymentHistory: 'Excellent track record' },
]

const VENDOR_COSTS_TREND = [
  { date: 'Jan', avgCost: 245000, trend: -5, vendors: 12 },
  { date: 'Feb', avgCost: 238000, trend: -3, vendors: 12 },
  { date: 'Mar', avgCost: 255000, trend: 7, vendors: 13 },
  { date: 'Apr', avgCost: 268000, trend: 5, vendors: 14 },
  { date: 'May', avgCost: 285000, trend: 6, vendors: 14 },
  { date: 'Jun', avgCost: 312000, trend: 9, vendors: 15 },
]

const CASH_RISK_INSIGHTS = [
  { id: 1, risk: 'Low Collections Period', impact: 'High', metric: '18 days avg', status: 'at-risk', recommendation: 'Accelerate collection processes', icon: '⚡' },
  { id: 2, risk: 'Payment Concentration', impact: 'High', metric: '42% to top 3', status: 'at-risk', recommendation: 'Diversify vendor base', icon: '🎯' },
  { id: 3, risk: 'Seasonal Volatility', impact: 'Medium', metric: '±35% variance', status: 'watch', recommendation: 'Build cash reserves for peak periods', icon: '📊' },
  { id: 4, risk: 'Vendor Dependency', impact: 'Medium', metric: '3 critical vendors', status: 'watch', recommendation: 'Identify backup suppliers', icon: '🔗' },
  { id: 5, risk: 'DSO Increase', impact: 'Low', metric: '+3 days YoY', status: 'monitored', recommendation: 'Review credit terms', icon: '📈' },
]

const COST_ANALYSIS = [
  { vendor: 'Supplier A', costTrend: 245, efficiency: 92, volume: 125, color: '#FF6B6B' },
  { vendor: 'Supplier B', costTrend: 185, efficiency: 88, volume: 95, color: '#4ECDC4' },
  { vendor: 'Supplier C', costTrend: 165, efficiency: 95, volume: 110, color: '#45B7D1' },
  { vendor: 'Supplier D', costTrend: 128, efficiency: 82, volume: 75, color: '#96CEB4' },
  { vendor: 'Supplier E', costTrend: 115, efficiency: 78, volume: 60, color: '#FFEAA7' },
]

const RISK_DISTRIBUTION = [
  { name: 'Critical', value: 1, color: 'var(--c-error)' },
  { name: 'High', value: 1, color: 'var(--c-warning)' },
  { name: 'Medium', value: 1, color: 'var(--c-info)' },
  { name: 'Low', value: 1, color: 'var(--c-success)' },
]

export default function BankingInsightsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRisk, setSelectedRisk] = useState('all')

  useEffect(() => {
    setContext('Banking', 'Banking Insights')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('Generate Insights Report - connect to export')}>
        <Download size={15} /> Export Report
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredPayers = LATE_PAYERS.filter(item => {
    const matchesSearch = item.customer.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRisk = selectedRisk === 'all' || item.riskLevel === selectedRisk
    return matchesSearch && matchesRisk
  })

  const criticalCount = LATE_PAYERS.filter(p => p.riskLevel === 'critical').length
  const atRiskAmount = LATE_PAYERS.filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high').reduce((sum, p) => sum + p.amount, 0)
  const avgVendorCost = Math.round(VENDOR_COSTS_TREND[VENDOR_COSTS_TREND.length - 1].avgCost)
  const costTrendPercent = Math.round((VENDOR_COSTS_TREND[VENDOR_COSTS_TREND.length - 1].avgCost / VENDOR_COSTS_TREND[0].avgCost - 1) * 100)

  return (
    <div style={{ background: 'linear-gradient(to bottom, var(--c-surface) 0%, var(--c-surface2) 100%)' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>💡</span> Banking Insights
          </h1>
          <p>AI-powered insights on late payers, vendor cost trends and cash risks.</p>
        </div>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {/* Summary Cards - Enhanced with Gradients */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div className="card" style={{ padding: 28, background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', borderRadius: 12, color: 'white', boxShadow: '0 8px 24px rgba(255, 107, 107, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>Critical Overdue</span>
              <AlertTriangle size={24} style={{ opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{criticalCount}</div>
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>customers at risk</div>
          </div>

          <div className="card" style={{ padding: 28, background: 'linear-gradient(135deg, #FFA502 0%, #FFB83D 100%)', borderRadius: 12, color: 'white', boxShadow: '0 8px 24px rgba(255, 165, 2, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>At-Risk Amount</span>
              <DollarSign size={24} style={{ opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{fmt.currency(atRiskAmount)}</div>
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>critical & high risk</div>
          </div>

          <div className="card" style={{ padding: 28, background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', borderRadius: 12, color: 'white', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>Avg Vendor Cost</span>
              <BarChart3 size={24} style={{ opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{fmt.currency(avgVendorCost)}</div>
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>per transaction</div>
          </div>

          <div className="card" style={{ padding: 28, background: `linear-gradient(135deg, ${costTrendPercent > 0 ? '#F59E0B' : '#10B981'} 0%, ${costTrendPercent > 0 ? '#FBBF24' : '#34D399'} 100%)`, borderRadius: 12, color: 'white', boxShadow: `0 8px 24px rgba(${costTrendPercent > 0 ? '245, 158, 11' : '16, 185, 129'}, 0.15)` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>Cost Trend YTD</span>
              {costTrendPercent > 0 ? <TrendingUp size={24} style={{ opacity: 0.8 }} /> : <TrendingDown size={24} style={{ opacity: 0.8 }} />}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{costTrendPercent > 0 ? '+' : '−'}{Math.abs(costTrendPercent)}%</div>
            <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>{costTrendPercent > 0 ? 'increasing trend' : 'decreasing trend'}</div>
          </div>
        </div>

        {/* Section: Late Payers */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '3px solid var(--c-primary)' }}>
            <Users size={28} style={{ color: 'var(--c-primary)' }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Late Payers Alert</h2>
            <span style={{ background: 'var(--c-error)', color: 'white', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, marginLeft: 'auto' }}>
              {filteredPayers.length} Cases
            </span>
          </div>

          {/* Filters */}
          <div className="filter-bar" style={{ marginBottom: 20, gap: 12 }}>
            <div className="search-wrap" style={{ width: 340 }}>
              <Search className="search-icon" />
              <input
                className="form-input"
                style={{ paddingLeft: 34 }}
                placeholder="Search by customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="spacer" />
            <select
              className="form-select"
              style={{ width: 180 }}
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Late Payers Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filteredPayers.length === 0 ? (
              <div style={{ padding: '80px 24px', textAlign: 'center' }}>
                <EmptyState
                  icon={<CheckCircle size={48} />}
                  title="No late payers"
                  description="All customers are on track with their payments."
                />
              </div>
            ) : (
              <div className="table-wrap">
                <table className="compact" style={{ background: 'transparent' }}>
                  <thead style={{ background: 'linear-gradient(90deg, var(--c-surface2) 0%, var(--c-primary-lt) 100%)' }}>
                    <tr>
                      <th style={{ padding: '14px 16px' }}>CUSTOMER</th>
                      <th style={{ textAlign: 'right', padding: '14px 16px' }}>AMOUNT</th>
                      <th style={{ textAlign: 'center', padding: '14px 16px' }}>DAYS OVERDUE</th>
                      <th style={{ textAlign: 'center', padding: '14px 16px' }}>RISK</th>
                      <th style={{ padding: '14px 16px' }}>PAYMENT HISTORY</th>
                      <th style={{ textAlign: 'center', padding: '14px 16px' }}>LAST PAYMENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayers.map((item, idx) => {
                      const Risk = RISK_LEVELS[item.riskLevel]
                      return (
                        <tr key={item.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--c-surface2)', borderBottom: '1px solid var(--c-border)' }}>
                          <td style={{ fontWeight: 700, fontSize: 13, padding: '14px 16px' }}>
                            <span style={{ display: 'inline-block', marginRight: 8 }}>{Risk.icon}</span>
                            {item.customer}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-error)', padding: '14px 16px' }}>
                            {fmt.currency(item.amount)}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: item.daysOverdue > 30 ? 'var(--c-error)' : 'var(--c-warning)', padding: '14px 16px' }}>
                            {item.daysOverdue}d
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px 16px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: Risk.bg,
                              color: Risk.color,
                            }}>
                              {Risk.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--c-text)', padding: '14px 16px', fontWeight: 500 }}>
                            {item.paymentHistory}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)', padding: '14px 16px' }}>
                            {new Date(item.lastPaymentDate).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Section: Analytics */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '3px solid var(--c-warning)' }}>
            <BarChart3 size={28} style={{ color: 'var(--c-warning)' }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Cost & Vendor Analytics</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
            {/* Vendor Cost Trend */}
            <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--c-warning-lt) 0%, rgba(245,158,11,0.05) 100%)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--c-warning)' }}>📈 Vendor Cost Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={VENDOR_COSTS_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                  <XAxis dataKey="date" stroke="var(--c-text3)" style={{ fontSize: 12 }} />
                  <YAxis stroke="var(--c-text3)" style={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--c-surface)', border: '2px solid var(--c-warning)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--c-text)' }}
                    formatter={(value) => fmt.currency(value)}
                  />
                  <Legend wrapperStyle={{ paddingTop: 16 }} />
                  <Line type="monotone" dataKey="avgCost" stroke="#FFA502" strokeWidth={3} dot={{ fill: '#FFA502', r: 5 }} name="Average Cost" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Cost Analysis Scatter */}
            <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--c-info-lt) 0%, rgba(59,130,246,0.05) 100%)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--c-info)' }}>🎯 Vendor Efficiency Matrix</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                  <XAxis dataKey="efficiency" type="number" stroke="var(--c-text3)" style={{ fontSize: 12 }} name="Efficiency %" />
                  <YAxis dataKey="costTrend" type="number" stroke="var(--c-text3)" style={{ fontSize: 12 }} name="Cost Trend" />
                  <Tooltip
                    contentStyle={{ background: 'var(--c-surface)', border: '2px solid var(--c-info)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--c-text)' }}
                    cursor={{ fill: 'rgba(59,130,246,0.1)' }}
                  />
                  {COST_ANALYSIS.map((item, idx) => (
                    <Scatter
                      key={idx}
                      name={item.vendor}
                      data={[item]}
                      fill={item.color}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Distribution Pie */}
            <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--c-info-lt) 0%, rgba(59,130,246,0.05) 100%)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--c-info)' }}>📊 Risk Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={RISK_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {RISK_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Vendors */}
            <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--c-success-lt) 0%, rgba(16,185,129,0.05) 100%)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--c-success)' }}>🏆 Top Suppliers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {COST_ANALYSIS.map((supplier, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: idx < COST_ANALYSIS.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: supplier.color }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{supplier.vendor}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Vol: {supplier.volume} | Eff: {supplier.efficiency}%</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: supplier.color }}>₹{supplier.costTrend}K</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Risk Assessment */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '3px solid var(--c-error)' }}>
            <AlertTriangle size={28} style={{ color: 'var(--c-error)' }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Risk Assessment</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {CASH_RISK_INSIGHTS.map(item => {
              const statusColors = {
                'at-risk': { bg: '#FFE5E5', border: '#FF6B6B', color: '#C92A2A' },
                'watch': { bg: '#FFF4E6', border: '#FFA502', color: '#D97706' },
                'monitored': { bg: '#E0F2FE', border: '#3B82F6', color: '#0284C7' },
              }
              const Status = statusColors[item.status]
              return (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: 20,
                    background: Status.bg,
                    border: `2px solid ${Status.border}`,
                    borderRadius: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: Status.color,
                      background: 'rgba(255,255,255,0.6)',
                      padding: '4px 10px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                    }}>
                      {item.status === 'at-risk' ? 'At Risk' : item.status === 'watch' ? 'Watch' : 'Monitored'}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>{item.risk}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>Metric: {item.metric}</div>
                  </div>
                  <div style={{ padding: '12px 0', background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: Status.color, marginBottom: 4 }}>Impact: {item.impact}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: 1.5 }}>
                    💡 {item.recommendation}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ padding: 20, background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)', borderRadius: 12, color: 'white' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🚨 Immediate Actions</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.95 }}>
              Tech Corp India is 45 days overdue with ₹4.25L. Launch collection escalation immediately to prevent further delays.
            </div>
          </div>

          <div style={{ padding: 20, background: 'linear-gradient(135deg, #FFA502 0%, #FFB83D 100%)', borderRadius: 12, color: 'white' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>📈 Cost Optimization</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.95 }}>
              Vendor costs up 27% YTD. Negotiate rates or consolidate suppliers. Focus on low-efficiency vendors for renegotiation.
            </div>
          </div>

          <div style={{ padding: 20, background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', borderRadius: 12, color: 'white' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🎯 Strategic Priority</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.95 }}>
              42% payment concentration in top 3 vendors creates risk. Diversify supplier base to strengthen resilience and negotiate better terms.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
