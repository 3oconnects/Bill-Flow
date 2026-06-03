import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileMinus, Plus } from 'lucide-react'
import { customersApi, invoicesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { REASON_META } from './CreditNotesShared'

export default function CreditNoteForm({ onClose, onSave }) {
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })
  const { data: invoices  = [] } = useQuery({ queryKey: ['invoices'],  queryFn: invoicesApi.list })
  const [form, setForm] = useState({
    customer_name: '', customer_id: '', invoice_id: '', invoice_number: '',
    reason: 'other', notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, amount: 0 }],
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectCustomer = (name) => {
    const c = customers.find(x => x.name === name)
    setForm(f => ({ ...f, customer_name: name, customer_id: c?.id || '' }))
  }
  const selectInvoice = (num) => {
    const inv = invoices.find(x => x.number === num)
    setForm(f => ({ ...f, invoice_number: num, invoice_id: inv?.id || '' }))
  }

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

  const subtotal = form.items.reduce((s, it) => s + (it.amount || 0), 0)
  const taxTotal = form.items.reduce((s, it) => s + (it.tax_amount || 0), 0)
  const total    = subtotal + taxTotal

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
          <div className="form-row cols-2" style={{ marginBottom: 14 }}>
            <div className="form-group m0">
              <label className="form-label req">Customer</label>
              <input className="form-input" list="cn-cust-list" value={form.customer_name}
                onChange={e => selectCustomer(e.target.value)} placeholder="Customer name" />
              <datalist id="cn-cust-list">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div className="form-group m0">
              <label className="form-label">Invoice Reference</label>
              <input className="form-input" list="cn-inv-list" value={form.invoice_number}
                onChange={e => selectInvoice(e.target.value)} placeholder="INV-0001" />
              <datalist id="cn-inv-list">
                {invoices.filter(i => !form.customer_id || i.customer_id === form.customer_id)
                  .map(i => <option key={i.id} value={i.number} />)}
              </datalist>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Reason for Credit Note</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(REASON_META).map(([k, v]) => (
                <button key={k}
                  onClick={() => set('reason', k)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, border: `2px solid ${form.reason === k ? v.color : 'var(--c-border)'}`,
                    background: form.reason === k ? v.color + '18' : 'var(--c-surface)',
                    color: form.reason === k ? v.color : 'var(--c-text2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Internal Notes</label>
            <textarea className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Describe the reason..." />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Items to Credit</div>
          <div className="items-grid" style={{ marginBottom: 10 }}>
            <div className="items-head" style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 28px' }}>
              <span>Description</span><span>Qty</span><span>Price</span><span>Tax %</span><span>Amount</span><span />
            </div>
            {form.items.map((it, i) => (
              <div key={i} className="item-row" style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr 28px' }}>
                <input placeholder="Item being credited" value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                <input type="number" min={1} value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input type="number" min={0} value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                <input type="number" min={0} value={it.tax_rate} onChange={e => updateItem(i, 'tax_rate', e.target.value)} />
                <div className="item-amount">{fmt.currency(it.amount + it.tax_amount)}</div>
                <button className="remove-item" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}>×</button>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { description:'', quantity:1, unit_price:0, tax_rate:18, tax_amount:0, amount:0 }] }))}>
            <Plus size={13} /> Add Item
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
          <button className="btn btn-danger" onClick={() => {
            if (!form.customer_name) return toast.error('Customer required')
            onSave({ ...form, amount: subtotal, tax: taxTotal, total })
          }}>
            <FileMinus size={14} /> Issue Credit Note
          </button>
        </div>
      </div>
    </div>
  )
}
