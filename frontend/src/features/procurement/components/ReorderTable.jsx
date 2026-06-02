import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { fmt } from '@/lib/utils'

export default function ReorderTable({ reorderCandidates, overstocked }) {
  const navigate = useNavigate()
  const urgency = (p) => {
    if (Number(p.stock_qty) === 0) return { label: 'Out of Stock', color: '#ef4444', bg: '#fef2f2' }
    const ratio = Number(p.stock_qty) / Math.max(Number(p.low_stock_alert), 1)
    if (ratio <= 0.5) return { label: 'Critical', color: '#ef4444', bg: '#fef2f2' }
    return { label: 'Low', color: '#f59e0b', bg: '#fffbeb' }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Reorder Needed */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} color="#ef4444" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Reorder Required</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{reorderCandidates.length} products below alert level</div>
          </div>
        </div>
        {reorderCandidates.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>✓ All stock levels healthy</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Product', 'Stock', 'Alert', 'Urgency', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {reorderCandidates.slice(0, 10).map((p, i) => {
                const u = urgency(p)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{fmt.number(p.stock_qty)}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{fmt.number(p.low_stock_alert)}</td>
                    <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: u.bg, color: u.color }}>{u.label}</span></td>
                    <td style={{ padding: '8px 12px' }}>
                      <button onClick={() => navigate(`/products/${p.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1' }}><ArrowRight size={13} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Overstocked */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} color="#f59e0b" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Overstocked</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{overstocked.length} products with excess stock</div>
          </div>
        </div>
        {overstocked.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>✓ No overstock detected</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Product', 'Stock', 'Alert', 'Value', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {overstocked.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{fmt.number(p.stock_qty)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{fmt.number(p.low_stock_alert)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{fmt.currency(p.stockValue)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <button onClick={() => navigate(`/products/${p.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1' }}><ArrowRight size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
