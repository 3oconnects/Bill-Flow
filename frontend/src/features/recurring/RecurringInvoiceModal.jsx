import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Modal from '@/components/Modal'
import {
  Plus, Trash2, RefreshCw, Calendar, AlertCircle, ScanLine, Package,
} from 'lucide-react'
import { fmt } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { customersApi, productsApi } from '@/api'
import CustomerCombobox from '@/features/customers/CustomerCombobox'
import ProductCombobox  from '@/features/products/ProductCombobox'
import ProductScanModal from '@/features/products/ProductScanModal'
import {
  FREQUENCIES, PAYMENT_TERMS, CURRENCIES, GST_RATES,
} from './recurringShared'

const EMPTY_ITEM = () => ({
  key: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  product_id: '', description: '', sku: '', hsn_code: '',
  quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0,
})

const recalc = (it) => {
  const qty   = Number(it.quantity)   || 0
  const price = Number(it.unit_price) || 0
  const tax   = Number(it.tax_rate)   || 0
  const amount     = parseFloat((qty * price).toFixed(2))
  const tax_amount = parseFloat((amount * tax / 100).toFixed(2))
  return { ...it, amount, tax_amount }
}

const fromProduct = (p, existing) => recalc({
  ...(existing || EMPTY_ITEM()),
  product_id: p.id,
  description: p.name || existing?.description || '',
  sku: p.sku || '',
  hsn_code: p.hsn_code || '',
  unit_price: Number(p.unit_price) || 0,
  tax_rate:   Number(p.tax_rate)   || 18,
  quantity:   Number(existing?.quantity) || 1,
})

