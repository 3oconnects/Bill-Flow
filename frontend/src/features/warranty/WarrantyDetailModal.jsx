import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Shield, X, FileText, User, Calendar, Hash, ExternalLink, Tag, Info, Clock,
} from 'lucide-react'
import { invoicesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Badge, Spinner } from '@/components/ui'

/**
 * Read-only view for a warranty claim.
 *
 * Shows the claim itself, the linked invoice (with its line items and totals),
 * and offers quick actions: open invoice page · update status · delete.
 */
export default function WarrantyDetailModal({ claim, onClose, onUpdate, onDelete }) {
  const navigate = useNavigate()

  const { data: invoice, isLoading: loadingInv } = useQuery({
    queryKey: ['invoice', claim?.invoice_id],
    queryFn:  () => invoicesApi.get(claim.invoice_id),
    enabled:  !!claim?.invoice_id,
  })

  const items = useMemo(
    () => Array.isArray(invoice?.items) ? invoice.items : [],
    [invoice],
  )

  // Highlight the specific line item this claim is about (matched by SKU or
  // description when no invoice_item_id is stored on the claim row).
  const claimedItem = useMemo(() => {
    if (!items.length) return null
    return items.find(it =>
      (claim.sku && it.sku === claim.sku) ||
      it.description === claim.product_name,
    ) || null
  }, [items, claim])

  const openInvoice = () => {
    if (!claim.invoice_id) return
    onClose()
    navigate(`/invoices/${claim.invoice_id}`)
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'var(--c-primary-lt)', color: 'var(--c-primary)',
            }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
                Warranty Claim — {claim.product_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                Filed by {claim.customer_name} on {fmt.date(claim.created_at)}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Header strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
            background: 'var(--c-surface2, var(--c-bg))', border: '1px solid var(--c-border)',
            borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12,
          }}>
            <div>
              <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Customer</div>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={11} color="var(--c-text3)" /> {claim.customer_name || '—'}
              </div>
              {(claim.customer_email || claim.customer_phone) && (
                <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {claim.customer_email && <span>{claim.customer_email}</span>}
                  {claim.customer_phone && <span>{claim.customer_phone}</span>}
                </div>
              )}
            </div>
            <div>
              <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Type</div>
              <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                {claim.warranty_type || 'warranty'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
              <Badge status={claim.status} />
            </div>
            <div>
              <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Filed</div>
              <div style={{ fontWeight: 600 }}>{fmt.date(claim.created_at)}</div>
            </div>
          </div>

          {/* Product card */}
          <div style={{
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: 8, padding: 12, marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Product
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{claim.product_name}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--c-text3)' }}>
              {claim.model_number && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={11} /> Model/HSN <span style={{ fontFamily: 'monospace', color: 'var(--c-text2)' }}>{claim.model_number}</span>
                </span>
              )}
              {claim.serial_number && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Hash size={11} /> S/N <span style={{ fontFamily: 'monospace', color: 'var(--c-text2)' }}>{claim.serial_number}</span>
                </span>
              )}
              {claim.purchase_date && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> Purchased <span style={{ color: 'var(--c-text2)' }}>{fmt.date(claim.purchase_date)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Linked invoice */}
          <div style={{
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: 8, padding: 12, marginBottom: 14,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={12} /> Linked Invoice
              </div>
              {claim.invoice_id && (
                <button className="btn btn-ghost btn-sm" onClick={openInvoice}>
                  <ExternalLink size={12} /> Open invoice
                </button>
              )}
            </div>

            {!claim.invoice_id ? (
              <div style={{ fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic' }}>
                No invoice was linked to this claim.
              </div>
            ) : loadingInv ? (
              <div style={{ padding: 16, textAlign: 'center' }}><Spinner size={16} /></div>
            ) : !invoice ? (
              <div style={{ fontSize: 12, color: 'var(--c-red)' }}>
                Linked invoice {claim.invoice_number || claim.invoice_id} was not found (it may have been deleted).
              </div>
            ) : (
              <>
                {/* Invoice header info */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
                  fontSize: 12, marginBottom: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>Invoice #</div>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-primary)' }}>
                      {invoice.number}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>Date</div>
                    <div style={{ fontWeight: 600 }}>{fmt.date(invoice.date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>Total</div>
                    <div style={{ fontWeight: 700 }}>{fmt.currency(invoice.total)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>Status</div>
                    <Badge status={invoice.status} />
                  </div>
                </div>

                {/* Items table — claimed item highlighted */}
                <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2.4fr 1fr .8fr 1fr 1fr',
                    background: 'var(--c-surface2, var(--c-bg))', fontSize: 10, fontWeight: 700,
                    color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em',
                    padding: '8px 10px',
                  }}>
                    <span>Description</span><span>SKU</span>
                    <span style={{ textAlign: 'right' }}>Qty</span>
                    <span style={{ textAlign: 'right' }}>Price</span>
                    <span style={{ textAlign: 'right' }}>Amount</span>
                  </div>
                  {items.map((it, i) => {
                    const isClaimed = claimedItem && it.id === claimedItem.id
                    return (
                      <div key={it.id || i} style={{
                        display: 'grid', gridTemplateColumns: '2.4fr 1fr .8fr 1fr 1fr',
                        padding: '10px', fontSize: 12,
                        borderTop: i ? '1px solid var(--c-border)' : 'none',
                        background: isClaimed ? 'var(--c-primary-lt)' : 'transparent',
                      }}>
                        <div style={{ fontWeight: isClaimed ? 700 : 500 }}>
                          {it.description || '—'}
                          {isClaimed && (
                            <span style={{
                              marginLeft: 8, fontSize: 9, padding: '2px 6px',
                              background: 'var(--c-primary)', color: '#fff', borderRadius: 99,
                              textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700,
                            }}>
                              Claimed
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11 }}>{it.sku || '—'}</div>
                        <div style={{ textAlign: 'right' }}>{Number(it.quantity)}</div>
                        <div style={{ textAlign: 'right' }}>{fmt.currency(it.unit_price)}</div>
                        <div style={{ textAlign: 'right', fontWeight: 600 }}>
                          {fmt.currency(it.amount)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Issue description */}
          <div style={{
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: 8, padding: 12, marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              Issue described by customer
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {claim.issue_description || <span style={{ color: 'var(--c-text3)', fontStyle: 'italic' }}>No description provided.</span>}
            </div>
          </div>

          {/* Resolution notes (if any) */}
          {claim.notes && (
            <div style={{
              background: 'var(--c-surface)', border: '1px solid var(--c-border)',
              borderRadius: 8, padding: 12, marginBottom: 6,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={11} /> Resolution / internal notes
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-text2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {claim.notes}
              </div>
            </div>
          )}

          {/* Audit footer */}
          <div style={{
            marginTop: 12, padding: '8px 12px', background: 'var(--c-surface2, var(--c-bg))',
            border: '1px solid var(--c-border)', borderRadius: 6,
            fontSize: 11, color: 'var(--c-text3)', display: 'flex',
            alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <Clock size={11} /> Filed {fmt.date(claim.created_at)}
            {claim.updated_at && claim.updated_at !== claim.created_at && (
              <>· Last updated {fmt.date(claim.updated_at)}</>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-ghost" style={{ color: 'var(--c-red)' }}
            onClick={() => { onDelete?.(claim); onClose() }}>
            Delete
          </button>
          <button className="btn btn-primary"
            onClick={() => { onUpdate?.(claim); onClose() }}>
            Update Status
          </button>
        </div>
      </div>
    </div>
  )
}
