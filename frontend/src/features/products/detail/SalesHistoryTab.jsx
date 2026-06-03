import { ReceiptText } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { S } from './DetailShared'

export default function SalesHistoryTab({ salesHistory }) {
  if (!salesHistory.length) return (
    <div style={S.empty}>
      <ReceiptText size={26} style={{ marginBottom: 8, opacity: 0.3 }} />
      <div style={{ fontWeight: 600, fontSize: 13 }}>No sales recorded yet</div>
    </div>
  )
  
  const sc = { paid: '#10b981', unpaid: '#f59e0b', partial: '#0ea5e9', cancelled: '#ef4444' }
  
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{['Date','Invoice','Customer','Qty','Unit Price','Amount','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {salesHistory.map((r, i) => {
          const st = (r.invoice_status || 'unpaid').toLowerCase()
          return (
            <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
              <td style={{ ...S.td, fontSize: 12, color: 'var(--text-2)' }}>
                {r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                {r.invoice_number || '—'}
              </td>
              <td style={{ ...S.td, fontWeight: 500 }}>{r.customer_name || '—'}</td>
              <td style={{ ...S.td, fontFamily: 'monospace' }}>{Number(r.quantity).toLocaleString('en-IN')}</td>
              <td style={{ ...S.td, fontFamily: 'monospace' }}>{fmt.currency(r.unit_price)}</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 700 }}>{fmt.currency(r.amount)}</td>
              <td style={S.td}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (sc[st] || '#64748b') + '18', color: sc[st] || '#64748b', textTransform: 'capitalize' }}>
                  {st}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
