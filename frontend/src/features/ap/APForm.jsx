import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apApi, vendorsApi, productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { APStatusBadge } from './tabs/APTabShell'
import { toast } from '@/store/toastStore'
import { Save, Plus, Trash2, ChevronDown, Info, RotateCcw } from 'lucide-react'

// ── Config per doc type ────────────────────────────────────────────────
const TYPE_CONFIG = {
  'invoices': {
    title: 'A/P Invoice', hasItems: true,
    dateField: 'invoice_date', dateLabel: 'Invoice Date',
    extraFields: ['vendor_inv_no', 'po_ref', 'gr_ref', 'posting_date', 'due_date', 'discount_pct'],
    submitLabel: 'Submit Invoice',
  },
  'down-payments': {
    title: 'A/P Down Payment', hasItems: false,
    dateField: 'payment_date', dateLabel: 'Payment Date',
    extraFields: ['po_ref', 'due_date', 'pct_amount', 'tax_rate'],
    submitLabel: 'Submit Request',
  },
  'credit-memos': {
    title: 'A/P Credit Memo', hasItems: true,
    dateField: 'credit_date', dateLabel: 'Credit Date',
    extraFields: ['ref_invoice_no', 'posting_date', 'reason'],
    creditReasons: ['Return Goods','Price Adjustment','Quantity Adjustment','Damaged Goods','Duplicate Invoice','Overpayment Adjustment'],
    submitLabel: 'Submit Memo',
  },
  'reserve-invoices': {
    title: 'A/P Reserve Invoice', hasItems: true,
    dateField: 'invoice_date', dateLabel: 'Invoice Date',
    extraFields: ['vendor_ref_no','po_ref','gr_ref','posting_date','due_date','department','cost_center','project','description'],
    submitLabel: 'Submit Reserve Invoice',
  },
}

function emptyItem() {
  return { _key: Date.now() + Math.random(), product_id: '', item_code: '', item_name: '', description: '', quantity: 1, unit_price: 0, discount: 0, tax_rate: 18, tax_amount: 0, line_total: 0 }
}

function calcItem(it) {
  const base    = (it.quantity || 0) * (it.unit_price || 0)
  const discAmt = base * ((it.discount || 0) / 100)
  const taxable = base - discAmt
  const tax     = taxable * ((it.tax_rate || 0) / 100)
  return { ...it, tax_amount: +tax.toFixed(2), line_total: +(taxable + tax).toFixed(2) }
}

function blankForm(cfg) {
  return {
    vendor_id: '', vendor_name: '', vendor_gstin: '', currency: 'INR',
    payment_terms: '', notes: '', amount: 0, tax_rate: 18,
    ...cfg.extraFields.reduce((a, k) => ({ ...a, [k]: '' }), {}),
    [cfg.dateField]: fmt.dateInput(new Date()),
  }
}

/**
 * Props:
 *   type     – 'invoices' | 'down-payments' | 'credit-memos' | 'reserve-invoices'
 *   docId    – string | null (null = create mode)
 *   onClose  – fn()
 *   onSuccess – fn(id) called after save
 *   onSetFooter – fn(ReactNode) to push header actions into the drawer header
 */
