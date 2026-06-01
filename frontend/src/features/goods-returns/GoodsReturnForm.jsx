import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goodsReturnsApi, vendorsApi, productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { ReturnStatusBadge } from './GoodsReturnPage'
import { toast } from '@/store/toastStore'
import { Save, Plus, Trash2, Package, Truck, Paperclip, RotateCcw, ChevronDown, Info } from 'lucide-react'

const WAREHOUSES = ['Main Warehouse', 'Secondary Warehouse', 'Cold Storage', 'Transit Hub']

function emptyItem() {
  return {
    _key: Date.now() + Math.random(),
    product_id: '', item_code: '', item_name: '', batch_no: '',
    qty_returned: 1, unit_price: 0, tax_rate: 18, tax_amount: 0,
    return_amount: 0, reason: 'Damaged in Transit',
  }
}

function calcItem(it) {
  const base = (it.qty_returned || 0) * (it.unit_price || 0)
  const tax  = base * ((it.tax_rate || 0) / 100)
  return { ...it, tax_amount: +tax.toFixed(2), return_amount: +(base + tax).toFixed(2) }
}

/**
 * Props:
 *   docId      – string | null  (null = create mode)
 *   onClose    – fn()
 *   onSuccess  – fn(id)  called after save → parent switches to detail
 *   onSetFooter – fn(ReactNode)  pushes buttons into Modal footer
 */
