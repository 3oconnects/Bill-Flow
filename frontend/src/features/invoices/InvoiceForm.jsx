import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trash2, Save, Send, ScanLine, Package } from 'lucide-react'
import { customersApi, productsApi, invoicesApi, orgApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { fmt, TAX_RATES } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import ProductCombobox from '@/features/products/ProductCombobox'
import ProductScanModal from '@/features/products/ProductScanModal'
import CustomerCombobox from '@/features/customers/CustomerCombobox'

const EMPTY_ITEM = {
  description: '', product_id: '', sku: '', hsn_code: '',
  quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0,
}

const lineFromProduct = (p, existing = EMPTY_ITEM) => {
  const qty   = Number(existing.quantity) || 1
  const price = Number(p.unit_price) || 0
  const rate  = Number(p.tax_rate) || 18
  const taxable = qty * price
  const tax_amount = parseFloat((taxable * rate / 100).toFixed(2))
  return {
    ...existing,
    product_id: p.id,
    description: p.name || existing.description,
    sku: p.sku || '',
    hsn_code: p.hsn_code || '',
    quantity: qty,
    unit_price: price,
    tax_rate: rate,
    tax_amount,
    amount: parseFloat((taxable + tax_amount).toFixed(2)),
  }
}

export default function InvoiceForm({ initial, onSuccess, onCancel }) {
  const { org, setOrg } = useAuthStore()
  const [saving, setSaving]     = useState(false)
  const [scanOpen, setScanOpen] = useState(false)

  // ── Form state ────────────────────────────────────────────────────────────
  const [customerId,    setCustomerId]    = useState(initial?.customer_id || '')
  const [customerName,  setCustomerName]  = useState(initial?.customer_name || '')
  const [number,        setNumber]        = useState(initial?.number || '')
  const [date,          setDate]          = useState(
    initial?.date ? initial.date.split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [dueDate,       setDueDate]       = useState(
    initial?.due_date
      ? initial.due_date.split('T')[0]
      : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })()
  )
  const [currency,      setCurrency]      = useState(initial?.currency || 'INR')
  const [placeOfSupply, setPlaceOfSupply] = useState(initial?.place_of_supply || 'Tamil Nadu')
  const [discountPct,   setDiscountPct]   = useState(initial?.discount_pct || 0)
  const [notes,         setNotes]         = useState(initial?.notes || org?.default_notes || 'Thank you for your business.')
  const [terms,         setTerms]         = useState(initial?.terms || org?.default_terms || 'Payment due within 30 days.')
  const [items,         setItems]         = useState(initial?.items?.length ? initial.items : [])

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: products  = [] } = useQuery({ queryKey: ['products'],  queryFn: productsApi.list })

  // Auto-fill next invoice number
  useEffect(() => {
    if (!initial && org && !number) {
      const nextNo = org.next_inv_no || 1
      const prefix = org.inv_prefix || 'INV-'
      setNumber(`${prefix}${nextNo.toString().padStart(4, '0')}`)
    }
  }, [org, initial, number])

  // Pick a customer from the combobox — captures the id properly.
  const selectCustomer = (c) => {
    if (!c) { setCustomerId(''); setCustomerName(''); return }
    setCustomerId(c.id)
    setCustomerName(c.name || '')
    if (c.state) setPlaceOfSupply(c.state)
  }

  // Add or bump-qty a product line (used by combobox + scanner).
  const addProductLine = (p) => {
    setItems(prev => {
      const idx = prev.findIndex(it => it.product_id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        const cur  = next[idx]
        next[idx]  = lineFromProduct(p, { ...cur, quantity: (Number(cur.quantity) || 0) + 1 })
        return next
      }
      return [...prev, lineFromProduct(p)]
    })
  }

  const updateField = (idx, field, value) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [field]: value }
      const qty   = Number(field === 'quantity'   ? value : updated.quantity)   || 0
      const price = Number(field === 'unit_price' ? value : updated.unit_price) || 0
      const rate  = Number(field === 'tax_rate'   ? value : updated.tax_rate)   || 0
      const taxable = qty * price
      updated.tax_amount = parseFloat((taxable * rate / 100).toFixed(2))
      updated.amount     = parseFloat((taxable + updated.tax_amount).toFixed(2))
      return updated
    }))
  }
  const removeItem = idx => setItems(prev => prev.filter((_, j) => j !== idx))

  // ── Totals ────────────────────────────────────────────────────────────────
  const { subtotal, totalTax, discountAmt, total } = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
    const totalTax = items.reduce((s, i) => s + Number(i.tax_amount), 0)
    const discountAmt = parseFloat((subtotal * (Number(discountPct) / 100)).toFixed(2))
    const total = parseFloat((subtotal - discountAmt + totalTax).toFixed(2))
    return { subtotal, totalTax, discountAmt, total }
  }, [items, discountPct])

  const handleSave = async (status = 'draft') => {
    if (!customerId)   return toast.error('Please pick a customer from the list')
    if (!number)       return toast.error('Invoice number is required')
    if (!items.length) return toast.error('Add at least one product — search or scan above')
    setSaving(true)
    const payload = {
      number,
      customer_id: customerId,
      customer_name: customerName,
      date, due_date: dueDate, currency,
      place_of_supply: placeOfSupply,
      discount_pct: Number(discountPct),
      discount_amount: discountAmt,
      subtotal, tax: totalTax, total,
      notes, terms, status,
      items: items.map((it, i) => ({ ...it, sort_order: i })),
    }
    try {
      if (initial) {
        await invoicesApi.update(initial.id, payload)
        toast.success('Invoice updated')
      } else {
        const res = await invoicesApi.create(payload)
        // Server is the source of truth for the number — reflect that.
        if (res?.number && res.number !== payload.number) setNumber(res.number)
        // Refresh org so next_inv_no is up-to-date for the next form open.
        orgApi.get().then(setOrg).catch(() => {})
        toast.success(`Invoice ${res?.number || payload.number} created`)
      }
      onSuccess()
    } catch (e) {
      toast.error(e.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="invoice-form-modal">
      {/* Header row 1 — Customer / Number / Currency */}
      <div className="form-row cols-3 compact">
        <div className="form-group">
          <label className="form-label">CUSTOMER *</label>
          <CustomerCombobox customers={customers} value={customerId} onPick={selectCustomer} />
        </div>
        <div className="form-group">
          <label className="form-label">INVOICE NUMBER *</label>
          <input className="form-input input-sm" value={number} onChange={e => setNumber(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">CURRENCY</label>
          <select className="form-select select-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      {/* Header row 2 — Dates + Place of Supply */}
      <div className="form-row cols-3 compact" style={{ marginTop: 8 }}>
        <div className="form-group">
          <label className="form-label">INVOICE DATE *</label>
          <input className="form-input input-sm" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">DUE DATE *</label>
          <input className="form-input input-sm" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">PLACE OF SUPPLY</label>
          <input className="form-input input-sm" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} />
        </div>
      </div>

      {/* Line Items — combobox + scan header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginTop: 14, marginBottom: 10, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Line Items
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 320 }}>
          <ProductCombobox products={products} onPick={addProductLine} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setScanOpen(true)}>
            <ScanLine size={13} /> Scan QR / Barcode
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{
          border: '1px dashed var(--c-border)', borderRadius: 10, padding: 28,
          textAlign: 'center', color: 'var(--c-text3)', fontSize: 13, marginBottom: 4,
        }}>
          <Package size={22} style={{ marginBottom: 6, opacity: .6 }} />
          <div>No products yet — search above or scan a barcode.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr 1fr 32px',
            gap: 8, fontSize: 10, fontWeight: 700, color: 'var(--c-text3)',
            textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 4px',
          }}>
            <span>Product</span><span>HSN</span><span>Qty</span><span>Unit Price</span>
            <span>Tax %</span><span style={{ textAlign: 'right' }}>Amount</span><span />
          </div>
          {items.map((it, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr 1fr 32px',
              gap: 8, alignItems: 'center',
              border: '1px solid var(--c-border)', borderRadius: 10,
              padding: '10px 12px', background: 'var(--c-surface)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.description || '—'}
                </div>
                {it.sku && (
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--c-text3)', marginTop: 2 }}>
                    {it.sku}
                  </div>
                )}
              </div>
              <input className="form-input input-sm mono" value={it.hsn_code || ''}
                onChange={e => updateField(i, 'hsn_code', e.target.value)} placeholder="HSN" />
              <input className="form-input input-sm center" type="number" min={1}
                value={it.quantity} onChange={e => updateField(i, 'quantity', e.target.value)} />
              <input className="form-input input-sm right" type="number" min={0}
                value={it.unit_price} onChange={e => updateField(i, 'unit_price', e.target.value)} />
              <select className="form-select select-sm" value={it.tax_rate}
                onChange={e => updateField(i, 'tax_rate', e.target.value)}>
                {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
              <div style={{
                textAlign: 'right', fontWeight: 700, fontSize: 13,
                background: 'var(--c-surface2, var(--c-bg))', borderRadius: 6, padding: '6px 8px',
              }}>
                {fmt.currency(it.amount)}
              </div>
              <button type="button" className="action-icon-btn red"
                onClick={() => removeItem(i)} title="Remove">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom grid — notes + summary */}
      <div className="invoice-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginTop: 20 }}>
        <div className="notes-section">
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 10 }}>NOTES (VISIBLE TO CUSTOMER)</label>
            <textarea className="form-textarea input-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label" style={{ fontSize: 10 }}>TERMS &amp; CONDITIONS</label>
            <textarea className="form-textarea input-sm" rows={2} value={terms} onChange={e => setTerms(e.target.value)} />
          </div>
        </div>

        <div className="summary-section" style={{ background: 'var(--c-surface2, #f8fafc)', borderRadius: 8, padding: 16 }}>
          <div className="summary-row">
            <span>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{fmt.currency(subtotal)}</span>
          </div>
          <div className="summary-row" style={{ marginTop: 4 }}>
            <span>Discount</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" className="form-input input-sm"
                style={{ width: 50, padding: '2px 4px', textAlign: 'center' }}
                value={discountPct} onChange={e => setDiscountPct(e.target.value)} />
              <span>%</span>
            </div>
            <span>−{fmt.currency(discountAmt)}</span>
          </div>
          <div className="summary-row" style={{ marginTop: 4 }}>
            <span>Tax (GST)</span>
            <span style={{ fontWeight: 600 }}>{fmt.currency(totalTax)}</span>
          </div>
          <div className="summary-row total" style={{ borderTop: '1.5px solid var(--c-border)', marginTop: 12, paddingTop: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--c-primary)', letterSpacing: '-0.5px' }}>
              {fmt.currency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="modal-footer-actions" style={{
        marginTop: 20, padding: '16px 0 0', borderTop: '1px solid var(--c-border)',
        display: 'flex', justifyContent: 'flex-end', gap: 8,
      }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ minWidth: 100, fontWeight: 700 }}
          onClick={() => handleSave('draft')} disabled={saving}>
          <Save size={14} /> Save
        </button>
        <button className="btn btn-success" style={{ fontWeight: 700 }}
          onClick={() => handleSave('sent')} disabled={saving}>
          <Send size={14} /> Save &amp; Send
        </button>
      </div>

      {scanOpen && (
        <ProductScanModal
          onClose={() => setScanOpen(false)}
          onSelect={addProductLine}
        />
      )}
    </div>
  )
}
