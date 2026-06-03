import { FileSignature, Send, FileText, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { StatusBadge } from './QuotationsComponents'
import { WinScore } from './WinScore'

export default function QuoteTable({ quotes, onStatus, onConvert, onDelete }) {
  if (!quotes.length) return (
    <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--c-text3)' }}>
      <FileSignature size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: .3 }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>No quotations found</div>
      <div style={{ fontSize: 13 }}>Create your first quotation to track your sales pipeline.</div>
    </div>
  )
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Quote #</th><th>Customer</th><th>Salesperson</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
            <th>Status</th><th>Win Score</th><th>Valid Until</th><th>v</th><th />
          </tr>
        </thead>
        <tbody>
          {quotes.map(q => {
            const isExpired = q.valid_until && new Date(q.valid_until) < new Date() &&
              !['converted','rejected','expired'].includes(q.status)
            return (
              <tr key={q.id}>
                <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--c-primary)' }}>{q.number}</span></td>
                <td>
                  <div style={{ fontWeight: 600 }}>{q.customer_name}</div>
                  {q.customer_email && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{q.customer_email}</div>}
                </td>
                <td style={{ color: 'var(--c-text2)', fontSize: 12 }}>{q.salesperson || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmt.currency(q.total)}</td>
                <td><StatusBadge status={q.status} /></td>
                <td style={{ minWidth: 100 }}><WinScore score={q.win_probability || 50} /></td>
                <td style={{ fontSize: 12, color: isExpired ? '#d63d3d' : 'var(--c-text2)' }}>
                  {q.valid_until ? fmt.date(q.valid_until) : '—'}
                  {isExpired && <div style={{ fontSize: 9, fontWeight: 700, color: '#d63d3d' }}>EXPIRED</div>}
                </td>
                <td style={{ fontSize: 11, color: 'var(--c-text3)', textAlign: 'center' }}>v{q.version || 1}</td>
                <td>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {q.status === 'draft' && (
                      <button className="btn btn-ghost btn-sm" title="Mark Sent" onClick={() => onStatus(q.id, 'sent')}>
                        <Send size={12} />
                      </button>
                    )}
                    {q.status === 'approved' && (
                      <button className="btn btn-success btn-sm" onClick={() => onConvert(q.id)}>
                        <FileText size={12} /> Convert
                      </button>
                    )}
                    {!['converted','rejected','approved'].includes(q.status) && (
                      <button className="btn btn-ghost btn-sm" title="Approve" onClick={() => onStatus(q.id, 'approved')} style={{ color: '#0a8754' }}>
                        <CheckCircle2 size={12} />
                      </button>
                    )}
                    {!['converted','rejected'].includes(q.status) && (
                      <button className="btn btn-ghost btn-sm" title="Reject" onClick={() => onStatus(q.id, 'rejected')} style={{ color: '#d63d3d' }}>
                        <XCircle size={12} />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => onDelete(q.id)} style={{ color: '#d63d3d' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