export default function APForm({ type, docId, onClose, onSuccess, onSetFooter }) {
  const qc     = useQueryClient()
  const cfg    = TYPE_CONFIG[type] || TYPE_CONFIG['invoices']
  const isEdit = Boolean(docId)

  const [form, setForm]       = useState(() => blankForm(cfg))
  const [items, setItems]     = useState([emptyItem()])
  const [showVDrop, setShowVDrop] = useState(false)
  const [vendorQ, setVendorQ]     = useState('')

  // Reset form whenever type or docId changes
  useEffect(() => {
    setForm(blankForm(cfg))
    setItems([emptyItem()])
    setVendorQ('')
    setShowVDrop(false)
  }, [type, docId])

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['ap-doc', type, docId],
    queryFn: () => apApi.get(type, docId),
    enabled: isEdit,
  })

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list, staleTime: 300_000 })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list, staleTime: 300_000 })

  useEffect(() => {
    if (existing && isEdit) {
      const { items: ei, logs, ...rest } = existing
      const mapped = cfg.extraFields.reduce((a, k) => ({ ...a, [k]: rest[k] || '' }), {})
      setForm({
        vendor_id: rest.vendor_id || '', vendor_name: rest.vendor_name || '',
        vendor_gstin: rest.vendor_gstin || '', currency: rest.currency || 'INR',
        payment_terms: rest.payment_terms || '', notes: rest.notes || '',
        amount: rest.amount || 0, tax_rate: rest.tax_rate || 18,
        [cfg.dateField]: fmt.dateInput(rest[cfg.dateField]),
        ...mapped,
      })
      if (ei?.length) setItems(ei.map(it => ({ ...it, _key: it.id })))
    }
  }, [existing, isEdit])

  const totals = cfg.hasItems
    ? items.reduce((acc, it) => {
        const c = calcItem(it)
        return { sub: acc.sub + (it.quantity||0)*(it.unit_price||0), tax: acc.tax + c.tax_amount, total: acc.total + c.line_total }
      }, { sub: 0, tax: 0, total: 0 })
    : null

  const createMut = useMutation({
    mutationFn: d => apApi.create(type, d),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['ap-list', type] })
      qc.invalidateQueries({ queryKey: ['ap-stats', type] })
      toast.success(`${cfg.title} created`)
      onSuccess?.(r.id)
    },
    onError: e => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: d => apApi.update(type, docId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ap-list', type] })
      qc.invalidateQueries({ queryKey: ['ap-doc', type, docId] })
      qc.invalidateQueries({ queryKey: ['ap-stats', type] })
      toast.success('Updated successfully')
      onSuccess?.(docId)
    },
    onError: e => toast.error(e.message),
  })

  const saving = createMut.isPending || updateMut.isPending

  const handleSave = (status = 'draft') => {
    if (!form.vendor_name) return toast.error('Vendor is required')
    if (!form[cfg.dateField]) return toast.error(`${cfg.dateLabel} is required`)
    if (cfg.hasItems && !items.filter(i => i.item_name).length) return toast.error('Add at least one item')
    const payload = {
      ...form, status,
      ...(cfg.hasItems ? { items: items.filter(i => i.item_name).map(it => calcItem(it)) } : {}),
    }
    isEdit ? updateMut.mutate(payload) : createMut.mutate(payload)
  }

  // Push action buttons into the drawer header
  useEffect(() => {
    const canSubmit = !isEdit || ['draft','submitted'].includes(existing?.status)
    onSetFooter?.(
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => handleSave('draft')} disabled={saving}>
          <Save size={13} /> {saving ? 'Saving…' : 'Save Draft'}
        </button>
        {canSubmit && (
          <button className="btn btn-primary btn-sm" onClick={() => handleSave('submitted')} disabled={saving}>
            <RotateCcw size={13} /> {cfg.submitLabel}
          </button>
        )}
      </div>
    )
  }, [form, items, saving, existing])

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const updItem = (idx, k, v) => setItems(prev => { const n = [...prev]; n[idx] = calcItem({ ...n[idx], [k]: v }); return n })
  const addItem = () => setItems(p => [...p, emptyItem()])
  const remItem = idx => { if (items.length > 1) setItems(p => p.filter((_, i) => i !== idx)) }
  const setItemFromProduct = (idx, p) => setItems(prev => {
    const n = [...prev]
    n[idx] = calcItem({ ...n[idx], product_id: p.id, item_code: p.sku || '', item_name: p.name, unit_price: parseFloat(p.purchase_price || p.unit_price || 0), tax_rate: parseFloat(p.tax_rate || 18) })
    return n
  })

  const filteredVendors = vendorQ
    ? vendors.filter(v => v.name?.toLowerCase().includes(vendorQ.toLowerCase()))
    : vendors.slice(0, 8)

  const canEdit = !isEdit || ['draft','submitted'].includes(existing?.status)

  if (loadingExisting) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text2)', fontSize: 13 }}>Loading…</div>
  }

  return (
    <div className="po-form-standard" style={{ paddingBottom: 40 }}>

      {/* ── Header Meta ─────────────────────────── */}
      <div className="responsive-grid cols-1-1" style={{ gap: 32, marginBottom: 24 }}>

        {/* Left: Vendor */}
        <div className="form-section-compact">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Vendor</div>

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

          {cfg.extraFields.includes('vendor_inv_no') && (
            <div className="form-group-row">
              <label>Vendor Invoice No</label>
              <input className="form-input sm" value={form.vendor_inv_no}
                onChange={e => upd('vendor_inv_no', e.target.value)} disabled={!canEdit}
                placeholder="Supplier's invoice number" />
            </div>
          )}
          {cfg.extraFields.includes('vendor_ref_no') && (
            <div className="form-group-row">
              <label>Vendor Reference</label>
              <input className="form-input sm" value={form.vendor_ref_no}
                onChange={e => upd('vendor_ref_no', e.target.value)} disabled={!canEdit} />
            </div>
          )}
          {cfg.extraFields.includes('po_ref') && (
            <div className="form-group-row">
              <label>PO Reference</label>
              <input className="form-input sm" value={form.po_ref}
                onChange={e => upd('po_ref', e.target.value)} disabled={!canEdit} />
            </div>
          )}
          {cfg.extraFields.includes('gr_ref') && (
            <div className="form-group-row">
              <label>GR Reference</label>
              <input className="form-input sm" value={form.gr_ref}
                onChange={e => upd('gr_ref', e.target.value)} disabled={!canEdit} />
            </div>
          )}
          {cfg.extraFields.includes('ref_invoice_no') && (
            <div className="form-group-row">
              <label>Ref Invoice No</label>
              <input className="form-input sm" value={form.ref_invoice_no}
                onChange={e => upd('ref_invoice_no', e.target.value)} disabled={!canEdit}
                placeholder="Related A/P invoice" />
            </div>
          )}
        </div>

        {/* Right: Doc details */}
        <div className="form-section-compact">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Details</div>

          <div className="form-group-row">
            <label>Doc No</label>
            <input className="form-input sm disabled"
              value={isEdit ? existing?.doc_no || '—' : 'Auto-generated'} readOnly
              style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }} />
          </div>

          {isEdit && (
            <div className="form-group-row">
              <label>Status</label>
              <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                <APStatusBadge status={existing?.status} />
              </div>
            </div>
          )}

          <div className="form-group-row">
            <label>{cfg.dateLabel} *</label>
            <input type="date" className="form-input sm" value={form[cfg.dateField]}
              onChange={e => upd(cfg.dateField, e.target.value)} disabled={!canEdit} />
          </div>

          {cfg.extraFields.includes('posting_date') && (
            <div className="form-group-row">
              <label>Posting Date</label>
              <input type="date" className="form-input sm" value={form.posting_date}
                onChange={e => upd('posting_date', e.target.value)} disabled={!canEdit} />
            </div>
          )}
          {cfg.extraFields.includes('due_date') && (
            <div className="form-group-row">
              <label>Due Date</label>
              <input type="date" className="form-input sm" value={form.due_date}
                onChange={e => upd('due_date', e.target.value)} disabled={!canEdit} />
            </div>
          )}

          <div className="form-group-row">
            <label>Currency</label>
            <select className="form-select sm" value={form.currency}
              onChange={e => upd('currency', e.target.value)} disabled={!canEdit}>
              {['INR','USD','EUR','GBP','AED'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group-row">
            <label>Payment Terms</label>
            <select className="form-select sm" value={form.payment_terms}
              onChange={e => upd('payment_terms', e.target.value)} disabled={!canEdit}>
              <option value="">Select…</option>
              {['Net 15','Net 30','Net 45','Net 60','Immediate','COD'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {cfg.extraFields.includes('reason') && cfg.creditReasons && (
            <div className="form-group-row">
              <label>Reason *</label>
              <select className="form-select sm" value={form.reason || 'Return Goods'}
                onChange={e => upd('reason', e.target.value)} disabled={!canEdit}>
                {cfg.creditReasons.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          )}

          {cfg.extraFields.includes('department') && (
            <>
              <div className="form-group-row"><label>Department</label><input className="form-input sm" value={form.department} onChange={e => upd('department', e.target.value)} disabled={!canEdit} /></div>
              <div className="form-group-row"><label>Cost Center</label><input className="form-input sm" value={form.cost_center} onChange={e => upd('cost_center', e.target.value)} disabled={!canEdit} /></div>
              <div className="form-group-row"><label>Project</label><input className="form-input sm" value={form.project} onChange={e => upd('project', e.target.value)} disabled={!canEdit} /></div>
            </>
          )}
        </div>
      </div>

      {/* ── Down Payment Amount Fields ─────────── */}
      {!cfg.hasItems && (
        <div className="card" style={{ padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>Payment Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Amount *</label>
              <input type="number" className="form-input" value={form.amount || 0}
                onChange={e => upd('amount', e.target.value)} disabled={!canEdit} min="0" step="0.01" />
            </div>
            <div className="form-group">
              <label className="form-label">Percentage (%)</label>
              <input type="number" className="form-input" value={form.pct_amount || ''}
                onChange={e => upd('pct_amount', e.target.value)} disabled={!canEdit} placeholder="e.g. 30" />
            </div>
            <div className="form-group">
              <label className="form-label">Tax Rate</label>
              <select className="form-select" value={form.tax_rate || 18}
                onChange={e => upd('tax_rate', e.target.value)} disabled={!canEdit}>
                {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
          {parseFloat(form.amount) > 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--c-surface2)', borderRadius: 7, display: 'flex', gap: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Base: <strong>{fmt.currency(form.amount)}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Tax: <strong>{fmt.currency((form.amount||0) * ((form.tax_rate||18)/100))}</strong></span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total: {fmt.currency((form.amount||0) * (1 + (form.tax_rate||18)/100))}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Line Items Table ───────────────────── */}
      {cfg.hasItems && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Line Items</div>
          <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="line-items-table compact" style={{ minWidth: 820 }}>
                <thead>
                  <tr style={{ background: 'var(--c-surface2)' }}>
                    <th style={{ width: 32, textAlign: 'center' }}>#</th>
                    <th style={{ width: 100 }}>Code</th>
                    <th>Item Name</th>
                    <th style={{ width: 160 }}>Description</th>
                    <th style={{ width: 65, textAlign: 'right' }}>Qty</th>
                    <th style={{ width: 95, textAlign: 'right' }}>Unit Price</th>
                    <th style={{ width: 60, textAlign: 'right' }}>Disc%</th>
                    <th style={{ width: 65, textAlign: 'center' }}>Tax%</th>
                    <th style={{ width: 85, textAlign: 'right' }}>Tax Amt</th>
                    <th style={{ width: 95, textAlign: 'right' }}>Total</th>
                    {canEdit && <th style={{ width: 32 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <APItemRow key={item._key} item={item} idx={idx}
                      products={products} disabled={!canEdit}
                      onUpdate={(k, v) => updItem(idx, k, v)}
                      onRemove={() => remItem(idx)}
                      onSelectProduct={p => setItemFromProduct(idx, p)}
                    />
                  ))}
                  {canEdit && (
                    <tr>
                      <td colSpan={11} style={{ padding: '8px 10px' }}>
                        <button className="btn btn-ghost btn-xs" onClick={addItem}>
                          <Plus size={13} /> Add Line
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
                {[['Subtotal', totals.sub], ['Tax', totals.tax], ['Total', totals.total]].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0',
                    borderTop: i === 2 ? '2px solid var(--c-border)' : 'none', marginTop: i === 2 ? 4 : 0 }}>
                    <span style={{ fontSize: i===2?14:12, fontWeight: i===2?700:400, color: i===2?'var(--c-text)':'var(--c-text2)' }}>{l}</span>
                    <span style={{ fontSize: i===2?15:13, fontWeight: i===2?800:500 }}>{fmt.currency(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: cfg.extraFields.includes('description') ? '1fr 1fr' : '1fr', gap: 14 }}>
        {cfg.extraFields.includes('description') && (
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} value={form.description}
              onChange={e => upd('description', e.target.value)} disabled={!canEdit} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Notes & Remarks</label>
          <textarea className="form-input" rows={3} value={form.notes}
            onChange={e => upd('notes', e.target.value)} disabled={!canEdit}
            placeholder="Internal notes…" />
        </div>
      </div>

      {/* Bottom action bar */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-ghost" onClick={() => handleSave('draft')} disabled={saving}>
            <Save size={14} /> Save Draft
          </button>
          <button className="btn btn-primary" onClick={() => handleSave('submitted')} disabled={saving}>
            {cfg.submitLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Item Row ───────────────────────────────────────────────────────────
function APItemRow({ item, idx, products, disabled, onUpdate, onRemove, onSelectProduct }) {
  const [pq, setPQ]       = useState('')
  const [showDrop, setSD] = useState(false)
  const filtered = pq ? products.filter(p =>
    p.name?.toLowerCase().includes(pq.toLowerCase()) ||
    p.sku?.toLowerCase().includes(pq.toLowerCase())
  ) : []

  return (
    <tr>
      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text3)' }}>{idx + 1}</td>
      <td><input className="table-input" value={item.item_code} onChange={e => onUpdate('item_code', e.target.value)} disabled={disabled} style={{ width: '100%' }} /></td>
      <td style={{ position: 'relative' }}>
        <input className="table-input" value={item.item_name}
          onChange={e => { onUpdate('item_name', e.target.value); setPQ(e.target.value); setSD(true) }}
          onFocus={() => setSD(true)}
          disabled={disabled} placeholder="Search…" style={{ width: '100%' }} />
        {showDrop && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 700, background: 'white',
            border: '1px solid var(--c-border)', borderRadius: 6, boxShadow: 'var(--shadow-md)',
            maxHeight: 150, overflowY: 'auto', minWidth: 200 }}>
            {filtered.slice(0, 8).map(p => (
              <div key={p.id} className="dropdown-item"
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
                onClick={() => { onSelectProduct(p); setPQ(''); setSD(false) }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: 'var(--c-text2)' }}>{p.sku} · ₹{p.purchase_price}</div>
              </div>
            ))}
          </div>
        )}
      </td>
      <td><input className="table-input" value={item.description} onChange={e => onUpdate('description', e.target.value)} disabled={disabled} style={{ width: '100%' }} /></td>
      <td><input className="table-input text-right" type="number" min="0.001" value={item.quantity} onChange={e => onUpdate('quantity', parseFloat(e.target.value)||0)} disabled={disabled} /></td>
      <td><input className="table-input text-right" type="number" min="0" value={item.unit_price} onChange={e => onUpdate('unit_price', parseFloat(e.target.value)||0)} disabled={disabled} /></td>
      <td><input className="table-input text-right" type="number" min="0" max="100" value={item.discount} onChange={e => onUpdate('discount', parseFloat(e.target.value)||0)} disabled={disabled} /></td>
      <td>
        <select className="table-input" value={item.tax_rate} onChange={e => onUpdate('tax_rate', parseFloat(e.target.value))} disabled={disabled} style={{ textAlign: 'center' }}>
          {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--c-text2)', padding: '0 6px' }}>{fmt.currency(item.tax_amount)}</td>
      <td style={{ textAlign: 'right', fontWeight: 700, padding: '0 6px' }}>{fmt.currency(item.line_total)}</td>
      {!disabled && <td><button className="action-icon-btn red" onClick={onRemove}><Trash2 size={13} /></button></td>}
    </tr>
  )
}
