import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api'
import { fmt } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { FileSignature, Plus } from 'lucide-react'
import { PROB_COLOR } from './QuotationsShared'

export default function QuotationForm({ onClose, onSave }) {
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', salesperson: '',
    valid_until: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
    notes: '', win_probability: 60,
    items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0 }],
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const updateItem = (i, k, v) => {
    const items = [...form.items]
    items[i] = { ...items[i], [k]: v }
    const qty   = Number(k === 'quantity'   ? v : items[i].quantity)
    const price = Number(k === 'unit_price' ? v : items[i].unit_price)
    const tax   = Number(k === 'tax_rate'   ? v : items[i].tax_rate)
    items[i].amount     = qty * price
    items[i].tax_amount = items[i].amount * tax / 100
    setForm(f => ({ ...f, items }))
  }
  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0 }] }))
  const removeItem = i  => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))
  const subtotal = form.items.reduce((s, it) => s + (it.amount || 0), 0)
  const taxTotal = form.items.reduce((s, it) => s + (it.tax_amount || 0), 0)
  const total    = subtotal + taxTotal

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
          <div className="form-row cols-3" style={{ marginBottom: 16 }}>
            <div className="form-group m0">
              <label className="form-label req">Customer</label>
              <input className="form-input" list="cust-list" value={form.customer_name}
                onChange={e => set('customer_name', e.target.value)} placeholder="Customer name" />
              <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div className="form-group m0">
              <label className="form-label">Customer Email</label>
              <input className="form-input" value={form.customer_email} onChange={e => set('customer_email', e.target.value)} placeholder="email@company.com" />
            </div>
            <div className="form-group m0">
              <label className="form-label">Valid Until</label>
              <input type="date" className="form-input" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} />
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
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Line Items</div>
          <div className="items-grid" style={{ marginBottom: 12 }}>
            <div className="items-head" style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 28px' }}>
              <span>Description</span><span>Qty</span><span>Price (₹)</span><span>GST %</span><span>Amount</span><span />
            </div>
            {form.items.map((it, i) => (
              <div key={i} className="item-row" style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 28px' }}>
                <input placeholder="Product / service" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                <input type="number" min={1} value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input type="number" min={0} value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                <input type="number" min={0} max={28} value={it.tax_rate} onChange={e => updateItem(i, 'tax_rate', e.target.value)} />
                <div className="item-amount">{fmt.currency(it.amount + it.tax_amount)}</div>
                <button className="remove-item" onClick={() => removeItem(i)}>×</button>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={13} /> Add Line</button>
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
          <button className="btn btn-primary" onClick={() => {
            if (!form.customer_name) return toast.error('Customer name required')
            onSave({ ...form, subtotal, tax: taxTotal, total })
          }}>
            <FileSignature size={14} /> Create Quotation
          </button>
        </div>
      </div>
    </div>
  )
}
