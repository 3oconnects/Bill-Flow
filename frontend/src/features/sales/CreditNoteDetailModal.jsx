import { useQuery } from '@tanstack/react-query'
import { FileMinus, X, CheckCircle2, XCircle, Send } from 'lucide-react'
import { creditNotesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { ReasonBadge, StatusBadge, REASON_META } from './CreditNotesShared'

/**
 * Read-only view of a credit note, opened from the listing table.
 * Pulls the full row (including items + notes) by id.
 */
export default function CreditNoteDetailModal({ id, onClose, onApprove, onApply, onReject }) {
  const { data: cn, isLoading } = useQuery({
    queryKey: ['credit-note', id],
    queryFn:  () => creditNotesApi.get(id),
    enabled:  !!id,
  })

  const items = Array.isArray(cn?.items)
    ? cn.items
    : (typeof cn?.items === 'string' ? JSON.parse(cn.items || '[]') : [])

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: '#fdf0f0', color: '#d63d3d',
            }}>
              <FileMinus size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
                Credit Note {cn?.number || ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                {cn ? `Issued to ${cn.customer_name}` : 'Loading…'}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {isLoading || !cn ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={20} /></div>
          ) : (
            <>
              {/* Header strip */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                background: 'var(--c-surface2, var(--c-bg))', border: '1px solid var(--c-border)',
                borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12,
              }}>
                <div>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Customer</div>
                  <div style={{ fontWeight: 600 }}>{cn.customer_name}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Invoice Ref</div>
                  <div style={{ fontFamily: 'monospace' }}>{cn.invoice_number || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Created</div>
                  <div>{fmt.date(cn.created_at)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                  <StatusBadge status={cn.status} />
                </div>
              </div>

              {/* Reason + notes */}
              <div style={{
                background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                borderRadius: 8, padding: 12, marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>
                    Reason
                  </span>
                  <ReasonBadge reason={cn.reason} />
                  <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                    {REASON_META[cn.reason]?.label}
                  </span>
                </div>
                {cn.notes && (
                  <div style={{ fontSize: 12, color: 'var(--c-text2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {cn.notes}
                  </div>
                )}
                {!cn.notes && (
                  <div style={{ fontSize: 11, color: 'var(--c-text3)', fontStyle: 'italic' }}>
                    No internal notes.
                  </div>
                )}
              </div>

              {/* Items */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Items credited ({items.length})
              </div>
              {items.length === 0 ? (
                <div style={{
                  border: '1px dashed var(--c-border)', borderRadius: 8, padding: 18,
                  textAlign: 'center', color: 'var(--c-text3)', fontSize: 12,
                }}>
                  No itemised lines recorded.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr 1fr',
                    gap: 0, background: 'var(--c-surface2, var(--c-bg))', fontSize: 10, fontWeight: 700,
                    color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em',
                    padding: '8px 10px',
                  }}>
                    <span>Description</span><span>HSN</span>
                    <span style={{ textAlign: 'right' }}>Qty</span>
                    <span style={{ textAlign: 'right' }}>Price</span>
                    <span style={{ textAlign: 'right' }}>Tax %</span>
                    <span style={{ textAlign: 'right' }}>Amount</span>
                  </div>
                  {items.map((it, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr 1fr',
                      gap: 0, padding: '10px', fontSize: 13,
                      borderTop: i ? '1px solid var(--c-border)' : 'none',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{it.description || '—'}</div>
                        {it.sku && (
                          <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--c-text3)', marginTop: 2 }}>
                            {it.sku}
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{it.hsn_code || '—'}</div>
                      <div style={{ textAlign: 'right' }}>{Number(it.quantity)}</div>
                      <div style={{ textAlign: 'right' }}>{fmt.currency(it.unit_price)}</div>
                      <div style={{ textAlign: 'right' }}>{Number(it.tax_rate)}%</div>
                      <div style={{ textAlign: 'right', fontWeight: 700 }}>
                        {fmt.currency((Number(it.amount) || 0) + (Number(it.tax_amount) || 0))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div style={{
                maxWidth: 280, marginLeft: 'auto',
                background: 'var(--c-surface2, var(--c-bg))', borderRadius: 8, padding: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Subtotal</span><span>{fmt.currency(cn.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Tax</span><span>{fmt.currency(cn.tax)}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 0 0',
                  borderTop: '1px solid var(--c-border)',
                }}>
                  <span style={{ fontWeight: 800 }}>Credit Total</span>
                  <span style={{ fontWeight: 800, color: '#d63d3d', fontSize: 16 }}>
                    {fmt.currency(cn.total)}
                  </span>
                </div>
              </div>

              {/* Approval audit */}
              {cn.approved_by && (
                <div style={{
                  marginTop: 14, padding: '8px 12px', background: 'var(--c-surface)',
                  border: '1px solid var(--c-border)', borderRadius: 6,
                  fontSize: 11, color: 'var(--c-text3)',
                }}>
                  Approved by <strong style={{ color: 'var(--c-text2)' }}>{cn.approved_by}</strong>
                  {cn.approved_at && <> on {fmt.date(cn.approved_at)}</>}
                  {cn.applied_at && <> · Applied {fmt.date(cn.applied_at)}</>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {cn?.status === 'pending_review' && (
            <>
              <button className="btn btn-ghost" style={{ color: '#d63d3d' }}
                onClick={() => { onReject?.(cn.id); onClose() }}>
                <XCircle size={14} /> Reject
              </button>
              <button className="btn btn-success"
                onClick={() => { onApprove?.(cn.id); onClose() }}>
                <CheckCircle2 size={14} /> Approve
              </button>
            </>
          )}
          {cn?.status === 'approved' && (
            <button className="btn btn-primary"
              onClick={() => { onApply?.(cn.id); onClose() }}>
              <Send size={14} /> Apply to Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
