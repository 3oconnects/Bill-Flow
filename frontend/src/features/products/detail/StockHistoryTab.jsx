import { History } from 'lucide-react'
import { S } from './DetailShared'

export default function StockHistoryTab({ stockHistory, unit }) {
  if (!stockHistory.length) return (
    <div style={S.empty}>
      <History size={26} style={{ marginBottom: 8, opacity: 0.3 }} />
      <div style={{ fontWeight: 600, fontSize: 13 }}>No stock movements yet</div>
    </div>
  )
  
  const rLabel = { purchase: 'Purchase', sale: 'Sale', return: 'Return', damaged: 'Damaged', count: 'Count Correction', manual: 'Manual', adjustment: 'Adjustment' }
  
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{['Date','Type','Change','Before','After','Note'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {stockHistory.map((r, i) => {
          const d = Number(r.delta), isIn = d > 0
          return (
            <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
              <td style={{ ...S.td, fontSize: 12, color: 'var(--text-2)' }}>
                {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td style={S.td}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: isIn ? '#ecfdf5' : '#fef2f2', color: isIn ? '#10b981' : '#ef4444' }}>
                  {rLabel[r.reason] || r.reason || 'Adjustment'}
                </span>
              </td>
              <td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace', color: isIn ? '#10b981' : '#ef4444' }}>
                {isIn ? '+' : ''}{d.toLocaleString('en-IN')} {unit}
              </td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>
                {Number(r.qty_before || 0).toLocaleString('en-IN')}
              </td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                {Number(r.qty_after || 0).toLocaleString('en-IN')}
              </td>
              <td style={{ ...S.td, fontSize: 12, color: 'var(--text-3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.note || '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
