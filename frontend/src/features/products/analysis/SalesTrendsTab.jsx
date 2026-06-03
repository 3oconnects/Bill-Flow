import { useState } from 'react'
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, ShoppingBag, Activity } from 'lucide-react'
import { C, inr, pct } from './analyticsEngine'
import { StatCard, ChartTooltip } from './AnalysisShared'

export default function SalesTrendsTab({ analytics: a, product: p }) {
  const [view, setView] = useState('revenue')
  const chartData = a.months.map(m => ({
    ...m,
    margin: m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : 0,
    aov:    m.invoices > 0 ? (m.revenue / m.invoices).toFixed(0) : 0,
  }))

  const views = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'units',   label: 'Units'   },
    { id: 'profit',  label: 'Profit'  },
    { id: 'aov',     label: 'Avg Order' },
  ]

  const viewColor = {
    revenue: C.indigo,
    units:   C.sky,
    profit:  C.emerald,
    aov:     C.amber,
  }

  const colors = [C.indigo, C.sky, C.emerald, C.amber, C.violet, C.teal, C.rose, C.slate]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Trend KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard icon={TrendingUp}  label="Avg Monthly Revenue" value={inr(a.avgRevenuePerMonth)}               sub="based on active months"  color={C.indigo}  bg="#eef2ff" />
        <StatCard icon={ShoppingBag} label="Avg Monthly Units"   value={`${a.avgUnitsPerMonth.toFixed(1)} ${p.unit}`} sub="sales velocity"    color={C.sky}     bg="#e0f2fe" />
        <StatCard icon={TrendingUp}  label="Rev MoM Change"      value={`${a.revTrend > 0 ? '+' : ''}${a.revTrend.toFixed(1)}%`}  sub="last vs prior month" color={a.revTrend >= 0 ? C.emerald : C.rose}  bg={a.revTrend >= 0 ? '#ecfdf5' : '#fef2f2'} />
        <StatCard icon={Activity}    label="Unit MoM Change"     value={`${a.unitTrend > 0 ? '+' : ''}${a.unitTrend.toFixed(1)}%`} sub="last vs prior month" color={a.unitTrend >= 0 ? C.emerald : C.rose} bg={a.unitTrend >= 0 ? '#ecfdf5' : '#fef2f2'} />
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6 }}>
        {views.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: view === v.id ? 700 : 500,
            borderRadius: 8, border: 'none', cursor: 'pointer',
            background: view === v.id ? C.indigo : '#f1f5f9',
            color: view === v.id ? '#fff' : '#64748b',
          }}>{v.label}</button>
        ))}
      </div>

      {/* Main chart */}
      {chartData.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, fontSize: 13, color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: 12 }}>
          No sales data to plot yet
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
            {view === 'revenue' ? 'Monthly Revenue' : view === 'units' ? 'Monthly Units Sold' : view === 'profit' ? 'Monthly Gross Profit' : 'Average Order Value'}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {view === 'units' ? (
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip formatter={v => `${v} ${p.unit}`} />} />
                <Bar dataKey="units" name="Units Sold" fill={C.sky} radius={[5, 5, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={viewColor[view]} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={viewColor[view]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip formatter={v => inr(v)} />} />
                <Area type="monotone"
                  dataKey={view === 'profit' ? 'profit' : view === 'aov' ? 'aov' : 'revenue'}
                  name={view === 'profit' ? 'Gross Profit' : view === 'aov' ? 'Avg Order Value' : 'Revenue'}
                  stroke={viewColor[view]}
                  fill="url(#colorGrad)" strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue + Units combo */}
      {chartData.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Revenue vs Units — Combined View</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: C.sky }} />
              <Tooltip content={<ChartTooltip formatter={(v, n) => n === 'Units' ? `${v} ${p.unit}` : inr(v)} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left"  dataKey="revenue" name="Revenue" fill={C.indigo} radius={[4,4,0,0]} opacity={0.85} />
              <Bar yAxisId="right" dataKey="units"   name="Units"   fill={C.sky}    radius={[4,4,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top customers */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Customer Revenue Breakdown</div>
        {a.topCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: '#94a3b8' }}>No sales data</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#','Customer','Revenue','Units','Orders','Share'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.topCustomers.slice(0, 8).map((c, i) => {
                const share = pct(c.revenue, a.totalRevenue)
                return (
                  <tr key={c.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: colors[i] + '20', color: colors[i], fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i+1}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{inr(c.revenue)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{c.units}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{c.orders}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                          <div style={{ width: `${share}%`, height: '100%', background: colors[i], borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: colors[i], minWidth: 32 }}>{share}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
