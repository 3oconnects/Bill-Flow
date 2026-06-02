import { useState } from 'react'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fmt } from '@/lib/utils'

const TT = ({ active, payload, label, money }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <div style={{ fontWeight:700, marginBottom:4, color:'#1e293b' }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, display:'flex', gap:8 }}>
          <span style={{ color:'#64748b' }}>{p.name}:</span>
          <strong>{money ? fmt.currency(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

const COLORS = ['#6366f1','#10b981','#f59e0b','#0ea5e9','#7c3aed']
const CAT_COLORS = { electronics:'#6366f1', accessories:'#10b981', storage:'#f59e0b', networking:'#0ea5e9', furniture:'#7c3aed' }

export default function TrendLines({ monthly, productTrends, withABC }) {
  const [view, setView] = useState('stock')

  const catMonthly = monthly.map(m => ({
    month: m.month,
    ...Object.fromEntries(Object.entries(m.categories).map(([k,v]) => [k.charAt(0).toUpperCase()+k.slice(1), v]))
  }))
  const cats = Object.keys(monthly[0]?.categories || {})

  // Product stock trend for top-5 products
  const top5 = withABC.slice(0, 5)
  const top5Monthly = (productTrends ? ['Jan','Feb','Mar','Apr','May','Jun'].map((month, i) => {
    const row = { month }
    top5.forEach(p => { row[p.name.split(' ').slice(0,2).join(' ')] = (productTrends[p.id] || [])[i] || 0 })
    return row
  }) : [])

  const views = [
    { id:'stock',    label:'Stock Value' },
    { id:'procure',  label:'Procurement Spend' },
    { id:'category', label:'By Category' },
    { id:'products', label:'Top Products' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Toggle */}
      <div style={{ display:'flex', gap:6 }}>
        {views.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding:'6px 14px', fontSize:12, fontWeight: view===v.id ? 700 : 500, borderRadius:8,
            border:'none', cursor:'pointer',
            background: view===v.id ? '#6366f1' : '#f1f5f9',
            color: view===v.id ? '#fff' : '#64748b',
          }}>{v.label}</button>
        ))}
      </div>

      {/* Stock Value Trend */}
      {view === 'stock' && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>Inventory Stock Value Trend</div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Total stock value at cost price — last 6 months</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{ top:5, right:10, bottom:5, left:10 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} />
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip content={<TT money />} />
              <Area type="monotone" dataKey="stockValue" name="Stock Value" stroke="#6366f1" fill="url(#g1)" strokeWidth={2.5} dot={{ r:4 }} activeDot={{ r:6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Procurement Spend */}
      {view === 'procure' && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>Monthly Procurement Spend</div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Total purchase spend per month</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top:5, right:10, bottom:5, left:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} />
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip content={<TT money />} />
              <Bar dataKey="procurement" name="Procurement" fill="#10b981" radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By Category */}
      {view === 'category' && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>Category-wise Stock Value</div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Monthly breakdown by product category</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={catMonthly} margin={{ top:5, right:10, bottom:5, left:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} />
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip content={<TT money />} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              {cats.map((c,i) => (
                <Area key={c} type="monotone" dataKey={c.charAt(0).toUpperCase()+c.slice(1)} stackId="1"
                  stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} strokeWidth={1.5} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Products */}
      {view === 'products' && top5Monthly.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'18px 20px' }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>Top 5 Products — Stock Level Trend</div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Monthly stock quantity for highest-value products</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={top5Monthly} margin={{ top:5, right:10, bottom:5, left:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} />
              <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              {top5.map((p, i) => (
                <Line key={p.id} type="monotone"
                  dataKey={p.name.split(' ').slice(0,2).join(' ')}
                  stroke={COLORS[i]} strokeWidth={2} dot={{ r:3 }} activeDot={{ r:5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* MoM summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Stock Growth (MoM)', val: monthly.length >= 2 ? `+${(((monthly[monthly.length-1].stockValue - monthly[monthly.length-2].stockValue) / monthly[monthly.length-2].stockValue)*100).toFixed(1)}%` : '—', color:'#10b981' },
          { label:'Procurement MoM',    val: monthly.length >= 2 ? `+${(((monthly[monthly.length-1].procurement - monthly[monthly.length-2].procurement) / monthly[monthly.length-2].procurement)*100).toFixed(1)}%` : '—', color:'#6366f1' },
          { label:'Units MoM',          val: monthly.length >= 2 ? `+${(((monthly[monthly.length-1].units - monthly[monthly.length-2].units) / monthly[monthly.length-2].units)*100).toFixed(1)}%` : '—', color:'#f59e0b' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
            <div style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
