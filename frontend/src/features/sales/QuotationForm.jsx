import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customersApi, productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { FileSignature, Plus, ScanLine, Trash2, Package } from 'lucide-react'
import { PROB_COLOR } from './QuotationsShared'
import ProductScanModal from '@/features/products/ProductScanModal'
import ProductCombobox from '@/features/products/ProductCombobox'
import CustomerCombobox from '@/features/customers/CustomerCombobox'

const EMPTY_ITEM = {
  product_id: '', description: '', sku: '', hsn_code: '',
  quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0,
}

const recalc = (it) => {
  const qty   = Number(it.quantity)   || 0
  const price = Number(it.unit_price) || 0
  const tax   = Number(it.tax_rate)   || 0
  const amount     = parseFloat((qty * price).toFixed(2))
  const tax_amount = parseFloat((amount * tax / 100).toFixed(2))
  return { ...it, amount, tax_amount }
}

const fromProduct = (p, existing = EMPTY_ITEM) => recalc({
  ...existing,
  product_id: p.id,
  description: p.name || '',
  sku: p.sku || '',
  hsn_code: p.hsn_code || '',
  unit_price: Number(p.unit_price) || 0,
  tax_rate: Number(p.tax_rate) || 18,
  quantity: Number(existing.quantity) || 1,
})

function _UnusedLegacyCombobox({ products, onPick }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef             = useRef(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 20)
    return products.filter(p =>
      (p.name    || '').toLowerCase().includes(q) ||
      (p.sku     || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q),
    ).slice(0, 30)
  }, [query, products])

  // Click outside → close
  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => { setActive(0) }, [query, open])

  const pick = (p) => {
    if (!p) return
    onPick(p)
    setQuery('')
    setOpen(false)
  }

  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[active]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 240 }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--c-text3)', pointerEvents: 'none',
        }} />
        <input
          className="form-input"
          value={query}
          placeholder="Search product by name or SKU…"
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={onKey}
          style={{ paddingLeft: 30 }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 8, boxShadow: '0 10px 24px rgba(15,23,42,.12)',
          maxHeight: 280, overflowY: 'auto', zIndex: 100,
        }}>
          {results.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); pick(p) }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: i === active ? 'var(--c-primary-lt)' : 'transparent',
                borderBottom: '1px solid var(--c-border)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--c-text)' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', display: 'flex', gap: 10, marginTop: 2 }}>
                {p.sku    && <span style={{ fontFamily: 'monospace' }}>{p.sku}</span>}
                {p.hsn_code && <span>HSN {p.hsn_code}</span>}
                {p.unit_price != null && <span>₹{Number(p.unit_price).toLocaleString('en-IN')}</span>}
                {p.stock_qty != null && <span>Stock {p.stock_qty}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && results.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--c-text3)',
          zIndex: 100,
        }}>
          No products match "{query}"
        </div>
      )}
    </div>
  )
}