export default function RecurringInvoiceModal({ initial, onClose, onSave }) {
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: products  = [] } = useQuery({ queryKey: ['products'],  queryFn: productsApi.list })

  const initialItems = initial?.template_data?.items || initial?.items || []
  const [scanOpen, setScanOpen] = useState(false)

  const [form, setForm] = useState({
    name:          initial?.name || '',
    customer_id:   initial?.customer_id || '',
    customer_name: initial?.customer_name || '',
    frequency:     initial?.frequency || 'monthly',
    next_run:      initial?.next_run ? String(initial.next_run).slice(0, 10) : new Date().toISOString().slice(0, 10),
    end_date:      initial?.end_date ? String(initial.end_date).slice(0, 10) : '',
    never_ends:    initial ? !initial?.end_date : true,
    currency:      initial?.currency || 'INR',
    payment_terms: initial?.template_data?.payment_terms || '30',
    auto_send:     initial?.auto_send ?? true,
    notes:         initial?.template_data?.notes || '',
  })
  const [items, setItems] = useState(initialItems.length ? initialItems.map(recalc) : [])
  const [errors, setErrors] = useState({})

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  const selectCustomer = (c) => {
    if (!c) { setForm(f => ({ ...f, customer_id: '', customer_name: '' })); return }
    setForm(f => ({ ...f, customer_id: c.id, customer_name: c.name || '' }))
    setErrors(e => ({ ...e, customer_id: undefined }))
  }

  const addProductLine = (p) => {
    setItems(prev => {
      const idx = prev.findIndex(it => it.product_id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = recalc({ ...next[idx], quantity: (Number(next[idx].quantity) || 0) + 1 })
        return next
      }
      return [...prev, fromProduct(p)]
    })
    setErrors(e => ({ ...e, items: undefined }))
  }

  const updateItem = (i, k, v) => setItems(prev => prev.map((it, j) => j === i ? recalc({ ...it, [k]: v }) : it))
  const removeItem = (i) => setItems(prev => prev.filter((_, j) => j !== i))
  const addCustom  = () => setItems(prev => [...prev, EMPTY_ITEM()])

  const subtotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const tax      = items.reduce((s, i) => s + (Number(i.tax_amount) || 0), 0)
  const total    = subtotal + tax

  const freq = useMemo(() => FREQUENCIES.find(f => f.value === form.frequency), [form.frequency])

  const handleSave = () => {
    const e = {}
    if (!form.name.trim())     e.name = 'Template name is required'
    if (!form.customer_id)     e.customer_id = 'Pick a customer from the list'
    if (!form.next_run)        e.next_run = 'Start date is required'
    if (!form.never_ends && !form.end_date)
      e.end_date = 'End date is required (or check "Never ends")'
    if (!items.length || !items.some(it => it.description && Number(it.quantity) > 0))
      e.items = 'Add at least one line item'
    setErrors(e)
    if (Object.keys(e).length) {
      toast.error(Object.values(e)[0])
      return
    }
    // Pack everything into the shape the backend expects.
    onSave({
      id:            initial?.id,
      name:          form.name.trim(),
      customer_id:   form.customer_id,
      customer_name: form.customer_name,
      frequency:     form.frequency,
      amount:        total,
      currency:      form.currency,
      next_run:      form.next_run,
      end_date:      form.never_ends ? null : form.end_date,
      auto_send:     form.auto_send,
      status:        initial?.status || 'active',
      template_data: {
        items,
        notes:          form.notes,
        payment_terms:  form.payment_terms,
        subtotal, tax, total,
      },
    })
  }

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSave}>
        <RefreshCw size={14} /> {initial ? 'Save Changes' : 'Create Recurring Invoice'}
      </button>
    </>
  )

  return (
    <Modal title={initial ? `Edit ${initial.name}` : 'New Recurring Invoice'} onClose={onClose} size="xl" footer={footer}>
      <div className="po-form-standard">
        {/* Row 1 — Template details */}
        <div className="responsive-grid cols-1-1" style={{ marginBottom: 24, gap: 32 }}>
          <div className="form-section-compact">
            <div className="form-group">
              <label className="form-label req">Template Name</label>
              <input className={`form-input${errors.name ? ' input-error' : ''}`}
                placeholder="e.g. Monthly Retainer – Acme Corp"
                value={form.name} onChange={e => set('name', e.target.value)} />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label req">Customer</label>
              <CustomerCombobox customers={customers} value={form.customer_id} onPick={selectCustomer} />
              {errors.customer_id && <div className="field-error">{errors.customer_id}</div>}
            </div>

            <div className="form-row cols-2">
              <div className="form-group m0">
                <label className="form-label">Currency</label>
                <select className="form-select" value={form.currency} onChange={e => set('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group m0">
                <label className="form-label">Payment Terms</label>
                <select className="form-select" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}>
                  {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section-compact">
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select className="form-select" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              {freq && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--c-text3)' }}>
                  <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} /> {freq.hint}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label req">Start Date / Next Run</label>
              <input type="date" className={`form-input${errors.next_run ? ' input-error' : ''}`}
                value={form.next_run} onChange={e => set('next_run', e.target.value)} />
              {errors.next_run && <div className="field-error">{errors.next_run}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontWeight: 400, fontSize: 12 }}>
                <input type="checkbox" checked={form.never_ends}
                  onChange={e => set('never_ends', e.target.checked)} />
                Never ends (runs indefinitely)
              </label>
              {!form.never_ends && (
                <input type="date" className={`form-input${errors.end_date ? ' input-error' : ''}`}
                  value={form.end_date} min={form.next_run}
                  onChange={e => set('end_date', e.target.value)} />
              )}
              {errors.end_date && <div className="field-error">{errors.end_date}</div>}
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400, fontSize: 12 }}>
                <input type="checkbox" checked={form.auto_send}
                  onChange={e => set('auto_send', e.target.checked)} />
                Automatically email invoice to customer on each cycle
              </label>
            </div>
          </div>
        </div>

        {/* Line items header — combobox + scanner */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginBottom: 10, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Line Items per Cycle
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 320 }}>
            <ProductCombobox products={products} onPick={addProductLine} />
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setScanOpen(true)}>
              <ScanLine size={13} /> Scan
            </button>
          </div>
        </div>

        {errors.items && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--c-red)', fontSize: 12 }}>
            <AlertCircle size={14} /> {errors.items}
          </div>
        )}

        {items.length === 0 ? (
          <div style={{
            border: '1px dashed var(--c-border)', borderRadius: 10, padding: 24,
            textAlign: 'center', color: 'var(--c-text3)', fontSize: 13, marginBottom: 16,
          }}>
            <Package size={22} style={{ marginBottom: 6, opacity: .6 }} />
            <div>No products yet — search above or scan a barcode.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr 1fr 32px',
              gap: 8, fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
              textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 4px',
            }}>
              <span>Product</span><span>HSN</span><span>Qty</span><span>Unit Price</span>
              <span>GST %</span><span style={{ textAlign: 'right' }}>Amount</span><span />
            </div>
            {items.map((it, i) => (
              <div key={it.key || i} style={{
                display: 'grid', gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr 1fr 32px',
                gap: 8, alignItems: 'center',
                border: '1px solid var(--c-border)', borderRadius: 10,
                padding: '10px 12px', background: 'var(--c-surface)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.description || '—'}
                  </div>
                  {it.sku && <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--c-text3)', marginTop: 2 }}>{it.sku}</div>}
                </div>
                <input className="form-input" value={it.hsn_code || ''}
                  onChange={e => updateItem(i, 'hsn_code', e.target.value)}
                  placeholder="HSN" style={{ fontFamily: 'monospace' }} />
                <input className="form-input" type="number" min={1} value={it.quantity}
                  onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input className="form-input" type="number" min={0} value={it.unit_price}
                  onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                <select className="form-select" value={it.tax_rate}
                  onChange={e => updateItem(i, 'tax_rate', e.target.value)}>
                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
                <div style={{
                  textAlign: 'right', fontWeight: 700, fontSize: 13,
                  background: 'var(--c-surface2, var(--c-bg))', borderRadius: 6, padding: '6px 8px',
                }}>
                  {fmt.currency(it.amount + it.tax_amount)}
                </div>
                <button type="button" className="action-icon-btn red"
                  onClick={() => removeItem(i)} title="Remove">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn btn-ghost btn-sm" onClick={addCustom}>
          <Plus size={13} /> Add Custom Line
        </button>

        {/* Notes + Totals */}
        <div className="responsive-grid cols-2-1" style={{ alignItems: 'flex-start', marginTop: 16 }}>
          <div className="form-section-compact">
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={3}
                placeholder="e.g. Monthly retainer for design services as agreed in contract dated…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div style={{ padding: '14px 20px', background: 'var(--c-surface2, var(--c-bg))', borderRadius: 12 }}>
            <div className="summary-row">
              <span>Subtotal</span>
              <span className="font-mono">{fmt.currency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>GST</span>
              <span className="font-mono">{fmt.currency(tax)}</span>
            </div>
            <div className="summary-row total" style={{ borderTop: '1px solid var(--c-border)', marginTop: 8, paddingTop: 8 }}>
              <span style={{ fontWeight: 700 }}>Total / cycle</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--c-primary)' }} className="font-mono">
                {fmt.currency(total)}
              </span>
            </div>
            {form.next_run && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--c-primary-lt)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                  Next invoice on
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary)' }}>
                  {new Date(form.next_run).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                  {form.auto_send ? 'Will be auto-sent to customer' : 'Will be saved as draft'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {scanOpen && (
        <ProductScanModal onClose={() => setScanOpen(false)} onSelect={addProductLine} />
      )}
    </Modal>
  )
}
