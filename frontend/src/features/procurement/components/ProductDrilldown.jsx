import { X, TrendingUp, Package, DollarSign, BarChart2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export default function ProductDrilldown({ product: p, trendData, onClose }) {
  const navigate = useNavigate()
  if (!p) return null

  const mc = p.margin >= 20 ? '#10b981' : p.margin >= 10 ? '#f59e0b' : '#ef4444'
  const abcColor = { A:'#10b981', B:'#f59e0b', C:'#ef4444' }
  const isLow = Number(p.stock_qty) <= Number(p.low_stock_alert)

  const trend = trendData ? ['Jan','Feb','Mar','Apr','May','Jun'].map((m, i) => ({ month: m, stock: trendData[i] || 0 })) : []
  const reorderQty = Math.ceil(Number(p.low_stock_alert) * 2)
  const reorderValue = fmt.currency(reorderQty * Number(p.purchase_price))

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, background:'#fff', boxShadow:'-4px 0 24px rgba(0,0,0,0.12)', zIndex:500, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:3 }}>{p.name}</div>
          <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace' }}>{p.sku || '—'} · {p.category}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:800, padding:'3px 9px', borderRadius:20, background:abcColor[p.abcClass]+'20', color:abcColor[p.abcClass] }}>Class {p.abcClass}</span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
          {[
            { label:'Sell Price',    value:fmt.currency(p.unit_price),    color:'#6366f1' },
            { label:'Cost Price',    value:fmt.currency(p.purchase_price), color:'#64748b' },
            { label:'Gross Margin',  value:`${p.margin.toFixed(1)}%`,       color:mc },
            { label:'Stock Qty',     value:`${fmt.number(p.stock_qty)} ${p.unit}`, color: isLow ? '#ef4444' : '#10b981' },
          ].map(k => (
            <div key={k.label} style={{ padding:'10px 12px', borderRadius:9, background:k.color+'0d', border:`1px solid ${k.color}22` }}>
              <div style={{ fontSize:10, fontWeight:700, color:k.color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:17, fontWeight:800, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Stock trend */}
        {trend.length > 0 && (
          <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:12, marginBottom:12 }}>Stock Level Trend</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trend} margin={{ top:0, right:5, bottom:0, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize:10, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize:11 }} />
                <Line type="monotone" dataKey="stock" name="Stock" stroke="#6366f1" strokeWidth={2} dot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Details */}
        <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:10 }}>Product Details</div>
          {[
            ['Brand',          p.brand || '—'],
            ['HSN Code',       p.hsn_code || '—'],
            ['Tax Rate',       `${p.tax_rate}%`],
            ['Alert Level',    `${fmt.number(p.low_stock_alert)} ${p.unit}`],
            ['Stock Value',    fmt.currency(p.stockValue)],
            ['Retail Value',   fmt.currency(p.retailValue)],
            ['Status',         p.is_active ? 'Active' : 'Inactive'],
          ].map(([l, v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #e2e8f0', fontSize:12 }}>
              <span style={{ color:'#64748b' }}>{l}</span>
              <span style={{ fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Reorder recommendation */}
        {isLow && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:12, color:'#ef4444', marginBottom:8 }}>⚠ Reorder Recommended</div>
            <div style={{ fontSize:12, color:'#7f1d1d', lineHeight:1.6 }}>
              Stock ({fmt.number(p.stock_qty)}) ≤ alert ({fmt.number(p.low_stock_alert)}). Suggested order: <strong>{reorderQty} {p.unit}</strong> · Est. cost: <strong>{reorderValue}</strong>
            </div>
          </div>
        )}

        {/* Profit analysis */}
        <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:12, color:'#10b981', marginBottom:8 }}>Profit Analysis</div>
          {[
            ['Profit per unit',    fmt.currency(Number(p.unit_price) - Number(p.purchase_price))],
            ['Total stock profit', fmt.currency((Number(p.unit_price) - Number(p.purchase_price)) * Number(p.stock_qty))],
            ['Break-even units',   Number(p.unit_price) > Number(p.purchase_price) ? `${Math.ceil(Number(p.purchase_price) / (Number(p.unit_price) - Number(p.purchase_price)))} units` : 'N/A'],
          ].map(([l, v]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12 }}>
              <span style={{ color:'#064e3b' }}>{l}</span>
              <span style={{ fontWeight:700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 20px', borderTop:'1px solid #e2e8f0', display:'flex', gap:8 }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }}>Close</button>
        <button onClick={() => navigate(`/products/${p.id}`)} className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}>View Full Profile</button>
      </div>
    </div>
  )
}
