import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goodsReturnsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { ReturnStatusBadge } from './GoodsReturnPage'
import { toast } from '@/store/toastStore'
import { Edit2, CheckCircle, FileText, Truck, Package, XCircle, User, Warehouse } from 'lucide-react'

const STATUS_FLOW = [
  { key: 'draft',     label: 'Draft',              icon: Edit2 },
  { key: 'submitted', label: 'Submitted',           icon: FileText },
  { key: 'approved',  label: 'Approved',            icon: CheckCircle },
  { key: 'returned',  label: 'Returned to Supplier', icon: Truck },
  { key: 'closed',    label: 'Closed',              icon: Package },
]

/**
 * Props:
 *   docId       – string
 *   onClose     – fn()
 *   onEdit      – fn(docId)   switch modal to edit mode
 *   onSetFooter – fn(ReactNode)  pushes action buttons into Modal footer
 */
export default function GoodsReturnDetail({ docId, onClose, onEdit, onSetFooter }) {
  const { user } = useAuthStore()
  const qc       = useQueryClient()
  const isAdmin  = ['owner','admin'].includes(user?.role)

  const [confirmModal, setConfirmModal] = useState(null)
  const [actionNote,   setActionNote]   = useState('')
  const [payAmount,    setPayAmount]    = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['goods-return', docId],
    queryFn:  () => goodsReturnsApi.get(docId),
    staleTime: 30_000,
    enabled:  Boolean(docId),
  })

  const mutate = (fn, msg) => useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goods-return', docId] })
      qc.invalidateQueries({ queryKey: ['goods-returns'] })
      qc.invalidateQueries({ queryKey: ['goods-returns-stats'] })
      toast.success(msg)
      setConfirmModal(null); setActionNote(''); setPayAmount('')
    },
    onError: e => toast.error(e.message),
  })

  const submitMut  = mutate(note => goodsReturnsApi.submit(docId, note),   'Submitted for approval')
  const approveMut = mutate(note => goodsReturnsApi.approve(docId, note),  'Return approved')
  const processMut = mutate(note => goodsReturnsApi.process(docId, note),  'Stock adjusted — goods dispatched')
  const closeMut   = mutate(note => goodsReturnsApi.close(docId, note),    'Return closed')
  const creditMut  = mutate(()   => goodsReturnsApi.creditNote(docId),     'Credit note generated')
  const cancelMut  = mutate(note => goodsReturnsApi.cancel(docId, note),   'Return cancelled')

  const ACTION_MAP = {
    submit:  { fn: n => submitMut.mutate(n),  label: 'Submit for Approval',    color: 'var(--c-orange)' },
    approve: { fn: n => approveMut.mutate(n), label: 'Approve Return',          color: 'var(--c-primary)' },
    process: { fn: n => processMut.mutate(n), label: 'Process & Return to Supplier', color: 'var(--c-purple)' },
    close:   { fn: n => closeMut.mutate(n),   label: 'Close Return',            color: 'var(--c-green)' },
    credit:  { fn: () => creditMut.mutate(),  label: 'Generate Credit Note',    color: 'var(--c-green)' },
    cancel:  { fn: n => cancelMut.mutate(n),  label: 'Cancel Return',           color: 'var(--c-red)' },
  }

  // ── Push footer buttons whenever data changes ──────────────────────
  useEffect(() => {
    if (!data) return
    const btns = []

    if (['draft','submitted'].includes(data.status)) {
      btns.push(<button key="edit" className="btn btn-ghost" onClick={() => onEdit?.(docId)}><Edit2 size={14}/> Edit</button>)
    }
    if (data.status === 'draft') {
      btns.push(<button key="sub" className="btn btn-primary" onClick={() => setConfirmModal('submit')}>Submit</button>)
    }
    if (isAdmin && data.status === 'submitted') {
      btns.push(
        <button key="can" className="btn btn-ghost" style={{ color:'var(--c-red)' }} onClick={() => setConfirmModal('cancel')}>Cancel</button>,
        <button key="app" className="btn btn-primary" onClick={() => setConfirmModal('approve')}>Approve</button>
      )
    }
    if (isAdmin && data.status === 'approved') {
      btns.push(<button key="proc" className="btn btn-primary" onClick={() => setConfirmModal('process')}>Process Return</button>)
    }
    if (isAdmin && data.status === 'returned') {
      if (!data.credit_note_no)
        btns.push(<button key="credit" className="btn btn-ghost" onClick={() => setConfirmModal('credit')}>Generate Credit Note</button>)
      btns.push(<button key="close" className="btn btn-primary" onClick={() => setConfirmModal('close')}>Close Return</button>)
    }
    if (!['closed','cancelled'].includes(data.status) && data.status !== 'returned') {
      if (!btns.find(b => b.key === 'can'))
        btns.push(<button key="can2" className="btn btn-ghost" style={{ color:'var(--c-red)' }} onClick={() => setConfirmModal('cancel')}>Cancel</button>)
    }

    onSetFooter?.(<div style={{ display:'flex', gap:8 }}>{btns}</div>)
  }, [data, isAdmin, docId])

  if (isLoading) return <div style={{ padding:40, textAlign:'center', color:'var(--c-text2)' }}>Loading…</div>
  if (!data)     return <div style={{ padding:40, textAlign:'center', color:'var(--c-red)' }}>Return not found.</div>

  const currentStep = STATUS_FLOW.findIndex(s => s.key === data.status)

  return (
    <div>
      {/* ── Status Timeline ─────────────────── */}
      {data.status !== 'cancelled' ? (
        <div className="card" style={{ padding:'12px 16px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            {STATUS_FLOW.map((step, i) => {
              const done    = i < currentStep
              const current = step.key === data.status
              const Icon    = step.icon
              return (
                <div key={step.key} style={{ display:'flex', alignItems:'center', flex: i < STATUS_FLOW.length-1 ? 1 : 'none' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'0 4px' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                      border:`2px solid ${done?'var(--c-green)':current?'var(--c-primary)':'var(--c-border)'}`,
                      background: done?'var(--c-green)':current?'var(--c-primary)':'white',
                      color: done||current?'white':'var(--c-text3)' }}>
                      <Icon size={12}/>
                    </div>
                    <span style={{ fontSize:9, fontWeight:current?700:400, whiteSpace:'nowrap', textAlign:'center',
                      color:current?'var(--c-primary)':done?'var(--c-green)':'var(--c-text3)' }}>
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length-1 && (
                    <div style={{ flex:1, height:2, background:done?'var(--c-green)':'var(--c-border)', margin:'0 2px', marginBottom:14 }}/>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ padding:'8px 14px', background:'var(--c-red-lt)', borderRadius:8, marginBottom:14, color:'var(--c-red)', fontWeight:600, fontSize:12 }}>
          ✕ This return was cancelled
        </div>
      )}

      {/* ── Main grid ───────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:14 }}>

        {/* Left */}
        <div>
          {/* Header info */}
          <div className="card" style={{ padding:'16px 18px', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:'monospace', fontSize:17, fontWeight:800, color:'var(--c-primary)' }}>{data.return_no}</div>
                <div style={{ fontSize:11, color:'var(--c-text2)', marginTop:2 }}>Created {fmt.date(data.created_at)} · {data.created_by_name}</div>
              </div>
              <ReturnStatusBadge status={data.status}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              <DBlock label="Vendor"       value={data.vendor_name} sub={data.vendor_gstin}/>
              <DBlock label="Return Date"  value={fmt.date(data.return_date)}/>
              <DBlock label="Warehouse"    value={data.warehouse}/>
              {data.base_receipt_no && <DBlock label="Base Receipt" value={data.base_receipt_no}/>}
              {data.transport_carrier && <DBlock label="Carrier" value={data.transport_carrier} sub={data.transport_doc_no}/>}
              {data.credit_note_no && <DBlock label="Credit Note" value={data.credit_note_no} sub={fmt.date(data.credit_note_date)} highlight/>}
              {data.approved_by_name && <DBlock label="Approved By" value={data.approved_by_name} sub={fmt.date(data.approved_at)}/>}
            </div>
            {data.remarks && (
              <div style={{ marginTop:12, padding:'8px 12px', background:'var(--c-surface2)', borderRadius:6, fontSize:12, color:'var(--c-text2)', borderLeft:'3px solid var(--c-primary)' }}>
                <strong>Remarks:</strong> {data.remarks}
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:12 }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--c-border)', fontWeight:700, fontSize:13 }}>Return Items</div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table" style={{ minWidth:600 }}>
                <thead>
                  <tr>
                    <th>#</th><th>Code</th><th>Item Name</th><th>Batch</th>
                    <th style={{ textAlign:'center' }}>Qty</th>
                    <th style={{ textAlign:'right' }}>Unit Price</th>
                    <th style={{ textAlign:'right' }}>Tax</th>
                    <th style={{ textAlign:'right' }}>Return Amt</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items?.map((it,i) => (
                    <tr key={it.id}>
                      <td style={{ color:'var(--c-text3)', fontSize:11 }}>{i+1}</td>
                      <td><code style={{ fontSize:11 }}>{it.item_code||'—'}</code></td>
                      <td style={{ fontWeight:500 }}>{it.item_name}</td>
                      <td style={{ fontSize:12, color:'var(--c-text2)' }}>{it.batch_no||'—'}</td>
                      <td style={{ textAlign:'center', fontWeight:600 }}>{it.qty_returned}</td>
                      <td style={{ textAlign:'right' }}>{fmt.currency(it.unit_price)}</td>
                      <td style={{ textAlign:'right', fontSize:12, color:'var(--c-text2)' }}>{fmt.currency(it.tax_amount)}</td>
                      <td style={{ textAlign:'right', fontWeight:700 }}>{fmt.currency(it.return_amount)}</td>
                      <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--c-orange-lt)', color:'var(--c-orange)', fontWeight:600 }}>{it.reason}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', padding:'10px 16px', borderTop:'1px solid var(--c-border)', gap:24 }}>
              {[['SUBTOTAL',data.subtotal],['TAX',data.tax_amount],['TOTAL',data.total_amount]].map(([l,v],i)=>(
                <div key={l} style={{ textAlign:'right', borderLeft:i===2?'2px solid var(--c-border)':'none', paddingLeft:i===2?20:0 }}>
                  <div style={{ fontSize:10, color:'var(--c-text2)', marginBottom:2 }}>{l}</div>
                  <div style={{ fontWeight:i===2?800:600, fontSize:i===2?16:13, color:i===2?'var(--c-primary)':'inherit' }}>{fmt.currency(v)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock adjustment status */}
          <div className="card" style={{ padding:'12px 16px', display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
              background:data.stock_adjusted?'var(--c-green-lt)':'var(--c-surface2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Package size={16} style={{ color:data.stock_adjusted?'var(--c-green)':'var(--c-text3)' }}/>
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>Stock Adjustment</div>
              <div style={{ fontSize:12, color:'var(--c-text2)' }}>
                {data.stock_adjusted
                  ? `✓ Stock reduced for ${data.items?.length} item(s). Inventory ledger updated.`
                  : 'Stock will be reduced when this return is processed.'}
              </div>
            </div>
            {data.stock_adjusted && <span className="badge badge-green" style={{ marginLeft:'auto' }}>Adjusted</span>}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* Financial summary */}
          <div className="card" style={{ padding:'14px 16px', marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Financial</div>
            {[
              ['Return Value',  fmt.currency(data.total_amount)],
              ['Credit Note',   data.credit_note_no || 'Not issued'],
              ['A/P Adjusted',  data.ap_adjusted ? 'Yes' : 'Pending'],
            ].map(([l,v])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--c-border)' }}>
                <span style={{ fontSize:12, color:'var(--c-text2)' }}>{l}</span>
                <span style={{ fontWeight:600, fontSize:12 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Activity log */}
          <div className="card" style={{ padding:'14px 16px' }}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Activity Log</div>
            {!data.logs?.length && <p style={{ fontSize:12, color:'var(--c-text3)', textAlign:'center', padding:'12px 0' }}>No activity yet</p>}
            {data.logs?.map((log,i)=>(
              <div key={log.id} style={{ display:'flex', gap:8, paddingBottom:i<data.logs.length-1?10:0, position:'relative' }}>
                {i<data.logs.length-1 && <div style={{ position:'absolute', left:9, top:18, bottom:0, width:1, background:'var(--c-border)' }}/>}
                <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--c-primary-lt)', color:'var(--c-primary)',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, zIndex:1 }}>
                  <User size={9}/>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600 }}>{log.action}</div>
                  {log.note && <div style={{ fontSize:11, color:'var(--c-text2)' }}>{log.note}</div>}
                  <div style={{ fontSize:10, color:'var(--c-text3)', marginTop:1 }}>{log.actor_name} · {fmt.date(log.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Inner confirm modal ──────────────── */}
      {confirmModal && (
        <div className="modal-overlay" style={{ zIndex:900 }} onClick={() => setConfirmModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{ACTION_MAP[confirmModal]?.label}</h2>
              <button className="action-icon-btn" onClick={() => setConfirmModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              {confirmModal === 'process' && (
                <p style={{ fontSize:13, color:'var(--c-text2)', marginBottom:14 }}>
                  This will reduce stock quantities in the warehouse and dispatch goods to the supplier.
                </p>
              )}
              {confirmModal !== 'credit' && (
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <textarea className="form-input" rows={2} value={actionNote}
                    onChange={e => setActionNote(e.target.value)} placeholder="Add a note…"/>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button className="btn btn-primary"
                style={{ background: ACTION_MAP[confirmModal]?.color }}
                onClick={() => ACTION_MAP[confirmModal]?.fn(actionNote)}>
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
      <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.6px', color:'var(--c-text3)', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:600, color:highlight?'var(--c-green)':'var(--c-text)' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--c-text2)' }}>{sub}</div>}
    </div>
  )
}