export default function GoodsReturnForm({ docId, onClose, onSuccess, onSetFooter }) {
  const qc     = useQueryClient()
  const isEdit = Boolean(docId)
  const [tab, setTab]               = useState('contents')
  const [showVDrop, setShowVDrop]   = useState(false)
  const [vendorQ, setVendorQ]       = useState('')
  const [form, setForm] = useState({
    vendor_id: '', vendor_name: '', vendor_gstin: '',
    base_receipt_no: '', return_date: fmt.dateInput(new Date()),
    warehouse: 'Main Warehouse',
    transport_carrier: '', transport_doc_no: '', transport_remarks: '',
    remarks: '',
  })
  const [items, setItems] = useState([emptyItem()])

  // ── Fetch existing doc on edit ─────────────────────────────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['goods-return', docId],
    queryFn:  () => goodsReturnsApi.get(docId),
    enabled:  isEdit,
  })

  const { data: vendors  = [] } = useQuery({ queryKey: ['vendors'],  queryFn: vendorsApi.list,  staleTime: 300_000 })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list, staleTime: 300_000 })

  useEffect(() => {
    if (existing && isEdit) {
      const { items: ei, logs, ...rest } = existing
      setForm({
        vendor_id:         rest.vendor_id        || '',
        vendor_name:       rest.vendor_name       || '',
        vendor_gstin:      rest.vendor_gstin      || '',
        base_receipt_no:   rest.base_receipt_no   || '',
        return_date:       fmt.dateInput(rest.return_date),
        warehouse:         rest.warehouse          || 'Main Warehouse',
        transport_carrier: rest.transport_carrier  || '',
        transport_doc_no:  rest.transport_doc_no   || '',
        transport_remarks: rest.transport_remarks  || '',
        remarks:           rest.remarks            || '',
      })
      if (ei?.length) setItems(ei.map(it => ({ ...it, _key: it.id })))
    }
  }, [existing, isEdit])

  // ── Totals ─────────────────────────────────────────────────────────
  const totals = items.reduce((acc, it) => {
    const c = calcItem(it)
    return { sub: acc.sub + (it.qty_returned || 0) * (it.unit_price || 0), tax: acc.tax + c.tax_amount, total: acc.total + c.return_amount }
  }, { sub: 0, tax: 0, total: 0 })

  // ── Mutations ──────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: d => goodsReturnsApi.create(d),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['goods-returns'] })
      qc.invalidateQueries({ queryKey: ['goods-returns-stats'] })
      toast.success(`Return ${r.return_no} created`)
      onSuccess?.(r.id)
    },
    onError: e => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: d => goodsReturnsApi.update(docId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goods-returns'] })
      qc.invalidateQueries({ queryKey: ['goods-return', docId] })
      toast.success('Return updated')
      onSuccess?.(docId)
    },
    onError: e => toast.error(e.message),
  })

  const saving = createMut.isPending || updateMut.isPending

  const handleSave = (status = 'draft') => {
    if (!form.vendor_name) return toast.error('Vendor is required')
    if (!form.return_date) return toast.error('Return date is required')
    if (!items.filter(i => i.item_name).length) return toast.error('Add at least one item')
    const payload = {
      ...form, status,
      items: items.filter(i => i.item_name).map(it => calcItem(it)),
    }
    isEdit ? updateMut.mutate(payload) : createMut.mutate(payload)
  }

  // ── Footer buttons (pushed into Modal footer) ──────────────────────
  useEffect(() => {
    const canSubmit = !isEdit || ['draft', 'submitted'].includes(existing?.status)
    onSetFooter?.(
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-ghost" onClick={() => handleSave('draft')} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
        </button>
        {canSubmit && (
          <button className="btn btn-primary" onClick={() => handleSave('submitted')} disabled={saving}>
            <RotateCcw size={14} /> Submit Return
          </button>
        )}
      </>
    )
  }, [form, items, saving, existing, isEdit])

  // ── Helpers ────────────────────────────────────────────────────────
  const upd       = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const updItem   = (idx, k, v) => setItems(prev => { const n=[...prev]; n[idx]=calcItem({...n[idx],[k]:v}); return n })
  const addItem   = () => setItems(p => [...p, emptyItem()])
  const remItem   = idx => { if (items.length > 1) setItems(p => p.filter((_, i) => i !== idx)) }
  const setItemFromProduct = (idx, p) => setItems(prev => {
    const n = [...prev]
    n[idx] = calcItem({ ...n[idx], product_id: p.id, item_code: p.sku || '', item_name: p.name,
      unit_price: parseFloat(p.purchase_price || p.unit_price || 0), tax_rate: parseFloat(p.tax_rate || 18) })
    return n
  })

  const filteredVendors = vendorQ
    ? vendors.filter(v => v.name?.toLowerCase().includes(vendorQ.toLowerCase()))
    : vendors.slice(0, 8)

  const canEdit = !isEdit || ['draft', 'submitted'].includes(existing?.status || 'draft')

  if (loadingExisting) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text2)' }}>Loading…</div>

  return (
    <div className="po-form-standard">

      {/* ── Header fields ─────────────────────────────── */}
      <div className="responsive-grid cols-1-1" style={{ marginBottom: 24, gap: 40 }}>

        {/* Left — Vendor */}
        <div className="form-section-compact">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>Vendor Details</div>

          <div className="form-group-row">
            <label>Vendor *</label>
            <div style={{ position: 'relative', flex: 1 }}>
              <div className="input-group-compact">
                <input className="form-input sm" placeholder="Search vendor…"
                  value={form.vendor_name || vendorQ}
                  onChange={e => { setVendorQ(e.target.value); upd('vendor_name', e.target.value); upd('vendor_id', ''); setShowVDrop(true) }}
                  onFocus={() => setShowVDrop(true)}
                  disabled={!canEdit} />
                <button className="btn-icon-sm" onClick={() => setShowVDrop(s => !s)}><ChevronDown size={13} /></button>
              </div>
              {showVDrop && filteredVendors.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 600,
                  background: 'white', border: '1px solid var(--c-border)', borderRadius: 8,
                  boxShadow: 'var(--shadow-md)', maxHeight: 200, overflowY: 'auto' }}>
                  {filteredVendors.map(v => (
                    <div key={v.id} className="dropdown-item"
                      style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
                      onClick={() => { upd('vendor_id', v.id); upd('vendor_name', v.name); upd('vendor_gstin', v.gstin || ''); setVendorQ(''); setShowVDrop(false) }}>
                      <div style={{ fontWeight: 600 }}>{v.name}</div>
                      {v.gstin && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>GSTIN: {v.gstin}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group-row">
            <label>GSTIN</label>
            <input className="form-input sm" value={form.vendor_gstin}
              onChange={e => upd('vendor_gstin', e.target.value)} disabled={!canEdit}
              placeholder="Auto-filled from vendor" />
          </div>

          <div className="form-group-row">
            <label>Base Receipt No</label>
            <div className="input-group-compact">
              <input className="form-input sm" value={form.base_receipt_no}
                onChange={e => upd('base_receipt_no', e.target.value)} disabled={!canEdit}
                placeholder="GRPO / Receipt reference" />
              <button className="btn-icon-sm" title="Link to Goods Receipt"><Package size={14} /></button>
            </div>
          </div>

          <div className="form-group-row">
            <label>Warehouse</label>
            <select className="form-select sm" value={form.warehouse}
              onChange={e => upd('warehouse', e.target.value)} disabled={!canEdit}>
              {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
            </select>
          </div>
        </div>

        {/* Right — Doc details */}
        <div className="form-section-compact">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>Return Details</div>

          <div className="form-group-row">
            <label>Return No</label>
            <input className="form-input sm disabled"
              value={isEdit ? existing?.return_no || '—' : 'Auto-generated'} readOnly
              style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }} />
          </div>

          {isEdit && (
            <div className="form-group-row">
              <label>Status</label>
              <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                <ReturnStatusBadge status={existing?.status} />
              </div>
            </div>
          )}

          <div className="form-group-row">
            <label>Return Date *</label>
            <input type="date" className="form-input sm" value={form.return_date}
              onChange={e => upd('return_date', e.target.value)} disabled={!canEdit} />
          </div>

          <div className="form-group-row">
            <label style={{ alignSelf: 'flex-start', marginTop: 6 }}>Remarks</label>
            <textarea className="form-input sm" rows={2} value={form.remarks}
              onChange={e => upd('remarks', e.target.value)} disabled={!canEdit}
              placeholder="Internal notes about this return…" />
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="tabs" style={{ marginBottom: 0, gap: 4 }}>
        {[['contents', 'Contents', Package], ['logistics', 'Logistics', Truck], ['attachments', 'Attachments', Paperclip]].map(([key, label, Icon]) => (
          <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            <Icon size={13} style={{ marginRight: 4 }} />{label}
          </button>
        ))}
      </div>

      {/* ── Tab body ──────────────────────────────────── */}
      <div className="tab-content-area" style={{ background: 'white', border: '1px solid var(--c-border)',
        borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: 0, overflow: 'hidden' }}>

        {/* Contents */}
        {tab === 'contents' && (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table className="line-items-table compact" style={{ minWidth: 820 }}>
                <thead>
                  <tr style={{ background: 'var(--c-surface2)' }}>
                    <th style={{ width: 32, textAlign: 'center' }}>#</th>
                    <th style={{ width: 100 }}>Item Code</th>
                    <th>Item Name</th>
                    <th style={{ width: 90 }}>Batch No</th>
                    <th style={{ width: 70, textAlign: 'right' }}>Qty</th>
                    <th style={{ width: 95, textAlign: 'right' }}>Unit Price</th>
                    <th style={{ width: 65, textAlign: 'center' }}>Tax%</th>
                    <th style={{ width: 85, textAlign: 'right' }}>Tax Amt</th>
                    <th style={{ width: 95, textAlign: 'right' }}>Ret. Amt</th>
                    <th style={{ width: 160 }}>Reason</th>
                    {canEdit && <th style={{ width: 32 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <GRItemRow key={item._key} item={item} idx={idx}
                      products={products} disabled={!canEdit}
                      onUpdate={(k, v) => updItem(idx, k, v)}
                      onRemove={() => remItem(idx)}
                      onSelectProduct={p => setItemFromProduct(idx, p)}
                    />
                  ))}
                  {canEdit && (
                    <tr>
                      <td colSpan={11} style={{ padding: '8px 12px' }}>
                        <button className="btn btn-ghost btn-xs" onClick={addItem}>
                          <Plus size={13} /> Add Line Item
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px',
              borderTop: '1px solid var(--c-border)', background: 'var(--c-surface2)' }}>
              <div style={{ minWidth: 240 }}>
                {[['Subtotal', totals.sub], ['Tax Amount', totals.tax], ['Total Value', totals.total]].map(([l,v],i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0',
                    borderTop: i===2?'2px solid var(--c-border)':'none', marginTop: i===2?4:0 }}>
                    <span style={{ fontSize:i===2?14:12, fontWeight:i===2?700:400, color:i===2?'var(--c-text)':'var(--c-text2)' }}>{l}</span>
                    <span style={{ fontSize:i===2?15:13, fontWeight:i===2?800:500 }}>{fmt.currency(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logistics */}
        {tab === 'logistics' && (
          <div className="responsive-grid cols-1-1" style={{ padding: 20, gap: 28 }}>
            <div className="form-section">
              <h4 className="section-title" style={{ marginBottom: 12 }}>Return Shipping</h4>
              <div className="form-group">
                <label className="form-label">Transport Carrier</label>
                <input type="text" className="form-input" value={form.transport_carrier}
                  onChange={e => upd('transport_carrier', e.target.value)} disabled={!canEdit}
                  placeholder="DHL, DTDC, BlueDart…" />
              </div>
              <div className="form-group">
                <label className="form-label">Transport / AWB No</label>
                <input type="text" className="form-input" value={form.transport_doc_no}
                  onChange={e => upd('transport_doc_no', e.target.value)} disabled={!canEdit}
                  placeholder="Tracking number" />
              </div>
              <div className="form-group">
                <label className="form-label">Transport Remarks</label>
                <textarea className="form-input" rows={3} value={form.transport_remarks}
                  onChange={e => upd('transport_remarks', e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div className="form-section">
              <h4 className="section-title" style={{ marginBottom: 12 }}>Dispatch From</h4>
              <div className="form-group">
                <label className="form-label">Warehouse</label>
                <select className="form-select" value={form.warehouse}
                  onChange={e => upd('warehouse', e.target.value)} disabled={!canEdit}>
                  {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--c-blue-lt)', borderRadius: 8,
                border: '1px solid var(--c-primary)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={15} style={{ color: 'var(--c-primary)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: 'var(--c-primary)', lineHeight: 1.6 }}>
                  Stock will be reduced from the selected warehouse when this return is processed and approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attachments */}
        {tab === 'attachments' && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--c-surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Paperclip size={20} style={{ color: 'var(--c-text3)' }} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No attachments</h3>
            <p style={{ fontSize: 13, color: 'var(--c-text2)' }}>Attach photos of damaged goods or vendor approval emails.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Item Row ───────────────────────────────────────────────────────────
function GRItemRow({ item, idx, products, disabled, onUpdate, onRemove, onSelectProduct }) {
  const [pq, setPQ]       = useState('')
  const [showDrop, setSD] = useState(false)
  const filtered = pq ? products.filter(p =>
    p.name?.toLowerCase().includes(pq.toLowerCase()) || p.sku?.toLowerCase().includes(pq.toLowerCase())
  ) : []

  return (
    <tr>
      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text3)' }}>{idx + 1}</td>
      <td><input className="table-input" value={item.item_code} onChange={e => onUpdate('item_code', e.target.value)} disabled={disabled} style={{ width: '100%' }} /></td>
      <td style={{ position: 'relative' }}>
        <input className="table-input" value={item.item_name}
          onChange={e => { onUpdate('item_name', e.target.value); setPQ(e.target.value); setSD(true) }}
          onFocus={() => setSD(true)} disabled={disabled} placeholder="Search…" style={{ width: '100%' }} />
        {showDrop && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 700, background: 'white',
            border: '1px solid var(--c-border)', borderRadius: 6, boxShadow: 'var(--shadow-md)',
            maxHeight: 150, overflowY: 'auto', minWidth: 200 }}>
            {filtered.slice(0, 8).map(p => (
              <div key={p.id} className="dropdown-item" style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
                onClick={() => { onSelectProduct(p); setPQ(''); setSD(false) }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: 'var(--c-text2)' }}>{p.sku} · ₹{p.purchase_price}</div>
              </div>
            ))}
          </div>
        )}
      </td>
      <td><input className="table-input" value={item.batch_no} onChange={e => onUpdate('batch_no', e.target.value)} disabled={disabled} /></td>
      <td><input className="table-input text-right" type="number" min="0.001" value={item.qty_returned} onChange={e => onUpdate('qty_returned', parseFloat(e.target.value)||0)} disabled={disabled} /></td>
      <td><input className="table-input text-right" type="number" min="0" value={item.unit_price} onChange={e => onUpdate('unit_price', parseFloat(e.target.value)||0)} disabled={disabled} /></td>
      <td>
        <select className="table-input" value={item.tax_rate} onChange={e => onUpdate('tax_rate', parseFloat(e.target.value))} disabled={disabled} style={{ textAlign: 'center' }}>
          {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--c-text2)', padding: '0 6px' }}>{fmt.currency(item.tax_amount)}</td>
      <td style={{ textAlign: 'right', fontWeight: 700, padding: '0 6px' }}>{fmt.currency(item.return_amount)}</td>
      <td>
        <select className="table-input" value={item.reason} onChange={e => onUpdate('reason', e.target.value)} disabled={disabled}>
          {['Damaged in Transit','Incorrect Item Delivered','Quality Failure','Excess Stock','Expired Product','Specification Mismatch','Duplicate Shipment','Other'].map(r => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </td>
      {!disabled && <td><button className="action-icon-btn red" onClick={onRemove}><Trash2 size={13} /></button></td>}
    </tr>
  )
}
