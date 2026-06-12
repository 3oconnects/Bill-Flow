import { useQuery } from '@tanstack/react-query'
import {
  FileText, RefreshCw, X, Edit2, Play, Pause, Trash2,
  Calendar, CheckCircle2, AlertCircle, Clock, User,
} from 'lucide-react'
import { recurringApi } from '@/api'
import { fmt } from '@/lib/utils'
import { Spinner, Badge } from '@/components/ui'
import { FREQ_LABELS, monthlyEquivalent } from './recurringShared'

/**
 * Read-only detail view for a recurring template (invoice OR purchase).
 * Shows: header strip, line items, settings, run history, action buttons.
 *
 * Props:
 *   type:    'invoice' | 'purchase'
 *   id:      template id
 *   onEdit, onToggle, onDelete, onClose
 */
export default function RecurringDetailModal({ type, id, onClose, onEdit, onToggle, onDelete }) {
  const isInvoice = type === 'invoice'

  const tplQuery = useQuery({
    queryKey: [isInvoice ? 'recurring-invoice' : 'purchase-template', id],
    queryFn:  () => isInvoice ? recurringApi.getInvoice(id) : recurringApi.getTemplate(id),
    enabled:  !!id,
  })
  const runsQuery = useQuery({
    queryKey: ['recurring-runs', type, id],
    queryFn:  () => isInvoice ? recurringApi.invoiceRuns(id) : recurringApi.templateRuns(id),
    enabled:  !!id,
  })

  const tpl = tplQuery.data
  const runs = runsQuery.data || []

  const td = tpl?.template_data || {}
  const items = Array.isArray(td.items) ? td.items : []

  const monthly = tpl ? monthlyEquivalent(tpl.amount, tpl.frequency) : 0

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
              {isInvoice ? <FileText size={18} /> : <RefreshCw size={18} />}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{tpl?.name || 'Loading…'}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                {isInvoice ? 'Recurring Invoice Template' : 'Purchase Template'}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {tplQuery.isLoading || !tpl ? (
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
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>
                    {isInvoice ? 'Customer' : 'Vendor'}
                  </div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={11} color="var(--c-text3)" />
                    {tpl.customer_name || tpl.vendor_name || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Frequency</div>
                  <div style={{ fontWeight: 600 }}>{FREQ_LABELS[tpl.frequency] || tpl.frequency}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Per cycle</div>
                  <div style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{fmt.currency(tpl.amount)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                  <Badge
                    status={tpl.status === 'active' ? 'paid' : tpl.status === 'paused' ? 'sent' : 'draft'}
                    label={tpl.status === 'active' ? 'Active' : tpl.status === 'paused' ? 'Paused' : 'Draft'}
                  />
                </div>
              </div>

              {/* Schedule strip */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                marginBottom: 14, fontSize: 12,
              }}>
                <div style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: 8, padding: 10,
                }}>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Next Run</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                    <Calendar size={12} color="var(--c-text3)" />
                    {tpl.next_run ? new Date(tpl.next_run).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                </div>
                <div style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: 8, padding: 10,
                }}>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Last Run</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                    <Clock size={12} color="var(--c-text3)" />
                    {tpl.last_run ? new Date(tpl.last_run).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                  </div>
                </div>
                <div style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: 8, padding: 10,
                }}>
                  <div style={{ color: 'var(--c-text3)', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>End Date</div>
                  <div style={{ fontWeight: 600 }}>
                    {tpl.end_date ? new Date(tpl.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never ends'}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                Line items ({items.length})
              </div>
              {items.length === 0 ? (
                <div style={{
                  border: '1px dashed var(--c-border)', borderRadius: 8, padding: 18,
                  textAlign: 'center', color: 'var(--c-text3)', fontSize: 12,
                }}>
                  No line items in this template.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr 1fr',
                    background: 'var(--c-surface2, var(--c-bg))', fontSize: 10, fontWeight: 700,
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
                      padding: '10px', fontSize: 13,
                      borderTop: i ? '1px solid var(--c-border)' : 'none',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{it.description || '—'}</div>
                        {it.sku && <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--c-text3)', marginTop: 2 }}>{it.sku}</div>}
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

              {/* Footer info: totals + settings */}
              <div className="responsive-grid cols-2-1" style={{ alignItems: 'flex-start' }}>
                <div style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: 8, padding: 12, fontSize: 12,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                    Settings
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>Currency</div><div style={{ fontWeight: 600, textAlign: 'right' }}>{tpl.currency}</div>
                    {isInvoice && (
                      <>
                        <div>Auto-send</div>
                        <div style={{ fontWeight: 600, textAlign: 'right' }}>{tpl.auto_send ? 'Yes' : 'No'}</div>
                      </>
                    )}
                    {td.payment_terms && (
                      <>
                        <div>Payment terms</div>
                        <div style={{ fontWeight: 600, textAlign: 'right' }}>
                          {td.payment_terms === '0' ? 'Due on receipt' : `Net ${td.payment_terms} days`}
                        </div>
                      </>
                    )}
                    {td.payment_method && (
                      <>
                        <div>Payment method</div>
                        <div style={{ fontWeight: 600, textAlign: 'right' }}>{td.payment_method}</div>
                      </>
                    )}
                  </div>
                  {td.notes && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--c-border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--c-text3)', marginBottom: 4 }}>Notes</div>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--c-text2)' }}>{td.notes}</div>
                    </div>
                  )}
                </div>

                <div style={{
                  background: 'var(--c-surface2, var(--c-bg))', borderRadius: 8, padding: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Per cycle</span>
                    <span className="font-mono" style={{ fontWeight: 700 }}>{fmt.currency(tpl.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>Per month avg.</span>
                    <span className="font-mono" style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{fmt.currency(monthly)}</span>
                  </div>
                </div>
              </div>

              {/* Run history */}
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                  Run History ({runs.length})
                </div>
                {runsQuery.isLoading ? (
                  <div style={{ padding: 16, textAlign: 'center' }}><Spinner size={16} /></div>
                ) : runs.length === 0 ? (
                  <div style={{
                    border: '1px dashed var(--c-border)', borderRadius: 8, padding: 16,
                    textAlign: 'center', color: 'var(--c-text3)', fontSize: 12,
                  }}>
                    No runs yet. The first run will appear here after {tpl.next_run ? fmt.date(tpl.next_run) : 'the scheduled date'}.
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden' }}>
                    {runs.map((r, i) => (
                      <div key={r.id} style={{
                        display: 'grid', gridTemplateColumns: '120px 110px 1fr',
                        padding: '8px 12px', fontSize: 12,
                        borderTop: i ? '1px solid var(--c-border)' : 'none',
                        alignItems: 'center',
                      }}>
                        <div style={{ fontWeight: 600 }}>{fmt.date(r.run_date)}</div>
                        <div>
                          {r.status === 'success'
                            ? <span style={{ color: 'var(--c-green, #0a8754)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={12} /> Success
                              </span>
                            : r.status === 'failed'
                              ? <span style={{ color: 'var(--c-red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <AlertCircle size={12} /> Failed
                                </span>
                              : <span style={{ color: 'var(--c-text3)' }}>Skipped</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                          {r.generated_id ? `Invoice: ${r.generated_id.slice(0, 8)}…` : (r.error_message || '—')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {tpl && (
            <>
              <button className="btn btn-ghost" style={{ color: 'var(--c-red)' }}
                onClick={() => { onDelete?.(tpl); onClose() }}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-ghost"
                onClick={() => { onToggle?.(tpl) }}>
                {tpl.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
              </button>
              <button className="btn btn-primary"
                onClick={() => { onEdit?.(tpl); onClose() }}>
                <Edit2 size={14} /> Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
