import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apApi } from '@/api'
import { fmt } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { APStatusBadge } from './tabs/APTabShell'
import { toast } from '@/store/toastStore'
import {
  Edit2, CheckCircle, FileText, DollarSign, XCircle,
  RotateCcw, User, Copy,
} from 'lucide-react'

// ── Workflow per type ──────────────────────────────────────────────────
const WORKFLOWS = {
  'invoices': [
    { key: 'draft',          label: 'Draft',         icon: Edit2 },
    { key: 'submitted',      label: 'Submitted',      icon: FileText },
    { key: 'approved',       label: 'Approved',       icon: CheckCircle },
    { key: 'partially_paid', label: 'Part. Paid',     icon: DollarSign },
    { key: 'paid',           label: 'Paid',           icon: DollarSign },
    { key: 'closed',         label: 'Closed',         icon: XCircle },
  ],
  'down-payments': [
    { key: 'draft',    label: 'Draft',    icon: Edit2 },
    { key: 'approved', label: 'Approved', icon: CheckCircle },
    { key: 'paid',     label: 'Paid',     icon: DollarSign },
    { key: 'closed',   label: 'Closed',   icon: XCircle },
  ],
  'credit-memos': [
    { key: 'draft',            label: 'Draft',    icon: Edit2 },
    { key: 'pending_approval', label: 'Pending',  icon: FileText },
    { key: 'approved',         label: 'Approved', icon: CheckCircle },
    { key: 'applied',          label: 'Applied',  icon: RotateCcw },
    { key: 'closed',           label: 'Closed',   icon: XCircle },
  ],
  'reserve-invoices': [
    { key: 'draft',     label: 'Draft',     icon: Edit2 },
    { key: 'submitted', label: 'Submitted', icon: FileText },
    { key: 'approved',  label: 'Approved',  icon: CheckCircle },
    { key: 'reserved',  label: 'Reserved',  icon: FileText },
    { key: 'converted', label: 'Converted', icon: Copy },
    { key: 'closed',    label: 'Closed',    icon: XCircle },
  ],
}

const TYPE_LABELS = {
  'invoices':         'A/P Invoice',
  'down-payments':    'Down Payment',
  'credit-memos':     'Credit Memo',
  'reserve-invoices': 'Reserve Invoice',
}

/**
 * Props:
 *   type        – doc type string
 *   docId       – string
 *   onClose     – fn()
 *   onEdit      – fn(docId) to switch drawer to edit mode
 *   onSetFooter – fn(ReactNode) for drawer header buttons
 */
