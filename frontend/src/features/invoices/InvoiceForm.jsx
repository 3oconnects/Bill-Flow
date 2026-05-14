import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, Search, X, Save, Send } from 'lucide-react'
import { customersApi, productsApi, invoicesApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { fmt, TAX_RATES } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'

const EMPTY_ITEM = { 
  description: '', hsn_code: '', product_id: null, sku: '', 
  quantity: 1, unit: 'pcs', unit_price: 0, 
  discount_pct: 0, discount_amount: 0, 
  tax_rate: 18, tax_amount: 0, 
  cgst_rate: 0, cgst_amount: 0, sgst_rate: 0, sgst_amount: 0, igst_rate: 0, igst_amount: 0,
  amount: 0, subtotal: 0 
}

function LineItem({ item, index, products, onChange, onRemove, isIGST }) {
  const updateCalculations = (updated) => {
    const qty = Number(updated.quantity) || 0
    const price = Number(updated.unit_price) || 0
    const discPct = Number(updated.discount_pct) || 0
    const taxRate = Number(updated.tax_rate) || 0

    const subtotal = qty * price
    const discAmt = parseFloat((subtotal * discPct / 100).toFixed(2))
    const taxableAmount = subtotal - discAmt
    
    const totalTax = parseFloat((taxableAmount * taxRate / 100).toFixed(2))
    
    updated.subtotal = subtotal
    updated.discount_amount = discAmt
    
    if (isIGST) {
      updated.igst_rate = taxRate
      updated.igst_amount = totalTax
      updated.cgst_rate = 0; updated.cgst_amount = 0
      updated.sgst_rate = 0; updated.sgst_amount = 0
    } else {
      updated.cgst_rate = taxRate / 2
      updated.cgst_amount = totalTax / 2
      updated.sgst_rate = taxRate / 2
      updated.sgst_amount = totalTax / 2
      updated.igst_rate = 0; updated.igst_amount = 0
    }
    
    updated.tax_amount = totalTax
    updated.amount = parseFloat((taxableAmount + totalTax).toFixed(2))
    return updated
  }

  const updateField = (field, value) => {
    const updated = updateCalculations({ ...item, [field]: value })
    onChange(index, updated)
  }

  const selectProduct = (productId) => {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    const updated = updateCalculations({
      ...item, 
      description: p.name, product_id: p.id, sku: p.sku || '', hsn_code: p.hsn_code || '',
      unit_price: p.unit_price || 0, tax_rate: p.tax_rate || 18, unit: p.unit || 'pcs'
    })
    onChange(index, updated)
  }

  return (
    <tr className="line-item-row">
      <td style={{ minWidth: 220 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <select className="form-select select-sm" style={{ marginBottom: 4 }} value={item.product_id || ''} onChange={(e) => selectProduct(e.target.value)}>
            <option value="">Select product...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="form-input input-sm" placeholder="Description" value={item.description} onChange={(e) => onChange(index, { ...item, description: e.target.value })} />
        </div>
      </td>
      <td><input className="form-input input-sm mono" style={{ width: 70 }} placeholder="HSN" value={item.hsn_code} onChange={(e) => onChange(index, { ...item, hsn_code: e.target.value })} /></td>
      <td><input className="form-input input-sm center" style={{ width: 60 }} type="number" value={item.quantity} onChange={(e) => updateField('quantity', e.target.value)} /></td>
      <td>
        <select className="form-select select-sm" style={{ width: 70 }} value={item.unit} onChange={(e) => onChange(index, { ...item, unit: e.target.value })}>
          <option value="pcs">Pcs</option>
          <option value="kg">Kg</option>
          <option value="mtr">Mtr</option>
          <option value="nos">Nos</option>
          <option value="set">Set</option>
        </select>
      </td>
      <td><input className="form-input input-sm right" style={{ width: 90 }} type="number" value={item.unit_price} onChange={(e) => updateField('unit_price', e.target.value)} /></td>
      <td><input className="form-input input-sm center" style={{ width: 60 }} type="number" placeholder="%" value={item.discount_pct} onChange={(e) => updateField('discount_pct', e.target.value)} /></td>
      <td>
        <select className="form-select select-sm" style={{ width: 70 }} value={item.tax_rate} onChange={(e) => updateField('tax_rate', e.target.value)}>
          {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      <td className="item-amount" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt.currency(item.amount)}</td>
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
  const [customerEmail, setCustomerEmail] = useState(initial?.customer_email || '')
  const [customerPhone, setCustomerPhone] = useState(initial?.customer_phone || '')
  const [customerDisplayId, setCustomerDisplayId] = useState(initial?.customer_id_display || '')
  const [number, setNumber] = useState(initial?.number || '')
  const [date, setDate] = useState(initial?.date ? initial.date.split('T')[0] : new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(initial?.due_date ? initial.due_date.split('T')[0] : (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })())
  const [currency, setCurrency] = useState(initial?.currency || 'INR')
  const [placeOfSupply, setPlaceOfSupply] = useState(initial?.place_of_supply || org?.state || 'Tamil Nadu')
  const [salesPerson, setSalesPerson] = useState(initial?.sales_person || '')
  const [refNo, setRefNo] = useState(initial?.reference_number || '')
  const [taxType, setTaxType] = useState(initial?.tax_type || 'exclusive')
  const [paidAmount, setPaidAmount] = useState(initial?.paid_amount || 0)
  const [notes, setNotes] = useState(initial?.notes || org?.default_notes || 'Thank you for your business.')
  const [terms, setTerms] = useState(initial?.terms || org?.default_terms || 'Payment due within 30 days.')
  const [items, setItems] = useState(initial?.items || [{ ...EMPTY_ITEM }])
  const [showAddCustomer, setShowAddCustomer] = useState(false)

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })

  useEffect(() => {
    if (!initial && org && !number) {
      const nextNo = org.next_inv_no || 1
      const prefix = org.inv_prefix || 'INV-'
      setNumber(`${prefix}${nextNo.toString().padStart(4, '0')}`)
    }
  }, [org, initial, number])

  const isIGST = org?.state?.toLowerCase() !== placeOfSupply?.toLowerCase()
  const totalSubtotal = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
  const totalDiscount = items.reduce((s, i) => s + (Number(i.discount_amount) || 0), 0)
  const totalTax = items.reduce((s, i) => s + (Number(i.tax_amount) || 0), 0)
  const total = parseFloat((totalSubtotal - totalDiscount + totalTax).toFixed(2))
  const dueAmount = total - Number(paidAmount)

  const handleSave = async (status = 'draft') => {
    if (!customerName || !number) return toast.error('Customer and Invoice Number are required')
    setSaving(true)
    const payload = {
      number, customer_id: customerId || null, customer_name: customerName,
      customer_email: customerEmail, customer_phone: customerPhone, customer_id_display: customerDisplayId,
      date, due_date: dueDate, currency, place_of_supply: placeOfSupply,
      sales_person: salesPerson, reference_number: refNo, tax_type: taxType,
      subtotal: totalSubtotal, discount_amount: totalDiscount, tax: totalTax, total,
      paid_amount: Number(paidAmount), due_amount: dueAmount,
      notes, terms, status,
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
      <div className="form-row cols-4 compact">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">CUSTOMER *</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="form-select select-sm" style={{ flex: 1 }} value={customerId} onChange={(e) => {
              setCustomerId(e.target.value)
              const c = customers.find(x => x.id === e.target.value)
              if (c) { 
                setCustomerName(c.name); setPlaceOfSupply(c.state || 'Tamil Nadu'); 
                setCustomerEmail(c.email || ''); setCustomerPhone(c.phone || '');
                setCustomerDisplayId(c.customer_id_display || '');
              }
            }}>
              <option value="">Search or select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.customer_id_display || 'New'})</option>)}
            </select>
            <button className="btn btn-ghost btn-xs" onClick={() => toast.info('Customer Module will open for addition')}><Plus size={14} /></button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">INVOICE #</label>
          <input className="form-input input-sm" value={number} onChange={e => setNumber(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">REFERENCE #</label>
          <input className="form-input input-sm" value={refNo} placeholder="e.g. PO-123" onChange={e => setRefNo(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">CURRENCY</label>
          <select className="form-select select-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
      </div>

      <div className="form-row cols-4 compact" style={{ marginTop: 8 }}>
        <div className="form-group">
          <label className="form-label">INVOICE DATE</label>
          <input className="form-input input-sm" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">DUE DATE</label>
          <input className="form-input input-sm" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">PLACE OF SUPPLY</label>
          <input className="form-input input-sm" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">SALES PERSON</label>
          <input className="form-input input-sm" value={salesPerson} onChange={e => setSalesPerson(e.target.value)} />
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
              <th style={{ width: '30%' }}>ITEM / DESCRIPTION</th>
              <th>HSN</th>
              <th className="center">QTY</th>
              <th>UNIT</th>
              <th className="right">PRICE</th>
              <th className="center">DISC %</th>
              <th style={{ width: 80 }}>TAX %</th>
              <th className="right" style={{ width: 100 }}>AMOUNT</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <LineItem key={i} index={i} item={it} products={products} isIGST={isIGST} onRemove={(idx) => setItems(s => s.filter((_, j) => j !== idx))} onChange={(idx, val) => setItems(s => s.map((x, j) => j === idx ? val : x))} />
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
        
        <div className="summary-section" style={{ background: '#f8fafc', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <div className="summary-row">
            <span style={{ color: 'var(--text-3)' }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{fmt.currency(totalSubtotal)}</span>
          </div>
          <div className="summary-row" style={{ marginTop: 8 }}>
            <span style={{ color: 'var(--text-3)' }}>Item Discounts</span>
            <span style={{ fontWeight: 600, color: 'var(--red)' }}>-{fmt.currency(totalDiscount)}</span>
          </div>
          <div className="summary-row" style={{ marginTop: 8 }}>
            <span style={{ color: 'var(--text-3)' }}>Tax Total (GST)</span>
            <span style={{ fontWeight: 600 }}>{fmt.currency(totalTax)}</span>
          </div>
          <div className="summary-row total" style={{ borderTop: '1px solid #e2e8f0', marginTop: 12, paddingTop: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Grand Total</span>
            <span style={{ fontWeight: 800, fontSize: 24, color: 'var(--accent)' }}>{fmt.currency(total)}</span>
          </div>
          <div className="summary-row" style={{ marginTop: 16, borderTop: '1px dashed #cbd5e1', paddingTop: 12 }}>
            <label className="form-label" style={{ fontSize: 10, margin: 0 }}>AMOUNT PAID</label>
            <input type="number" className="form-input input-sm right" style={{ width: 120, fontWeight: 700, color: 'var(--green)' }} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
          </div>
          <div className="summary-row" style={{ marginTop: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Balance Due</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: dueAmount > 0 ? 'var(--red)' : 'var(--text-3)' }}>{fmt.currency(dueAmount)}</span>
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
