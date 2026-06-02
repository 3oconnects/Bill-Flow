import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { fmt } from '@/lib/utils'

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#6366f1']

const TTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label || payload[0]?.name}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' && p.value > 1000 ? fmt.currency(p.value) : p.value}</strong></div>
      ))}
    </div>
  )
}

export default function MarginChart({ marginBuckets, categoryBreakdown, topByMargin }) {
  const bucketData = Object.entries(marginBuckets).map(([name, value]) => ({ name, value }))
  const catData = categoryBreakdown.slice(0, 6).map(c => ({ name: c.name.charAt(0).toUpperCase() + c.name.slice(1), value: Math.round(c.retailValue), count: c.count }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Margin distribution */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Margin Distribution</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Products by gross margin bracket</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={bucketData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-20} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<TTip />} />
              <Bar dataKey="value" name="Products" radius={[4, 4, 0, 0]}>
                {bucketData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category value breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Value by Category</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Retail value distribution across categories</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<TTip />} formatter={v => fmt.currency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top margin products */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Top Products by Margin</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Highest gross margin % across your catalogue</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['#', 'Product', 'Category', 'Sell Price', 'Cost Price', 'Margin %', 'Stock Value'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {topByMargin.map((p, i) => {
              const mc = p.margin >= 30 ? '#10b981' : p.margin >= 15 ? '#f59e0b' : '#ef4444'
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{p.category}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12 }}>{fmt.currency(p.unit_price)}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12 }}>{fmt.currency(p.purchase_price)}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontWeight: 800, color: mc, fontFamily: 'monospace', fontSize: 13 }}>{p.margin.toFixed(1)}%</span>
                  </td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12 }}>{fmt.currency(p.stockValue)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