export default function APDetail({ type, docId, onClose, onEdit, onSetFooter }) {
  const { user }  = useAuthStore()
  const qc        = useQueryClient()
  const [modal, setModal]         = useState(null)
  const [modalNote, setModalNote] = useState('')
  const [payAmount, setPayAmount] = useState('')

  const isAdmin  = ['owner','admin'].includes(user?.role)
  const workflow = WORKFLOWS[type] || WORKFLOWS['invoices']

  const { data, isLoading } = useQuery({
    queryKey: ['ap-doc', type, docId],
    queryFn:  () => apApi.get(type, docId),
    staleTime: 30_000,
    enabled:  Boolean(docId),
  })

  const statusMut = useMutation({
    mutationFn: ({ status, amount, note }) => apApi.updateStatus(type, docId, { status, amount, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-doc', type, docId] })
      qc.invalidateQueries({ queryKey: ['ap-list', type] })
      qc.invalidateQueries({ queryKey: ['ap-stats', type] })
      toast.success('Status updated')
      setModal(null); setModalNote(''); setPayAmount('')
    },
    onError: e => toast.error(e.message),
  })

  const cancelMut = useMutation({
    mutationFn: reason => apApi.cancel(type, docId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-doc', type, docId] })
      qc.invalidateQueries({ queryKey: ['ap-list', type] })
      qc.invalidateQueries({ queryKey: ['ap-stats', type] })
      toast.success('Cancelled')
      setModal(null)
    },
    onError: e => toast.error(e.message),
  })

  // Push header action buttons into the drawer
  useEffect(() => {
    if (!data) return
    const actions = []

    if (['draft','submitted'].includes(data.status)) {
      actions.push(
        <button key="edit" className="btn btn-ghost btn-sm" onClick={() => onEdit?.(docId)}>
          <Edit2 size={13} /> Edit
        </button>
      )
    }
    if (data.status === 'draft') {
      actions.push(
        <button key="sub" className="btn btn-primary btn-sm" onClick={() => statusMut.mutate({ status: 'submitted' })}>
          Submit
        </button>
      )
    }
    if (isAdmin && (data.status === 'submitted' || data.status === 'pending_approval')) {
      actions.push(
        <button key="app" className="btn btn-primary btn-sm" onClick={() => setModal('approve')}>Approve</button>
      )
    }
    if (isAdmin && data.status === 'approved') {
      if (type === 'invoices' || type === 'down-payments') {
        actions.push(<button key="pay" className="btn btn-primary btn-sm" onClick={() => setModal('pay')}>Record Payment</button>)
      }
      if (type === 'reserve-invoices') {
        actions.push(
          <button key="res" className="btn btn-ghost btn-sm" onClick={() => statusMut.mutate({ status: 'reserved' })}>Mark Reserved</button>,
          <button key="conv" className="btn btn-primary btn-sm" onClick={() => setModal('convert')}>Convert to Invoice</button>
        )
      }
      if (type === 'credit-memos') {
        actions.push(<button key="apply" className="btn btn-primary btn-sm" onClick={() => setModal('apply')}>Apply Credit</button>)
      }
    }
    if (type === 'reserve-invoices' && data.status === 'reserved') {
      actions.push(<button key="conv2" className="btn btn-primary btn-sm" onClick={() => setModal('convert')}>Convert to Invoice</button>)
    }
    if (data.status === 'paid' && type === 'invoices' && isAdmin) {
      actions.push(<button key="cl" className="btn btn-ghost btn-sm" onClick={() => statusMut.mutate({ status: 'closed' })}>Close</button>)
    }
    if (data.status === 'applied' && type === 'credit-memos' && isAdmin) {
      actions.push(<button key="cl" className="btn btn-ghost btn-sm" onClick={() => statusMut.mutate({ status: 'closed' })}>Close Memo</button>)
    }
    if (!['closed','cancelled','converted'].includes(data.status)) {
      actions.push(
        <button key="can" className="btn btn-ghost btn-sm" style={{ color: 'var(--c-red)' }}
          onClick={() => setModal('cancel')}>Cancel</button>
      )
    }

    onSetFooter?.(
      <div style={{ display: 'flex', gap: 6 }}>
        {actions}
      </div>
    )
  }, [data, isAdmin, type, docId])

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text2)', fontSize: 13 }}>Loading…</div>
  }
  if (!data) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-red)', fontSize: 13 }}>Document not found.</div>
  }

  const currentStep = workflow.findIndex(s => s.key === data.status)
  const hasItems    = data.items?.length > 0

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── Workflow Timeline ──────────────────── */}
      {data.status !== 'cancelled' ? (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {workflow.map((step, i) => {
              const done    = i < currentStep
              const current = step.key === data.status
              const Icon    = step.icon
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < workflow.length - 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 4px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${done ? 'var(--c-green)' : current ? 'var(--c-primary)' : 'var(--c-border)'}`,
                      background: done ? 'var(--c-green)' : current ? 'var(--c-primary)' : 'white',
                      color: done||current ? 'white' : 'var(--c-text3)' }}>
                      <Icon size={12} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: current?700:400, whiteSpace: 'nowrap', textAlign: 'center',
                      color: current ? 'var(--c-primary)' : done ? 'var(--c-green)' : 'var(--c-text3)' }}>
                      {step.label}
                    </span>
                  </div>
                  {i < workflow.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: done ? 'var(--c-green)' : 'var(--c-border)', margin: '0 2px', marginBottom: 14 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding: '8px 14px', background: 'var(--c-red-lt)', borderRadius: 8, marginBottom: 14, color: 'var(--c-red)', fontWeight: 600, fontSize: 12 }}>
          ✕ This document was cancelled
        </div>
      )}

      {/* ── Header Info ───────────────────────── */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 800, color: 'var(--c-primary)' }}>{data.doc_no}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 2 }}>
              {TYPE_LABELS[type]} · {fmt.date(data.created_at)} · {data.created_by_name}
            </div>
          </div>
          <APStatusBadge status={data.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <DBlock label="Vendor"       value={data.vendor_name}  sub={data.vendor_gstin} />
          <DBlock label="Currency"     value={data.currency} />
          <DBlock label="Payment Terms" value={data.payment_terms || '—'} />
          {data.vendor_inv_no   && <DBlock label="Vendor Invoice No" value={data.vendor_inv_no} />}
          {data.po_ref          && <DBlock label="PO Reference"      value={data.po_ref} />}
          {data.gr_ref          && <DBlock label="GR Reference"      value={data.gr_ref} />}
          {data.ref_invoice_no  && <DBlock label="Ref Invoice"       value={data.ref_invoice_no} />}
          {data.vendor_ref_no   && <DBlock label="Vendor Reference"  value={data.vendor_ref_no} />}
          {data.invoice_date    && <DBlock label="Invoice Date"      value={fmt.date(data.invoice_date)} />}
          {data.payment_date    && <DBlock label="Payment Date"      value={fmt.date(data.payment_date)} />}
          {data.credit_date     && <DBlock label="Credit Date"       value={fmt.date(data.credit_date)} />}
          {data.due_date        && <DBlock label="Due Date"          value={fmt.date(data.due_date)}
            highlight={new Date(data.due_date) < new Date() && !['paid','closed','cancelled'].includes(data.status)} />}
          {data.reason          && <DBlock label="Credit Reason"     value={data.reason} />}
          {data.department      && <DBlock label="Department"        value={data.department} />}
          {data.approved_by_name && <DBlock label="Approved By"      value={data.approved_by_name} sub={fmt.date(data.approved_at)} />}
        </div>
        {data.notes && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--c-surface2)', borderRadius: 6, fontSize: 12, color: 'var(--c-text2)', borderLeft: '3px solid var(--c-primary)' }}>
            <strong>Notes:</strong> {data.notes}
          </div>
        )}
      </div>

      {/* ── Items Table ───────────────────────── */}
      {hasItems && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--c-border)', fontWeight: 700, fontSize: 13 }}>Line Items</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>#</th><th>Code</th><th>Item Name</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Disc%</th>
                  <th style={{ textAlign: 'right' }}>Tax</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={it.id}>
                    <td style={{ color: 'var(--c-text3)', fontSize: 11 }}>{i+1}</td>
                    <td><code style={{ fontSize: 11 }}>{it.item_code || '—'}</code></td>
                    <td style={{ fontWeight: 500 }}>{it.item_name}{it.description ? <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{it.description}</div> : null}</td>
                    <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{fmt.currency(it.unit_price)}</td>
                    <td style={{ textAlign: 'right', fontSize: 12 }}>{it.discount || 0}%</td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--c-text2)' }}>{fmt.currency(it.tax_amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt.currency(it.line_total || it.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', borderTop: '1px solid var(--c-border)', gap: 24 }}>
            {[['SUBTOTAL', data.subtotal], ['TAX', data.tax_amount], ['TOTAL', data.total_amount]].map(([l,v],i) => (
              <div key={l} style={{ textAlign: 'right', borderLeft: i===2?'2px solid var(--c-border)':'none', paddingLeft: i===2?20:0 }}>
                <div style={{ fontSize: 10, color: 'var(--c-text2)', marginBottom: 2 }}>{l}</div>
                <div style={{ fontWeight: i===2?800:600, fontSize: i===2?16:14, color: i===2?'var(--c-primary)':'inherit' }}>{fmt.currency(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Down Payment Financials ────────────── */}
      {!hasItems && data.amount !== undefined && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Payment Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <DBlock label="Base Amount"  value={fmt.currency(data.amount)} />
            {data.pct_amount && <DBlock label="Percentage" value={`${data.pct_amount}%`} />}
            <DBlock label="Tax Amount"   value={fmt.currency(data.tax_amount)} />
            <DBlock label="Total"        value={fmt.currency(data.total_amount)} highlight />
            {data.paid_amount !== undefined && <DBlock label="Paid" value={fmt.currency(data.paid_amount)} />}
          </div>
        </div>
      )}

      {/* ── Financial Summary + Credit tracking ── */}
      {(data.balance_due !== undefined || data.balance_amount !== undefined || data.applied_amount !== undefined) && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Financial Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              data.total_amount !== undefined  && ['Total Amount',     fmt.currency(data.total_amount),   false],
              data.paid_amount  !== undefined  && ['Paid Amount',      fmt.currency(data.paid_amount),    false],
              data.balance_due  !== undefined  && ['Balance Due',      fmt.currency(data.balance_due),    true],
              data.applied_amount !== undefined && ['Applied Amount',  fmt.currency(data.applied_amount), false],
              data.balance_amount !== undefined && ['Available Credit',fmt.currency(data.balance_amount), true],
            ].filter(Boolean).map(([l, v, hi]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--c-border)' }}>
                <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{l}</span>
                <span style={{ fontWeight: 600, color: hi ? 'var(--c-red)' : 'inherit' }}>{v}</span>
              </div>
            ))}
          </div>
          {data.converted_to_id && (
            <div style={{ marginTop: 10, padding: '7px 12px', background: 'var(--c-green-lt)', borderRadius: 6, fontSize: 12, color: 'var(--c-green)', fontWeight: 600 }}>
              ✓ Converted to A/P Invoice
            </div>
          )}
        </div>
      )}

      {/* ── Activity Log ──────────────────────── */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Activity Log</div>
        {!data.logs?.length
          ? <p style={{ fontSize: 12, color: 'var(--c-text3)', padding: '12px 0', textAlign: 'center' }}>No activity yet</p>
          : data.logs.map((log, i) => (
            <div key={log.id} style={{ display: 'flex', gap: 8, paddingBottom: i < data.logs.length-1 ? 12 : 0, position: 'relative' }}>
              {i < data.logs.length-1 && <div style={{ position: 'absolute', left: 9, top: 18, bottom: 0, width: 1, background: 'var(--c-border)' }} />}
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--c-primary-lt)', color: 'var(--c-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, zIndex: 1 }}>
                <User size={9} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{log.action}</div>
                {log.note && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{log.note}</div>}
                <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 1 }}>{log.actor_name} · {fmt.date(log.created_at)}</div>
              </div>
            </div>
          ))
        }
      </div>

      {/* ── Action Modal ──────────────────────── */}
      {modal && (
        <div className="modal-overlay" style={{ zIndex: 800 }} onClick={() => setModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modal==='approve' ? 'Approve Document' : modal==='pay' ? 'Record Payment' :
                 modal==='apply' ? 'Apply Credit' : modal==='convert' ? 'Convert to A/P Invoice' : 'Cancel Document'}
              </h2>
              <button className="action-icon-btn" onClick={() => setModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {(modal==='pay' || modal==='apply') && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Amount *</label>
                  <input type="number" className="form-input" value={payAmount}
                    onChange={e => setPayAmount(e.target.value)} placeholder="0.00" min="0.01" />
                  <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 4 }}>
                    {modal==='pay' ? `Outstanding: ${fmt.currency(data.balance_due)}` : `Total: ${fmt.currency(data.total_amount)}`}
                  </div>
                </div>
              )}
              {modal==='convert' && (
                <p style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 14 }}>
                  A new A/P Invoice will be created from <strong>{data.doc_no}</strong> and this reserve invoice will be marked as converted.
                </p>
              )}
              {!['convert'].includes(modal) && (
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <textarea className="form-input" rows={2} value={modalNote}
                    onChange={e => setModalNote(e.target.value)} placeholder="Add a note…" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary"
                style={{ background: modal==='cancel' ? 'var(--c-red)' : undefined }}
                disabled={statusMut.isPending || cancelMut.isPending}
                onClick={() => {
                  if (modal==='cancel')   return cancelMut.mutate(modalNote)
                  if (modal==='approve')  return statusMut.mutate({ status:'approved', note:modalNote })
                  if (modal==='pay')      return statusMut.mutate({ status:'record_payment', amount:parseFloat(payAmount), note:modalNote })
                  if (modal==='apply')    return statusMut.mutate({ status:'apply', amount:parseFloat(payAmount), note:modalNote })
                  if (modal==='convert')  return statusMut.mutate({ status:'convert' })
                }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DBlock({ label, value, sub, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--c-text3)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: highlight ? 'var(--c-primary)' : 'var(--c-text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{sub}</div>}
    </div>
  )
}
