import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, AlertTriangle, Package, Zap } from 'lucide-react'
import { fmt } from '@/lib/utils'

const TURNOVER_DATA = [
  { category: 'Electronics', turnover: 8.2, trend: 'up' },
  { category: 'Accessories', turnover: 5.4, trend: 'down' },
  { category: 'Office', turnover: 3.8, trend: 'up' },
  { category: 'Furniture', turnover: 1.2, trend: 'down' },
]

const AGE_DISTRIBUTION = [
  { range: '0-30 days', count: 24, value: 450000 },
  { range: '31-60 days', count: 18, value: 280000 },
  { range: '61-90 days', count: 12, value: 180000 },
  { range: '90+ days', count: 8, value: 95000 },
]

const DEAD_STOCK = [
  { id: 1, sku: 'PROD-010', product: 'Outdated Monitor', lastSold: '2023-08-15', daysSinceSale: 287, value: 25000 },
  { id: 2, sku: 'PROD-011', product: 'Legacy Keyboard', lastSold: '2023-09-20', daysSinceSale: 256, value: 12000 },
  { id: 3, sku: 'PROD-012', product: 'Old Printer', lastSold: '2023-10-05', daysSinceSale: 241, value: 45000 },
  { id: 4, sku: 'PROD-013', product: 'Retro Mouse Pad', lastSold: '2023-11-10', daysSinceSale: 205, value: 3000 },
]

const DEMAND_FORECAST = [
  { month: 'Jan', forecast: 120, actual: 95 },
  { month: 'Feb', forecast: 135, actual: 118 },
  { month: 'Mar', forecast: 150, actual: 142 },
  { month: 'Apr', forecast: 165, actual: 175 },
  { month: 'May', forecast: 180, actual: 165 },
  { month: 'Jun', forecast: 195, actual: 201 },
]

const TOP_PRODUCTS = [
  { id: 1, product: 'Laptop - Dell XPS 13', turnover: 12.4, unitsSold: 45, revenue: 1125000 },
  { id: 2, product: 'Monitor - 27" 4K', turnover: 9.8, unitsSold: 12, revenue: 540000 },
  { id: 3, product: 'Mouse - Wireless', turnover: 8.6, unitsSold: 86, revenue: 129000 },
  { id: 4, product: 'Desk Lamp - LED', turnover: 6.2, unitsSold: 31, revenue: 77500 },
]

const COLORS = ['var(--c-primary)', 'var(--c-success)', 'var(--c-warning)', 'var(--c-error)']

export default function InventoryAnalyticsPage() {
  const { setContext, clear } = useTopbarStore()
  const [data] = useState({
    turnoverRate: 6.4,
    dio: 45,
    stockToSalesRatio: 2.1,
    deadStockValue: 85000,
  })

  useEffect(() => { setContext('Inventory', 'Analytics'); return clear }, [setContext, clear])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Inventory Analytics</h1>
          <p>Turnover rates, dead stock analysis and demand forecasting.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Turnover Rate</span>
            <TrendingUp size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--c-primary)' }}>{data.turnoverRate.toFixed(1)}x</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>times per year</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>DIO</span>
            <Package size={18} style={{ color: 'var(--c-info)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.dio}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>days inventory outstanding</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Stock-to-Sales</span>
            <Zap size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{data.stockToSalesRatio.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>ratio</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Dead Stock</span>
            <AlertTriangle size={18} style={{ color: 'var(--c-error)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--c-error)' }}>{fmt.currency(data.deadStockValue)}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>tied up value</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Turnover by Category */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Turnover Rate by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={TURNOVER_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="category" stroke="var(--c-text3)" style={{ fontSize: 12 }} />
              <YAxis stroke="var(--c-text3)" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--c-text)' }}
                formatter={(value) => value.toFixed(1) + 'x'}
              />
              <Bar dataKey="turnover" fill="var(--c-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Age Distribution */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Inventory Age Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={AGE_DISTRIBUTION} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={80} label>
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--c-text)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
            {AGE_DISTRIBUTION.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[idx] }} />
                <span>{item.range}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demand Forecast */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Demand Forecast vs Actual</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={DEMAND_FORECAST}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
            <XAxis dataKey="month" stroke="var(--c-text3)" style={{ fontSize: 12 }} />
            <YAxis stroke="var(--c-text3)" style={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 6 }}
              labelStyle={{ color: 'var(--c-text)' }}
            />
            <Legend wrapperStyle={{ paddingTop: 16 }} />
            <Line type="monotone" dataKey="forecast" stroke="var(--c-info)" strokeWidth={2} dot={{ fill: 'var(--c-info)', r: 4 }} name="Forecasted" />
            <Line type="monotone" dataKey="actual" stroke="var(--c-primary)" strokeWidth={2} dot={{ fill: 'var(--c-primary)', r: 4 }} name="Actual Sales" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products & Dead Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Top Products */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--c-border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Top Performing Products</h3>
          </div>
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th style={{ textAlign: 'center' }}>TURNOVER</th>
                  <th style={{ textAlign: 'right' }}>REVENUE</th>
                </tr>
              </thead>
              <tbody>
                {TOP_PRODUCTS.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{item.product}</td>
                    <td style={{ textAlign: 'center', color: 'var(--c-primary)', fontWeight: 600 }}>{item.turnover.toFixed(1)}x</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--c-success)' }}>{fmt.currency(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dead Stock */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid var(--c-border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Dead Stock Items</h3>
          </div>
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th style={{ textAlign: 'center' }}>DAYS</th>
                  <th style={{ textAlign: 'right' }}>VALUE</th>
                </tr>
              </thead>
              <tbody>
                {DEAD_STOCK.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{item.product}</td>
                    <td style={{ textAlign: 'center', color: item.daysSinceSale > 250 ? 'var(--c-error)' : 'var(--c-warning)', fontWeight: 600 }}>{item.daysSinceSale}d</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--c-text3)' }}>{fmt.currency(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: 16, background: 'var(--c-primary-lt)', borderLeft: '3px solid var(--c-primary)' }}>
          <div style={{ fontWeight: 700, color: 'var(--c-primary)', marginBottom: 8 }}>📊 Performance Insight</div>
          <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: '1.6' }}>
            Your inventory turnover rate of 6.4x is healthy. Electronics category leads with 8.2x turnover, indicating strong demand. Consider increasing stock levels for Accessories.
          </div>
        </div>

        <div className="card" style={{ padding: 16, background: 'var(--c-error-lt)', borderLeft: '3px solid var(--c-error)' }}>
          <div style={{ fontWeight: 700, color: 'var(--c-error)', marginBottom: 8 }}>⚠️ Action Required</div>
          <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: '1.6' }}>
            {fmt.currency(data.deadStockValue)} in dead stock identified. Consider markdowns or clearance sales for items not sold in 200+ days.
          </div>
        </div>
      </div>
    </div>
  )
}
