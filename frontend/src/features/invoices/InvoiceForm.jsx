import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Search, X, Save, Send } from 'lucide-react'
import { customersApi, productsApi, invoicesApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { fmt, TAX_RATES } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'

const EMPTY_ITEM = { description: '', hsn_code: '', product_id: null, sku: '', quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0 }

function LineItem({ item, index, products, onChange, onRemove }) {
  const updateField = (field, value) => {
    const updated = { ...item, [field]: value }
    const qty = Number(field === 'quantity' ? value : updated.quantity) || 0
    const price = Number(field === 'unit_price' ? value : updated.unit_price) || 0
    const rate = Number(field === 'tax_rate' ? value : updated.tax_rate) || 0
    const taxable = qty * price
    updated.tax_amount = parseFloat((taxable * rate / 100).toFixed(2))
    updated.amount = parseFloat((taxable + updated.tax_amount).toFixed(2))
    onChange(index, updated)
  }

  const selectProduct = (productId) => {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    const qty = Number(item.quantity) || 1
    const price = Number(p.unit_price) || 0
    const rate = Number(p.tax_rate) || 18
    const taxable = qty * price
    const tax_amount = parseFloat((taxable * rate / 100).toFixed(2))
    onChange(index, {
      ...item, description: p.name, product_id: p.id, sku: p.sku || '', hsn_code: p.hsn_code || '',
      unit_price: price, tax_rate: rate, tax_amount, amount: parseFloat((taxable + tax_amount).toFixed(2)),
    })
  }

  return (
    <tr className="line-item-row">
      <td style={{ minWidth: 260 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <select className="form-select select-sm" style={{ marginBottom: 6 }} value={item.product_id || ''} onChange={(e) => selectProduct(e.target.value)}>
            <option value="">Search or select product...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="form-input input-sm" placeholder="Item description" value={item.description} onChange={(e) => onChange(index, { ...item, description: e.target.value })} />
        </div>
      </td>
      <td><input className="form-input input-sm mono" placeholder="SKU" value={item.sku} onChange={(e) => onChange(index, { ...item, sku: e.target.value })} /></td>
      <td><input className="form-input input-sm mono" placeholder="HSN" value={item.hsn_code} onChange={(e) => onChange(index, { ...item, hsn_code: e.target.value })} /></td>
      <td><input className="form-input input-sm center" type="number" value={item.quantity} onChange={(e) => updateField('quantity', e.target.value)} /></td>
      <td><input className="form-input input-sm right" type="number" value={item.unit_price} onChange={(e) => updateField('unit_price', e.target.value)} /></td>
      <td>
        <select className="form-select select-sm" value={item.tax_rate} onChange={(e) => updateField('tax_rate', e.target.value)}>
          {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      <td className="item-amount">{fmt.currency(item.amount)}</td>
      <td className="center">
        <button type="button" className="action-icon-btn red" onClick={() => onRemove(index)}>
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

export default function InvoiceForm({ initial, onSuccess, onCancel }) {
  const { org } = useAuthStore()
  const [saving, setSaving] = useState(false)
  
  // Form States
  const [customerId, setCustomerId] = useState(initial?.customer_id || '')
  const [customerName, setCustomerName] = useState(initial?.customer_name || '')
  const [number, setNumber] = useState(initial?.number || '')
  const [date, setDate] = useState(initial?.date ? initial.date.split('T')[0] : new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(initial?.due_date ? initial.due_date.split('T')[0] : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })())
  const [currency, setCurrency] = useState(initial?.currency || 'INR')
  const [placeOfSupply, setPlaceOfSupply] = useState(initial?.place_of_supply || 'Tamil Nadu')
  const [discountPct, setDiscountPct] = useState(initial?.discount_pct || 0)
  const [notes, setNotes] = useState(initial?.notes || org?.default_notes || 'Thank you for your business.')
  const [terms, setTerms] = useState(initial?.terms || org?.default_terms || 'Payment due within 30 days.')
  const [items, setItems] = useState(initial?.items || [{ ...EMPTY_ITEM }])

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })

  useEffect(() => {
    if (!initial && org && !number) {
      const nextNo = org.next_inv_no || 1
      const prefix = org.inv_prefix || 'INV-'
      setNumber(`${prefix}${nextNo.toString().padStart(4, '0')}`)
    }
  }, [org, initial, number])

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
  const totalTax = items.reduce((s, i) => s + Number(i.tax_amount), 0)
  const discountAmt = parseFloat((subtotal * (Number(discountPct) / 100)).toFixed(2))
  const total = parseFloat((subtotal - discountAmt + totalTax).toFixed(2))

  const handleSave = async (status = 'draft') => {
    if (!customerName || !number) return toast.error('Customer and Invoice Number are required')
    setSaving(true)
    const payload = {
      number, customer_id: customerId || null, customer_name: customerName,
      date, due_date: dueDate, currency, place_of_supply: placeOfSupply,
      discount_pct: Number(discountPct), notes, terms, status,
      items: items.map((it, i) => ({ ...it, sort_order: i }))
    }
    try {
      if (initial) await invoicesApi.update(initial.id, payload)
      else await invoicesApi.create(payload)
      toast.success(initial ? 'Invoice updated' : 'Invoice created')
      onSuccess()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="invoice-form-modal">
      <div className="form-row cols-3 compact">
        <div className="form-group">
          <label className="form-label">CUSTOMER *</label>
          <select className="form-select select-sm" value={customerId} onChange={(e) => {
            setCustomerId(e.target.value)
            const c = customers.find(x => x.id === e.target.value)
            if (c) { setCustomerName(c.name); setPlaceOfSupply(c.state || 'Tamil Nadu') }
          }}>
            <option value="">Search or select customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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
          </select>
        </div>
      </div>

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

      <div className="line-items-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Line Items</div>
        <button className="btn btn-ghost btn-xs" style={{ fontSize: 11 }}><Search size={12} /> Browse Catalog</button>
      </div>

      <div className="table-wrap" style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--c-border)', borderRadius: 8 }}>
        <table className="line-items-table compact">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>ITEM / DESCRIPTION</th>
              <th>SKU</th>
              <th>HSN CODE</th>
              <th className="center" style={{ width: 60 }}>QTY</th>
              <th className="right" style={{ width: 100 }}>UNIT PRICE</th>
              <th style={{ width: 90 }}>TAX %</th>
              <th className="right" style={{ width: 110 }}>AMOUNT</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <LineItem key={i} index={i} item={it} products={products} onRemove={(idx) => setItems(s => s.filter((_, j) => j !== idx))} onChange={(idx, val) => setItems(s => s.map((x, j) => j === idx ? val : x))} />
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-ghost btn-xs" style={{ marginTop: 10 }} onClick={() => setItems(s => [...s, { ...EMPTY_ITEM }])}>
        <Plus size={14} /> Add Line Item
      </button>

      <div className="invoice-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginTop: 20 }}>
        <div className="notes-section">
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 10 }}>NOTES (VISIBLE TO CUSTOMER)</label>
            <textarea className="form-textarea input-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label" style={{ fontSize: 10 }}>TERMS & CONDITIONS</label>
            <textarea className="form-textarea input-sm" rows={2} value={terms} onChange={e => setTerms(e.target.value)} />
          </div>
        </div>
        
        <div className="summary-section" style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
          <div className="summary-row">
            <span>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{fmt.currency(subtotal)}</span>
          </div>
          <div className="summary-row" style={{ marginTop: 4 }}>
            <span>Discount</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" className="form-input input-sm" style={{ width: 50, padding: '2px 4px', textAlign: 'center' }} value={discountPct} onChange={e => setDiscountPct(e.target.value)} />
              <span>%</span>
            </div>
            <span>—</span>
          </div>
          <div className="summary-row" style={{ marginTop: 4 }}>
            <span>Tax (GST)</span>
            <span style={{ fontWeight: 600 }}>{fmt.currency(totalTax)}</span>
          </div>
          <div className="summary-row total" style={{ borderTop: '1.5px solid #e2e8f0', marginTop: 12, paddingTop: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--c-primary)', letterSpacing: '-0.5px' }}>{fmt.currency(total)}</span>
          </div>
        </div>
      </div>

      <div className="modal-footer-actions" style={{ marginTop: 20, padding: '16px 0 0', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ minWidth: 100, fontWeight: 700 }} onClick={() => handleSave('paid')} disabled={saving}>Save</button>
        <button className="btn btn-success" style={{ fontWeight: 700 }} onClick={() => handleSave('sent')} disabled={saving}>
          <Send size={14} /> Save & Send
        </button>
      </div>
    </div>
  )
}
