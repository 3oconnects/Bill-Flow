import { Smartphone, Building2, Banknote, CreditCard } from 'lucide-react'
import { fmt } from '@/lib/utils'

export const METHOD_META = {
  upi:           { label: 'UPI',           color: '#6366f1', icon: Smartphone },
  neft:          { label: 'NEFT',          color: '#0ea5e9', icon: Building2 },
  rtgs:          { label: 'RTGS',          color: '#0284c7', icon: Building2 },
  cash:          { label: 'Cash',          color: '#10b981', icon: Banknote },
  cheque:        { label: 'Cheque',        color: '#f59e0b', icon: CreditCard },
  card:          { label: 'Card',          color: '#ec4899', icon: CreditCard },
  bank_transfer: { label: 'Bank Transfer', color: '#8b5cf6', icon: Building2 },
}

export const DATE_FILTERS = [
  { id: 'month', label: 'This Month' },
  { id: 'qtr',   label: 'This Quarter' },
  { id: 'year',  label: 'This Year' },
  { id: 'all',   label: 'All Time' },
]

export function getRange(filter) {
  const now = new Date()
  if (filter === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), now]
  if (filter === 'qtr')   return [new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), now]
  if (filter === 'year')  return [new Date(now.getFullYear(), 0, 1), now]
  return [null, null]
}

export function AccountCard({ method, totalIn, totalOut, txnCount, color, Icon }) {
  const balance = totalIn - totalOut
  return (
    <div style={{
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border)',
      borderRadius: 12,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: color, borderRadius: '12px 0 0 12px' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} color={color} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)' }}>{method}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 1 }}>{txnCount} transactions</div>
          </div>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
          padding: '3px 8px', borderRadius: 20,
          background: balance >= 0 ? '#e6f5ee' : '#fdf0f0',
          color: balance >= 0 ? '#0a8754' : '#d63d3d',
        }}>
          {balance >= 0 ? '▲ Positive' : '▼ Negative'}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 3 }}>Net Balance</div>
        <div style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-.5px',
          color: balance >= 0 ? '#0a8754' : '#d63d3d',
        }}>
          {fmt.currency(Math.abs(balance))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#e6f5ee', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#0a8754', fontWeight: 700, marginBottom: 2 }}>↓ RECEIVED</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0a8754' }}>{fmt.currency(totalIn)}</div>
        </div>
        <div style={{ background: '#fdf0f0', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: '#d63d3d', fontWeight: 700, marginBottom: 2 }}>↑ PAID</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#d63d3d' }}>{fmt.currency(totalOut)}</div>
        </div>
      </div>
    </div>
  )
}

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--c-surface)', border: '1px solid var(--c-border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--c-text2)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{p.name}:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)' }}>{fmt.currency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}
