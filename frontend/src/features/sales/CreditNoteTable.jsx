import { FileMinus, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { ReasonBadge, StatusBadge } from './CreditNotesShared'

export default function CreditNoteTable({ notes, onApprove, onApply, onReject, onDelete }) {
  if (!notes.length) return (
    <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--c-text3)' }}>
      <FileMinus size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: .3 }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>No credit notes found</div>
      <div style={{ fontSize: 13 }}>Issue a credit note when customers return products or request refunds.</div>
    </div>
  )
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CN #</th><th>Customer</th><th>Invoice Ref</th>
            <th>Reason</th><th>Status</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
            <th>Approved By</th><th>Created</th><th />
          </tr>
        </thead>
        <tbody>
          {notes.map(n => (
            <tr key={n.id}>
              <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#d63d3d' }}>{n.number}</span></td>
              <td style={{ fontWeight: 600 }}>{n.customer_name}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-text3)' }}>{n.invoice_number || '—'}</td>
              <td><ReasonBadge reason={n.reason} /></td>
              <td><StatusBadge status={n.status} /></td>
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#d63d3d' }}>{fmt.currency(n.total)}</td>
              <td style={{ fontSize: 11, color: 'var(--c-text2)' }}>{n.approved_by || '—'}</td>
              <td style={{ fontSize: 11, color: 'var(--c-text3)' }}>{fmt.date(n.created_at)}</td>
              <td>
                <div style={{ display: 'flex', gap: 3 }}>
                  {n.status === 'pending_review' && (
                    <>
                      <button className="btn btn-success btn-sm" title="Approve" onClick={() => onApprove(n.id)}><CheckCircle2 size={12} /></button>
                      <button className="btn btn-ghost btn-sm" title="Reject" onClick={() => onReject(n.id)} style={{ color: '#d63d3d' }}><XCircle size={12} /></button>
                    </>
                  )}
                  {n.status === 'approved' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => onApply(n.id)}>Apply</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => onDelete(n.id)} style={{ color: '#d63d3d' }}><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
