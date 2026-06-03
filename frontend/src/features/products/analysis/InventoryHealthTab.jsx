import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Package, Activity, TrendingUp, DollarSign } from 'lucide-react'
import { C, inr, num } from './analyticsEngine'
import { StatCard, ChartTooltip } from './AnalysisShared'
import { fmt } from '@/lib/utils'

export default function InventoryHealthTab({ product: p, analytics: a }) {
  const stockPct   = Math.min(100, (num(p.stock_qty) / Math.max(num(p.low_stock_alert) * 4, 1)) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Inventory KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard icon={Package}    label="Current Stock"   value={`${fmt.number(p.stock_qty)} ${p.unit}`}       sub={`Alert at ${fmt.number(p.low_stock_alert)}`}      color={num(p.stock_qty) <= num(p.low_stock_alert) ? C.rose : C.emerald} bg={num(p.stock_qty) <= num(p.low_stock_alert) ? '#fef2f2' : '#ecfdf5'} />
        <StatCard icon={Activity}   label="Days of Supply"  value={a.daysOfSupply === Infinity ? '∞ days' : `${a.daysOfSupply}d`} sub={`at ${a.velocity.toFixed(1)} units/month`} color={a.daysOfSupply < 30 ? C.rose : C.emerald} bg={a.daysOfSupply < 30 ? '#fef2f2' : '#ecfdf5'} />
        <StatCard icon={TrendingUp} label="Stock Turnover"  value={`${a.turnover.toFixed(2)}x`}                  sub="sold ÷ avg stock level"                            color={C.violet}  bg="#ede9fe" />
        <StatCard icon={DollarSign} label="Inventory Value" value={inr(num(p.stock_qty) * num(p.purchase_price))} sub={`Retail: ${inr(num(p.stock_qty) * num(p.unit_price))}`} color={C.amber} bg="#fffbeb" />
      </div>

      {/* Stock level gauge */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Stock Level Health</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Current: <strong>{fmt.number(p.stock_qty)} {p.unit}</strong></span>
          <span style={{ color: '#64748b' }}>Alert: <strong>{fmt.number(p.low_stock_alert)} {p.unit}</strong></span>
          <span style={{ color: '#64748b' }}>Healthy level: <strong>{fmt.number(num(p.low_stock_alert) * 4)} {p.unit}</strong></span>
        </div>
        <div style={{ background: '#f1f5f9', borderRadius: 8, height: 18, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: `${Math.min(100, (num(p.low_stock_alert) / Math.max(num(p.low_stock_alert) * 4, 1)) * 100)}%`, top: 0, bottom: 0, width: 2, background: C.rose, zIndex: 2 }} />
          <div style={{ height: '100%', width: `${stockPct}%`, background: `linear-gradient(90deg, ${C.rose}, ${C.amber} 40%, ${C.emerald})`, borderRadius: 8, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
          <span>0</span><span style={{ color: C.rose }}>Alert zone</span><span>Healthy</span>
        </div>
      </div>

      {/* Stock movement chart */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Stock Movements by Month</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>Inbound vs outbound stock flow</div>
        {a.stockMonths.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: '#94a3b8' }}>No stock movements recorded</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={a.stockMonths} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<ChartTooltip formatter={(v) => `${v} ${p.unit}`} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="in"  name="Stock In"  fill={C.emerald} radius={[4,4,0,0]} opacity={0.85} />
              <Bar dataKey="out" name="Stock Out" fill={C.rose}    radius={[4,4,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Reorder analysis + ABC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Reorder Analysis</div>
          {[
            ['Reorder Point',      `${Math.ceil(a.velocity * 1.5)} ${p.unit}`, 'Lead time buffer of 1.5 months'],
            ['Recommended Qty',    `${Math.ceil(a.velocity * 2)} ${p.unit}`,   '2 months demand coverage'],
            ['Estimated PO Value', inr(Math.ceil(a.velocity * 2) * num(p.purchase_price)), 'at current purchase price'],
            ['Stock Ageing Risk',  a.daysOfSupply > 180 ? 'High' : a.daysOfSupply > 90 ? 'Medium' : 'Low', 'risk of obsolescence'],
          ].map(([l, v, hint]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{l}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{hint}</div>
              </div>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>ABC Classification</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: a.abcClass === 'A' ? '#ecfdf5' : a.abcClass === 'B' ? '#fffbeb' : '#fef2f2', border: `3px solid ${a.abcClass === 'A' ? C.emerald : a.abcClass === 'B' ? C.amber : C.rose}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: a.abcClass === 'A' ? C.emerald : a.abcClass === 'B' ? C.amber : C.rose }}>{a.abcClass}</div>
            </div>
          </div>
          {[
            ['Class A', 'High margin + high velocity → priority management', C.emerald],
            ['Class B', 'Moderate margin or velocity → standard management',  C.amber],
            ['Class C', 'Low margin + low velocity → minimal investment',     C.rose],
          ].map(([cls, desc, col]) => (
            <div key={cls} style={{ display: 'flex', gap: 8, padding: '6px 10px', borderRadius: 8, marginBottom: 6, background: a.abcClass === cls[6] ? col + '12' : 'transparent', border: a.abcClass === cls[6] ? `1px solid ${col}33` : '1px solid transparent' }}>
              <span style={{ fontWeight: 800, color: col, minWidth: 18 }}>{cls[6]}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
