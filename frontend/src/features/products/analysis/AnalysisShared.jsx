/**
 * AnalysisShared.jsx — shared UI micro-components for ProductAnalysisModal tabs
 */
import { ArrowUpRight, ArrowDownRight, Minus as FlatTrend } from 'lucide-react'
import { C } from './analyticsEngine'

export function pill(text, color, bg) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: bg, color, textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {text}
    </span>
  )
}

export function ScoreRing({ score, size = 90, strokeWidth = 8 }) {
  const r    = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 75 ? C.emerald : score >= 50 ? C.amber : C.rose
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size/2} y={size/2 + 6} textAnchor="middle" fontSize={20} fontWeight={800} fill={color}>
        {score}
      </text>
    </svg>
  )
}

export function StatCard({ icon: Icon, label, value, sub, color, bg, trend }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${color}22` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.slate, marginTop: 6 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: trend > 0 ? C.emerald : trend < 0 ? C.rose : C.slate }}>
          {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <FlatTrend size={12} />}
          {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs prev period
        </div>
      )}
    </div>
  )
}

export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: p.color }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: C.slate }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  )
}
