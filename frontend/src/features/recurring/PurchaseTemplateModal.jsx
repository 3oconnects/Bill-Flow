import { useState } from 'react'
import Modal from '@/components/Modal'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { fmt } from '@/lib/utils'

const FREQUENCIES = [
  { value: 'daily',     label: 'Daily' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
]

const GST_RATES = [0, 5, 12, 18, 28]

const defaultItem = () => ({
  id: Date.now(),
  description: '',
  qty: 1,
  unitPrice: 0,
  gstRate: 18,
})

export default function PurchaseTemplateModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    vendor: '',
    frequency: 'monthly',
    startDate: '',
    endDate: '',
    paymentMethod: 'NEFT',
    notes: '',
  })
  const [items, setItems] = useState([defaultItem()])
  const [saving, setSaving] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addItem = () => setItems(prev => [...prev, defaultItem()])
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id, key, val) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i))

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const tax = items.reduce((s, i) => s + i.qty * i.unitPrice * (i.gstRate / 100), 0)
  const total = subtotal + tax

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Template name is required.')
    if (!form.vendor.trim()) return alert('Vendor is required.')
    setSaving(true)
    await new Promise(r => setTimeout(r, 400)) // placeholder for API call
    onSave?.({ ...form, items, total })
    setSaving(false)
  }

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        <RefreshCw size={14} /> {saving ? 'Saving…' : 'Create Template'}
      </button>
    </>
  )

  return (
    <Modal title="New Purchase Template" onClose={onClose} size="xl" footer={footer}>
      <div className="po-form-standard">

        {/* Header fields */}
        <div className="responsive-grid cols-1-1" style={{ marginBottom: 28, gap: 40 }}>
          {/* Left */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Template Name *</label>
              <input
                className="form-input sm"
                placeholder="e.g. Monthly Office Supplies"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div className="form-group-row">
              <label>Vendor *</label>
              <input
                className="form-input sm"
                placeholder="Vendor name"
                value={form.vendor}
                onChange={e => set('vendor', e.target.value)}
              />
            </div>
            <div className="form-group-row">
              <label>Payment Method</label>
              <select className="form-select sm" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                {['NEFT', 'UPI', 'Cheque', 'Cash', 'Card'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Frequency</label>
              <select className="form-select sm" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group-row">
              <label>Start Date</label>
              <input type="date" className="form-input sm" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div className="form-group-row">
              <label>End Date</label>
              <input type="date" className="form-input sm" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="tab-content-area" style={{ background: 'white', border: '1px solid var(--c-border)', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
          <table className="line-items-table compact" style={{ borderCollapse: 'collapse', border: 'none', width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--c-surface2)' }}>
                <th style={{ width: 36, textAlign: 'center' }}>#</th>
                <th>Description</th>
                <th style={{ width: 70, textAlign: 'right' }}>Qty</th>
                <th style={{ width: 120, textAlign: 'right' }}>Unit Price</th>
                <th style={{ width: 90, textAlign: 'center' }}>GST %</th>
                <th style={{ width: 120, textAlign: 'right' }}>Amount</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const lineTotal = item.qty * item.unitPrice
                return (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--c-text3)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                    <td>
                      <input
                        className="table-input"
                        placeholder="Item description"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input text-right"
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <input
                        className="table-input text-right"
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={item.unitPrice || ''}
                        onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <select
                        className="table-input"
                        style={{ textAlign: 'center' }}
                        value={item.gstRate}
                        onChange={e => updateItem(item.id, 'gstRate', parseInt(e.target.value))}
                      >
                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="text-right font-mono" style={{ fontSize: 12, paddingRight: 12 }}>
                      {fmt.currency(lineTotal)}
                    </td>
                    <td>
                      {items.length > 1 && (
                        <button className="action-icon-btn red" onClick={() => removeItem(item.id)} title="Remove">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td colSpan={7} style={{ padding: '8px 12px' }}>
                  <button className="btn btn-ghost btn-xs" onClick={addItem}>
                    <Plus size={14} /> Add Line Item
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer: notes + totals */}
        <div className="responsive-grid cols-2-1" style={{ alignItems: 'flex-start' }}>
          <div className="form-section-compact">
            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ marginTop: 6 }}>Notes</label>
              <textarea
                className="form-input sm"
                rows={3}
                placeholder="Internal notes for this template…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>

          <div className="form-section-compact" style={{ padding: '12px 24px', background: 'var(--c-surface2)', borderRadius: 12 }}>
            <div className="summary-row">
              <span>Subtotal</span>
              <span className="font-mono">{fmt.currency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>GST</span>
              <span className="font-mono">{fmt.currency(tax)}</span>
            </div>
            <div className="summary-row total" style={{ borderTopColor: 'var(--c-border2)' }}>
              <span style={{ fontWeight: 700 }}>Total (per cycle)</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--c-primary)' }} className="font-mono">
                {fmt.currency(total)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  )
}