export default function QuotationForm({ onClose, onSave }) {
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: products  = [] } = useQuery({ queryKey: ['products'],  queryFn: productsApi.list })

  const [form, setForm] = useState({
    customer_id: '', customer_name: '', customer_email: '', salesperson: '',
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: '', win_probability: 60,
    items: [],
  })
  const [scanOpen, setScanOpen] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectCustomer = (c) => {
    if (!c) {
      setForm(f => ({ ...f, customer_id: '', customer_name: '' }))
      return
    }
    setForm(f => ({
      ...f,
      customer_id: c.id,
      customer_name: c.name || '',
      customer_email: c.email || f.customer_email,
    }))
  }

  const addProductLine = (productId) => {
    const p = products.find(x => x.id === productId)
    if (!p) return
    setForm(f => {
      // If product already in list, bump qty instead of duplicating
      const idx = f.items.findIndex(it => it.product_id === p.id)
      if (idx >= 0) {
        const items = [...f.items]
        items[idx] = recalc({ ...items[idx], quantity: Number(items[idx].quantity) + 1 })
        return { ...f, items }
      }
      return { ...f, items: [...f.items, fromProduct(p)] }
    })
  }

  const updateItem = (i, k, v) => {
    setForm(f => {
      const items = [...f.items]
      items[i] = recalc({ ...items[i], [k]: v })
      return { ...f, items }
    })
  }

  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))

  const onScanned = (product) => {
    // Same logic as addProductLine but takes a full product object.
    setForm(f => {
      const idx = f.items.findIndex(it => it.product_id === product.id)
      if (idx >= 0) {
        const items = [...f.items]
        items[idx] = recalc({ ...items[idx], quantity: Number(items[idx].quantity) + 1 })
        return { ...f, items }
      }
      return { ...f, items: [...f.items, fromProduct(product)] }
    })
  }

  const { subtotal, taxTotal, total } = useMemo(() => {
    const subtotal = form.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
    const taxTotal = form.items.reduce((s, it) => s + (Number(it.tax_amount) || 0), 0)
    return { subtotal, taxTotal, total: subtotal + taxTotal }
  }, [form.items])

  const submit = () => {
    if (!form.customer_id) return toast.error('Please pick a customer from the list')
    if (!form.items.length) return toast.error('Add at least one product')
    onSave({ ...form, subtotal, tax: taxTotal, total })
  }

  return (
    <div className="modal-backdrop">
      <div className="modal modal-xl">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSignature size={18} color="var(--c-primary)" /> New Quotation
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Customer + meta */}
          <div className="form-row cols-3" style={{ marginBottom: 16 }}>
            <div className="form-group m0">
              <label className="form-label req">Customer</label>
              <CustomerCombobox customers={customers} value={form.customer_id} onPick={selectCustomer} />
            </div>
            <div className="form-group m0">
              <label className="form-label">Customer Email</label>
              <input className="form-input" value={form.customer_email}
                onChange={e => set('customer_email', e.target.value)} placeholder="email@company.com" />
            </div>
            <div className="form-group m0">
              <label className="form-label">Valid Until</label>
              <input type="date" className="form-input" value={form.valid_until}
                onChange={e => set('valid_until', e.target.value)} />
            </div>
          </div>
          <div className="form-row cols-3" style={{ marginBottom: 20 }}>
            <div className="form-group m0">
              <label className="form-label">Salesperson</label>
              <input className="form-input" value={form.salesperson} onChange={e => set('salesperson', e.target.value)} />
            </div>
            <div className="form-group m0">
              <label className="form-label">Win Probability — {form.win_probability}%</label>
              <input type="range" min={0} max={100} value={form.win_probability}
                onChange={e => set('win_probability', Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--c-text3)', marginTop: 2 }}>
                <span>Low</span><span style={{ fontWeight: 700, color: PROB_COLOR(form.win_probability) }}>{form.win_probability}%</span><span>High</span>
              </div>
            </div>
            <div className="form-group m0">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {/* Line Items header — single Add + single Scan */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 10, flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Line Items
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 320 }}>
              <ProductCombobox products={products} onPick={(p) => onScanned(p)} />
              <button type="button" className="btn btn-primary" onClick={() => setScanOpen(true)}>
                <ScanLine size={14} /> Scan QR / Barcode
              </button>
            </div>
          </div>

          {/* Items list */}
          {form.items.length === 0 ? (
            <div style={{
              border: '1px dashed var(--c-border)', borderRadius: 10, padding: 28,
              textAlign: 'center', color: 'var(--c-text3)', fontSize: 13, marginBottom: 14,
            }}>
              <Package size={22} style={{ marginBottom: 6, opacity: .6 }} />
              <div>No products yet — add from the catalogue or scan a barcode.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2.4fr .9fr .7fr 1fr .6fr 1.1fr 36px',
                gap: 8, fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
                textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 4px',
              }}>
                <span>Product</span><span>HSN</span><span>Qty</span><span>Unit Price (₹)</span>
                <span>GST %</span><span style={{ textAlign: 'right' }}>Line Total</span><span />
              </div>
              {form.items.map((it, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '2.4fr .9fr .7fr 1fr .6fr 1.1fr 36px',
                  gap: 8, alignItems: 'center',
                  border: '1px solid var(--c-border)', borderRadius: 10,
                  padding: '10px 12px', background: 'var(--c-surface)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.description || '—'}
                    </div>
                    {it.sku && (
                      <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--c-text3)', marginTop: 2 }}>
                        {it.sku}
                      </div>
                    )}
                  </div>
                  <input className="form-input" value={it.hsn_code}
                    onChange={e => updateItem(i, 'hsn_code', e.target.value)}
                    placeholder="HSN" style={{ fontFamily: 'monospace' }} />
                  <input type="number" min={1} className="form-input" value={it.quantity}
                    onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  <input type="number" min={0} className="form-input" value={it.unit_price}
                    onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                  <input type="number" min={0} max={28} className="form-input" value={it.tax_rate}
                    onChange={e => updateItem(i, 'tax_rate', e.target.value)} />
                  <div style={{
                    padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 6,
                    background: 'var(--c-surface2)', fontWeight: 700, textAlign: 'right', fontSize: 13,
                  }}>
                    {fmt.currency((Number(it.amount) || 0) + (Number(it.tax_amount) || 0))}
                  </div>
                  <button type="button" className="btn btn-ghost"
                    onClick={() => removeItem(i)} title="Remove"
                    style={{ color: 'var(--c-red)', padding: 6 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div style={{ maxWidth: 260, marginLeft: 'auto', marginTop: 16 }}>
            <div className="summary-row"><span>Subtotal</span><span>{fmt.currency(subtotal)}</span></div>
            <div className="summary-row"><span>Tax (GST)</span><span>{fmt.currency(taxTotal)}</span></div>
            <div className="summary-row total">
              <span style={{ fontWeight: 800 }}>Total</span>
              <span style={{ fontWeight: 800, color: 'var(--c-primary)' }}>{fmt.currency(total)}</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>
            <FileSignature size={14} /> Create Quotation
          </button>
        </div>
      </div>

      {scanOpen && (
        <ProductScanModal
          onClose={() => setScanOpen(false)}
          onSelect={onScanned}
        />
      )}
    </div>
  )
}
