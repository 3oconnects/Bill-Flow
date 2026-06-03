import { fmt } from '@/lib/utils'

export const COLORS = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316']

export const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 700, marginBottom: 2 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt.currency(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}
