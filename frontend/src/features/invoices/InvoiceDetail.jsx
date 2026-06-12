import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Printer, Send, CheckCircle, Save, Shield, ScanLine, Package, CreditCard } from 'lucide-react'
import { invoicesApi, customersApi, productsApi } from '@/api'
import WarrantyClaimModal from '@/features/warranty/WarrantyClaimModal'
import ProductCombobox from '@/features/products/ProductCombobox'
import ProductScanModal from '@/features/products/ProductScanModal'
import RecordPaymentModal from '@/features/payments/RecordPaymentModal'
import { useAuthStore } from '@/store/authStore'
import { fmt, TAX_RATES } from '@/lib/utils'
import { PageLoading, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'

const EMPTY_ITEM = { description: '', hsn_code: '', product_id: null, sku: '', quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0 }

function LineItem({ item, index, products, onChange, onRemove }) {
  const updateField = (field, value) => {
    const updated = { ...item, [field]: value }
    // Recalculate on qty/price/tax change
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
    <tr>
      <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
        <select
          className="form-select" style={{ marginBottom: 4 }}
          value={item.product_id || ''}
          onChange={(e) => selectProduct(e.target.value)}
        >
          <option value="">— Pick product —</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className="form-input" placeholder="Description *" value={item.description}
          onChange={(e) => onChange(index, { ...item, description: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', verticalAlign: 'top', width: 100 }}>
        <input className="form-input" style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="HSN" value={item.hsn_code}
          onChange={(e) => onChange(index, { ...item, hsn_code: e.target.value })} />
      </td>
      <td style={{ padding: '6px 8px', verticalAlign: 'top', width: 90 }}>
        <input className="form-input" type="number" step="0.001" min="0" value={item.quantity}
          onChange={(e) => updateField('quantity', e.target.value)} style={{ textAlign: 'right' }} />
      </td>
      <td style={{ padding: '6px 8px', verticalAlign: 'top', width: 110 }}>
        <input className="form-input" type="number" step="0.01" min="0" value={item.unit_price}
          onChange={(e) => updateField('unit_price', e.target.value)} style={{ textAlign: 'right' }} />
      </td>
      <td style={{ padding: '6px 8px', verticalAlign: 'top', width: 90 }}>
        <select className="form-select" value={item.tax_rate} onChange={(e) => updateField('tax_rate', e.target.value)}>
          {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      <td style={{ padding: '6px 8px', verticalAlign: 'middle', width: 90, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
        {fmt.currency(item.tax_amount)}
      </td>
      <td style={{ padding: '6px 8px', verticalAlign: 'middle', width: 110, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
        {fmt.currency(item.amount)}
      </td>
      <td style={{ padding: '6px 8px', verticalAlign: 'middle', width: 40 }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }} onClick={() => onRemove(index)}>
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { org } = useAuthStore()
  const isNew = id === 'new'

  // Form State
  const [customerId, setCustomerId] = useState(searchParams.get('customer_id') || '')
  const [customerName, setCustomerName] = useState(searchParams.get('customer_name') ? decodeURIComponent(searchParams.get('customer_name')) : '')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [number, setNumber] = useState('')

  // Auto-generate number for new invoice
  useEffect(() => {
    if (isNew && org) {
      const nextNo = org.next_inv_no || 1
      const prefix = org.inv_prefix || 'INV-'
      setNumber(`${prefix}${nextNo.toString().padStart(3, '0')}`)
    }
  }, [isNew, org])

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })
  const [currency, setCurrency] = useState('INR')
  const [placeOfSupply, setPlaceOfSupply] = useState('')
  const [status, setStatus] = useState('draft')
  const [discountPct, setDiscountPct] = useState(0)
  const [notes, setNotes] = useState(org?.default_notes || 'Thank you for your business.')
  const [terms, setTerms] = useState(org?.default_terms || 'Payment due within 30 days.')
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [showWarranty, setShowWarranty] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  // Data
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })
  const { data: existingInv, isLoading } = useQuery({
    queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id),
    enabled: !isNew,
  })

  // Load existing invoice
  useEffect(() => {
    if (existingInv) {
      setCustomerId(existingInv.customer_id || '')
      setCustomerName(existingInv.customer_name || '')
      setCustomerEmail(existingInv.customer_email || '')
      setCustomerPhone(existingInv.customer_phone || '')
      setNumber(existingInv.number || '')
      setDate(fmt.dateInput(existingInv.date))
      setDueDate(fmt.dateInput(existingInv.due_date))
      setCurrency(existingInv.currency || 'INR')
      setPlaceOfSupply(existingInv.place_of_supply || '')
      setStatus(existingInv.status || 'draft')
      setDiscountPct(existingInv.discount_pct || 0)
      setNotes(existingInv.notes || '')
      setTerms(existingInv.terms || '')
      setItems(existingInv.items?.length ? existingInv.items : [])
    }
  }, [existingInv])

  // Auto-fill customer
  const handleCustomerChange = (cid) => {
    setCustomerId(cid)
    const c = customers.find((x) => x.id === cid)
    if (c) { setCustomerName(c.name); setCustomerEmail(c.email || ''); setCustomerPhone(c.phone || ''); setPlaceOfSupply(c.state || '') }
  }

  // Calculations
  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
  const totalTax = items.reduce((s, i) => s + Number(i.tax_amount), 0)
  const discountAmt = parseFloat((subtotal * (Number(discountPct) / 100)).toFixed(2))
  const total = parseFloat((subtotal - discountAmt + totalTax).toFixed(2))

  const updateItem = (idx, updated) => setItems((prev) => prev.map((it, i) => i === idx ? updated : it))
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }])

  // Compute a line row from a product (used by combobox + scanner).
  const lineFromProduct = (p, existing = EMPTY_ITEM) => {
    const qty   = Number(existing.quantity) || 1
    const price = Number(p.unit_price) || 0
    const rate  = Number(p.tax_rate) || 18
    const taxable    = qty * price
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

  // Add (or bump qty if already on invoice) a product line.
  const addProductLine = (product) => {
    setItems((prev) => {
      const idx = prev.findIndex(it => it.product_id === product.id)
      if (idx >= 0) {
        const next = [...prev]
        const cur  = next[idx]
        next[idx]  = lineFromProduct(product, { ...cur, quantity: (Number(cur.quantity) || 0) + 1 })
        return next
      }
      return [...prev, lineFromProduct(product)]
    })
  }

  const buildPayload = () => ({
    number, customer_id: customerId || null, customer_name: customerName,
    customer_email: customerEmail, customer_phone: customerPhone,
    date, due_date: dueDate, currency, place_of_supply: placeOfSupply, status,
    subtotal, discount_pct: Number(discountPct), discount_amount: discountAmt,
    tax: totalTax, total, notes, terms,
    items: items.map((it, i) => ({ ...it, sort_order: i })),
  })

  const handleSave = async () => {
    if (!customerName || !number) {
      toast.error('Fill in invoice number and customer name')
      return
    }
    if (!items.length) {
      toast.error('Add at least one product line — search or scan above')
      return
    }
    if (items.some((it) => !it.description)) {
      toast.error('Every line needs a product or description')
      return
    }
    setSaving(true)
    try {
      if (isNew) {
        const res = await invoicesApi.create(buildPayload())
        toast.success('Invoice created')
        navigate(`/invoices/${res.id}`)
      } else {
        await invoicesApi.update(id, buildPayload())
        qc.invalidateQueries(['invoice', id])
        toast.success('Invoice saved')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (isNew) return
    try {
      await invoicesApi.updateStatus(id, newStatus)
      qc.invalidateQueries(['invoice', id])
      setStatus(newStatus)
      toast.success(`Marked as ${newStatus}`)
    } catch (e) { toast.error(e.message) }
  }

  if (!isNew && isLoading) return <PageLoading />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="topbar-icon-btn" onClick={() => navigate('/invoices')}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{isNew ? 'New Invoice' : `Invoice ${number}`}</h1>
          {!isNew && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Status: {status}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && status === 'draft' && (
            <button className="btn btn-ghost" onClick={() => handleStatusChange('sent')}><Send size={14} /> Mark Sent</button>
          )}
          {!isNew && status === 'sent' && (
            <button className="btn btn-success" onClick={() => handleStatusChange('paid')}><CheckCircle size={14} /> Mark Paid</button>
          )}
          {!isNew && (
            <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={14} /> Print</button>
          )}
          {!isNew && !['paid', 'cancelled', 'draft'].includes(status) && (
            <button className="btn btn-success" onClick={() => setPayOpen(true)}>
              <CreditCard size={14} /> Record Payment
            </button>
          )}
          {!isNew && customerId && (
            <button className="btn btn-ghost" onClick={() => setShowWarranty(true)}>
              <Shield size={14} /> Raise Warranty
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={14} /> : <><Save size={14} /> {isNew ? 'Create Invoice' : 'Save Changes'}</>}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Main Form */}
        <div>
          {/* Invoice Header */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Invoice Details</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Invoice Number *</label>
                <input className="form-input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder={`${org?.inv_prefix || 'INV-'}001`} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {['draft','sent','paid','overdue','cancelled'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date *</label>
                <input className="form-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {['INR','USD','EUR','GBP','AED'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Place of Supply</label>
                <input className="form-input" value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} placeholder="State name" />
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Customer</div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Select Customer</label>
                <select className="form-select" value={customerId} onChange={(e) => handleCustomerChange(e.target.value)}>
                  <option value="">— Or type manually below —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input className="form-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer / business name" />
              </div>
              <div className="form-group">
                <label className="form-label">Customer Email</label>
                <input className="form-input" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Customer Phone</label>
                <input className="form-input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, marginBottom: 12, flexWrap: 'wrap',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Line Items</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 320 }}>
                <ProductCombobox products={products} onPick={addProductLine} />
                <button type="button" className="btn btn-primary" onClick={() => setScanOpen(true)}>
                  <ScanLine size={14} /> Scan QR / Barcode
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div style={{
                border: '1px dashed var(--border)', borderRadius: 10, padding: 28,
                textAlign: 'center', color: 'var(--text-3)', fontSize: 13,
              }}>
                <Package size={22} style={{ marginBottom: 6, opacity: .6 }} />
                <div>No products yet — search above or scan a barcode.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr .9fr 1fr 36px',
                  gap: 8, fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 4px',
                }}>
                  <span>Product</span><span>HSN</span><span>Qty</span><span>Unit Price</span>
                  <span>Tax %</span><span style={{ textAlign: 'right' }}>Tax ₹</span>
                  <span style={{ textAlign: 'right' }}>Amount</span><span />
                </div>
                {items.map((item, idx) => {
                  const onField = (field, value) => {
                    const updated = { ...item, [field]: value }
                    const qty   = Number(field === 'quantity'   ? value : updated.quantity)   || 0
                    const price = Number(field === 'unit_price' ? value : updated.unit_price) || 0
                    const rate  = Number(field === 'tax_rate'   ? value : updated.tax_rate)   || 0
                    const taxable = qty * price
                    updated.tax_amount = parseFloat((taxable * rate / 100).toFixed(2))
                    updated.amount     = parseFloat((taxable + updated.tax_amount).toFixed(2))
                    updateItem(idx, updated)
                  }
                  return (
                    <div key={idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '2.4fr .9fr .7fr 1fr .7fr .9fr 1fr 36px',
                      gap: 8, alignItems: 'center',
                      border: '1px solid var(--border)', borderRadius: 10,
                      padding: '10px 12px', background: 'var(--bg-1, #fff)',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.description || '—'}
                        </div>
                        {item.sku && (
                          <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-3)', marginTop: 2 }}>
                            {item.sku}
                          </div>
                        )}
                      </div>
                      <input className="form-input" value={item.hsn_code || ''}
                        onChange={(e) => onField('hsn_code', e.target.value)}
                        placeholder="HSN" style={{ fontFamily: 'monospace', fontSize: 12 }} />
                      <input className="form-input" type="number" step="0.001" min="0"
                        value={item.quantity} onChange={(e) => onField('quantity', e.target.value)} />
                      <input className="form-input" type="number" step="0.01" min="0"
                        value={item.unit_price} onChange={(e) => onField('unit_price', e.target.value)} />
                      <select className="form-select" value={item.tax_rate}
                        onChange={(e) => onField('tax_rate', e.target.value)}>
                        {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                      <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                        {fmt.currency(item.tax_amount)}
                      </div>
                      <div style={{
                        textAlign: 'right', fontWeight: 700, fontSize: 13,
                        background: 'var(--bg-2)', borderRadius: 6, padding: '6px 8px',
                      }}>
                        {fmt.currency(item.amount)}
                      </div>
                      <button type="button" className="topbar-icon-btn"
                        onClick={() => removeItem(idx)} title="Remove"
                        style={{ color: 'var(--red)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notes & Terms */}
          <div className="card">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Notes (visible on invoice)</label>
                <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Terms & Conditions</label>
                <textarea className="form-textarea" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar — Summary */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Invoice Summary</div>

            {/* Discount */}
            <div className="form-group">
              <label className="form-label">Discount (%)</label>
              <input className="form-input" type="number" min="0" max="100" step="0.01"
                value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
            </div>

            {/* Totals */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {[
                { label: 'Subtotal', value: fmt.currency(subtotal), muted: true },
                { label: `Discount (${discountPct}%)`, value: `−${fmt.currency(discountAmt)}`, muted: true, color: 'var(--red)' },
                { label: 'Total Tax', value: fmt.currency(totalTax), muted: true },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: row.color || 'var(--text)' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{fmt.currency(total, currency)}</span>
              </div>
              {!isNew && existingInv && (() => {
                const paid    = Number(existingInv.paid_amount || 0)
                const credit  = Number(existingInv.credited_amount || 0)
                const outs    = Math.max(0, Number(existingInv.total || total) - paid - credit)
                return (
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {paid > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-2)' }}>Paid</span>
                        <span style={{ fontWeight: 600, color: 'var(--green, #0a8754)' }}>{fmt.currency(paid)}</span>
                      </div>
                    )}
                    {credit > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-2)' }}>Credited</span>
                        <span style={{ fontWeight: 600 }}>−{fmt.currency(credit)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>Outstanding</span>
                      <span style={{ fontWeight: 800, color: outs > 0 ? 'var(--red)' : 'var(--green, #0a8754)' }}>
                        {fmt.currency(outs)}
                      </span>
                    </div>
                    {outs > 0 && !['cancelled', 'draft'].includes(status) && (
                      <button className="btn btn-success btn-sm" style={{ marginTop: 6, justifyContent: 'center' }}
                        onClick={() => setPayOpen(true)}>
                        <CreditCard size={13} /> Record Payment
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Tax Breakdown per rate */}
            {items.some((it) => Number(it.tax_amount) > 0) && (
              <div style={{ marginTop: 16, background: 'var(--bg-2)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>GST Breakdown</div>
                {TAX_RATES.map((rate) => {
                  const rateItems = items.filter((it) => Number(it.tax_rate) === rate)
                  if (!rateItems.length) return null
                  const taxable = rateItems.reduce((s, it) => s + (Number(it.quantity) * Number(it.unit_price)), 0)
                  const tax = rateItems.reduce((s, it) => s + Number(it.tax_amount), 0)
                  return (
                    <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-2)' }}>GST {rate}% on {fmt.currency(taxable)}</span>
                      <span style={{ fontWeight: 600 }}>{fmt.currency(tax)}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Item Count */}
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
              {items.length} line item{items.length !== 1 ? 's' : ''}
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={14} /> : isNew ? 'Create Invoice' : 'Save Invoice'}
            </button>
          </div>
        </div>
      </div>

      {showWarranty && (
        <WarrantyClaimModal
          customerId={customerId}
          customerName={customerName}
          invoiceId={id}
          invoiceNumber={number}
          onClose={() => setShowWarranty(false)}
        />
      )}

      {scanOpen && (
        <ProductScanModal
          onClose={() => setScanOpen(false)}
          onSelect={addProductLine}
        />
      )}

      {payOpen && existingInv && (
        <RecordPaymentModal
          invoice={existingInv}
          onClose={() => setPayOpen(false)}
          onSuccess={() => qc.invalidateQueries(['invoice', id])}
        />
      )}
    </div>
  )
}
