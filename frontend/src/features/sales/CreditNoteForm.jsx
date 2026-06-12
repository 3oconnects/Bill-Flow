import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileMinus, Plus, RotateCcw, Info } from 'lucide-react'
import { customersApi, invoicesApi, productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { REASON_META } from './CreditNotesShared'
import CustomerCombobox from '@/features/customers/CustomerCombobox'

const EMPTY_ITEM = {
  description: '', product_id: '', sku: '', hsn_code: '',
  quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0,
}

// Recompute amount + tax_amount on any field change.
const recalc = (it) => {
  const qty   = Number(it.quantity)   || 0
  const price = Number(it.unit_price) || 0
  const tax   = Number(it.tax_rate)   || 0
  const amount     = parseFloat((qty * price).toFixed(2))
  const tax_amount = parseFloat((amount * tax / 100).toFixed(2))
  return { ...it, amount, tax_amount }
}

// Build a credit-note line from an invoice line.
const fromInvoiceItem = (ii) => recalc({
  ...EMPTY_ITEM,
  product_id:  ii.product_id || '',
  description: ii.description || '',
  sku:         ii.sku || '',
  hsn_code:    ii.hsn_code || '',
  quantity:    Number(ii.quantity)   || 1,
  unit_price:  Number(ii.unit_price) || 0,
  tax_rate:    Number(ii.tax_rate)   || 18,
})

export default function CreditNoteForm({ onClose, onSave }) {
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: invoices  = [] } = useQuery({ queryKey: ['invoices'],  queryFn: invoicesApi.list })
  const { data: products  = [] } = useQuery({ queryKey: ['products'],  queryFn: productsApi.list })

  const [form, setForm] = useState({
    customer_id: '', customer_name: '',
    invoice_id: '', invoice_number: '',
    reason: 'damaged_product',
    reason_note: '',  // free text when reason is "other"
    notes: '',
    items: [],
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Fetch full invoice (with items) once the user picks one.
  const { data: invoiceDetail } = useQuery({
    queryKey: ['invoice', form.invoice_id],
    queryFn:  () => invoicesApi.get(form.invoice_id),
    enabled:  !!form.invoice_id,
  })

  // When the invoice loads, auto-fill items from it (only if user hasn't
  // already started editing — i.e. items list is empty or untouched).
  const [autoFilled, setAutoFilled] = useState(false)
  useEffect(() => {
    if (!invoiceDetail || autoFilled) return
    const ii = invoiceDetail.items || []
    if (ii.length) {
      setForm(f => ({ ...f, items: ii.map(fromInvoiceItem) }))
      setAutoFilled(true)
    }
  }, [invoiceDetail, autoFilled])

  // Customer change → drop invoice link AND items, reset auto-fill flag.
  const selectCustomer = (c) => {
    setAutoFilled(false)
    if (!c) {
      setForm(f => ({ ...f, customer_id: '', customer_name: '', invoice_id: '', invoice_number: '', items: [] }))
      return
    }
    setForm(f => ({
      ...f,
      customer_id: c.id,
      customer_name: c.name || '',
      invoice_id: '', invoice_number: '', items: [],
    }))
  }

  // Invoice change → reset items (so the new invoice can auto-fill).
  const selectInvoice = (id) => {
    setAutoFilled(false)
    const inv = invoices.find(x => x.id === id)
    setForm(f => ({
      ...f,
      invoice_id: id,
      invoice_number: inv?.number || '',
      items: [],
    }))
  }

  // Manual "Reload from invoice" — wipe items and let useEffect re-pull.
  const reloadFromInvoice = () => {
    if (!form.invoice_id) return
    setAutoFilled(false)
    setForm(f => ({ ...f, items: [] }))
  }

  const updateItem = (i, k, v) => {
    setForm(f => {
      const items = [...f.items]
      items[i] = recalc({ ...items[i], [k]: v })
      return { ...f, items }
    })
  }
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))
  const addBlank   = ()  => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))

  const selectProduct = (i, productId) => {
    const p = products.find(x => x.id === productId)
    setForm(f => {
      const items = [...f.items]
      if (!p) { items[i] = { ...items[i], product_id: '' }; return { ...f, items } }
      items[i] = recalc({
        ...items[i],
        product_id: p.id,
        description: p.name || items[i].description,
        sku: p.sku || '',
        hsn_code: p.hsn_code || '',
        unit_price: Number(p.unit_price) || 0,
        tax_rate:   Number(p.tax_rate)   || 18,
      })
      return { ...f, items }
    })
  }

  const { subtotal, taxTotal, total } = useMemo(() => {
    const subtotal = form.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
    const taxTotal = form.items.reduce((s, it) => s + (Number(it.tax_amount) || 0), 0)
    return { subtotal, taxTotal, total: subtotal + taxTotal }
  }, [form.items])

  const customerInvoices = useMemo(
    () => invoices.filter(i => !form.customer_id || i.customer_id === form.customer_id),
    [invoices, form.customer_id],
  )

  const submit = () => {
    if (!form.customer_id) return toast.error('Please pick a customer from the list')
    if (form.reason === 'other' && !form.reason_note.trim()) {
      return toast.error('Please describe the reason when "Other" is selected')
    }
    if (!form.items.length || !form.items.some(it => it.description && Number(it.quantity) > 0)) {
      return toast.error('Add at least one credited item')
    }
    // Combine reason_note + notes so backend has a single "notes" string.
    const combinedNotes = form.reason === 'other'
      ? `Reason: ${form.reason_note.trim()}${form.notes ? `\n\n${form.notes}` : ''}`
      : form.notes
    onSave({
      ...form,
      notes: combinedNotes,
      amount: subtotal, tax: taxTotal, total,
    })
  }

  return (
    <div className="modal-backdrop">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileMinus size={18} color="#d63d3d" /> New Credit Note
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Customer + invoice picker */}
          <div className="form-row cols-2" style={{ marginBottom: 14 }}>
            <div className="form-group m0">
              <label className="form-label req">Customer</label>
              <CustomerCombobox customers={customers} value={form.customer_id} onPick={selectCustomer} />
            </div>
            <div className="form-group m0">
              <label className="form-label">Invoice Reference</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="form-select" value={form.invoice_id} style={{ flex: 1 }}
                  onChange={e => selectInvoice(e.target.value)} disabled={!form.customer_id}>
                  <option value="">
                    {form.customer_id ? '— Pick an invoice to auto-fill items —' : 'Pick customer first'}
                  </option>
                  {customerInvoices.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.number} — {fmt.currency(i.total)}
                    </option>
                  ))}
                </select>
                {form.invoice_id && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={reloadFromInvoice}
                    title="Reload items from invoice">
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
              {form.invoice_id && autoFilled && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                  fontSize: 11, color: 'var(--c-text3)',
                }}>
                  <Info size={11} /> Items auto-filled from invoice — edit quantities or remove rows you're not crediting.
                </div>
              )}
            </div>
          </div>

          {/* Reason chips */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label req">Reason for Credit Note</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(REASON_META).map(([k, v]) => (
                <button key={k} type="button"
                  onClick={() => set('reason', k)}
                  style={{
                    padding: '6px 14px', borderRadius: 99,
                    border: `2px solid ${form.reason === k ? v.color : 'var(--c-border)'}`,
                    background: form.reason === k ? v.color + '18' : 'var(--c-surface)',
                    color: form.reason === k ? v.color : 'var(--c-text2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional reason_note when "Other" */}
          {form.reason === 'other' && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label req">Please specify the reason</label>
              <input className="form-input" value={form.reason_note}
                onChange={e => set('reason_note', e.target.value)}
                placeholder="e.g. Customer relocated and no longer needs the items" />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Internal Notes</label>
            <textarea className="form-input" value={form.notes}
              onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Anything else for the team to know…" />
          </div>

          {/* Items */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Items to Credit
            </div>
            {form.invoice_id && (
              <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                {form.items.length} line{form.items.length !== 1 ? 's' : ''} from invoice {form.invoice_number}
              </div>
            )}
          </div>

          {form.items.length === 0 ? (
            <div style={{
              border: '1px dashed var(--c-border)', borderRadius: 10, padding: 24,
              textAlign: 'center', color: 'var(--c-text3)', fontSize: 13, marginBottom: 10,
            }}>
              {form.invoice_id
                ? 'Loading invoice items…'
                : 'Pick an invoice above to auto-fill items, or add a line manually below.'}
            </div>
          ) : (
            <div className="items-grid" style={{ marginBottom: 10 }}>
              <div className="items-head" style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 28px' }}>
                <span>Product</span><span>Description</span><span>Qty</span><span>Price</span><span>Tax %</span><span>Amount</span><span />
              </div>
              {form.items.map((it, i) => (
                <div key={i} className="item-row" style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 28px' }}>
                  <select value={it.product_id || ''} onChange={e => selectProduct(i, e.target.value)}>
                    <option value="">— Pick / custom —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input placeholder="Item being credited" value={it.description}
                    onChange={e => updateItem(i, 'description', e.target.value)} />
                  <input type="number" min={1} value={it.quantity}
                    onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  <input type="number" min={0} value={it.unit_price}
                    onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                  <input type="number" min={0} value={it.tax_rate}
                    onChange={e => updateItem(i, 'tax_rate', e.target.value)} />
                  <div className="item-amount">{fmt.currency(it.amount + it.tax_amount)}</div>
                  <button className="remove-item" onClick={() => removeItem(i)}>×</button>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="btn btn-ghost btn-sm" onClick={addBlank}>
            <Plus size={13} /> Add Custom Line
          </button>

          <div style={{ maxWidth: 240, marginLeft: 'auto', marginTop: 14 }}>
            <div className="summary-row"><span>Subtotal</span><span>{fmt.currency(subtotal)}</span></div>
            <div className="summary-row"><span>Tax</span><span>{fmt.currency(taxTotal)}</span></div>
            <div className="summary-row total">
              <span style={{ fontWeight: 800 }}>Credit Total</span>
              <span style={{ fontWeight: 800, color: '#d63d3d' }}>{fmt.currency(total)}</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={submit}>
            <FileMinus size={14} /> Issue Credit Note
          </button>
        </div>
      </div>
    </div>
  )
}
