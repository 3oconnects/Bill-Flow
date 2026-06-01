import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Modal from '@/components/Modal'
import { Plus, Trash2, RefreshCw, Calendar, AlertCircle } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { customersApi } from '@/api'

const FREQUENCIES = [
  { value: 'daily',      label: 'Daily',     hint: 'Every day' },
  { value: 'weekly',     label: 'Weekly',    hint: 'Every 7 days' },
  { value: 'bimonthly',  label: 'Bi-Monthly',hint: 'Every 2 weeks' },
  { value: 'monthly',    label: 'Monthly',   hint: 'Same day each month' },
  { value: 'quarterly',  label: 'Quarterly', hint: 'Every 3 months' },
  { value: 'biannual',   label: 'Bi-Annual', hint: 'Every 6 months' },
  { value: 'yearly',     label: 'Yearly',    hint: 'Once a year' },
]

const GST_RATES = [0, 5, 12, 18, 28]
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED']

const defaultItem = () => ({
  id: Date.now() + Math.random(),
  description: '',
  qty: 1,
  unitPrice: 0,
  gstRate: 18,
})

export default function RecurringInvoiceModal({ onClose, onSave }) {
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list })

  const [form, setForm] = useState({
    name: '',
    customerId: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    neverEnds: true,
    currency: 'INR',
    paymentTerms: '30',
    autoSend: true,
    notes: '',
  })
  const [items, setItems] = useState([defaultItem()])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const addItem = () => setItems(p => [...p, defaultItem()])
  const removeItem = (id) => setItems(p => p.filter(i => i.id !== id))
  const updateItem = (id, key, val) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [key]: val } : i))

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const tax      = items.reduce((s, i) => s + i.qty * i.unitPrice * (i.gstRate / 100), 0)
  const total    = subtotal + tax

  const selectedCustomer = customers.find(c => String(c.id) === String(form.customerId))
  const freq = FREQUENCIES.find(f => f.value === form.frequency)

  const validate = () => {
    const e = {}
    if (!form.name.trim())       e.name = 'Template name is required'
    if (!form.customerId)        e.customerId = 'Customer is required'
    if (!form.startDate)         e.startDate = 'Start date is required'
    if (items.every(i => !i.description.trim())) e.items = 'Add at least one item'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    onSave?.({
      ...form,
      customerName: selectedCustomer?.name,
      items,
      subtotal,
      tax,
      total,
      status: 'active',
      nextRunDate: form.startDate,
    })
    setSaving(false)
  }

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        <RefreshCw size={14} />
        {saving ? 'Creating…' : 'Create Recurring Invoice'}
      </button>
    </>
  )

  return (
    <Modal title="New Recurring Invoice" onClose={onClose} size="xl" footer={footer}>
      <div className="po-form-standard">

        {/* ── Row 1: Template details ── */}
        <div className="responsive-grid cols-1-1" style={{ marginBottom: 28, gap: 40 }}>

          {/* Left column */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Template Name *</label>
              <div style={{ flex: 1 }}>
                <input
                  className={`form-input sm${errors.name ? ' input-error' : ''}`}
                  placeholder="e.g. Monthly Retainer – Acme Corp"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
                {errors.name && <div className="field-error">{errors.name}</div>}
              </div>
            </div>

            <div className="form-group-row">
              <label>Customer *</label>
              <div style={{ flex: 1 }}>
                <select
                  className={`form-select sm${errors.customerId ? ' input-error' : ''}`}
                  value={form.customerId}
                  onChange={e => set('customerId', e.target.value)}
                >
                  <option value="">Select customer…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.customerId && <div className="field-error">{errors.customerId}</div>}
              </div>
            </div>

            {selectedCustomer && (
              <div style={{ marginLeft: 100, padding: '8px 12px', background: 'var(--c-primary-lt)', borderRadius: 8, fontSize: 12, color: 'var(--c-primary)' }}>
                {selectedCustomer.email && <div>📧 {selectedCustomer.email}</div>}
                {selectedCustomer.gstin && <div>🏛 GSTIN: {selectedCustomer.gstin}</div>}
              </div>
            )}

            <div className="form-group-row" style={{ marginTop: 8 }}>
              <label>Currency</label>
              <select className="form-select sm" value={form.currency} onChange={e => set('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group-row">
              <label>Payment Terms</label>
              <select className="form-select sm" value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)}>
                <option value="0">Due on receipt</option>
                <option value="7">Net 7 days</option>
                <option value="15">Net 15 days</option>
                <option value="30">Net 30 days</option>
                <option value="45">Net 45 days</option>
                <option value="60">Net 60 days</option>
              </select>
            </div>
          </div>

          {/* Right column */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Frequency</label>
              <div style={{ flex: 1 }}>
                <select className="form-select sm" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                  {FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                {freq && (
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--c-text3)' }}>
                    <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {freq.hint}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group-row">
              <label>Start Date *</label>
              <div style={{ flex: 1 }}>
                <input
                  type="date"
                  className={`form-input sm${errors.startDate ? ' input-error' : ''}`}
                  value={form.startDate}
                  onChange={e => set('startDate', e.target.value)}
                />
                {errors.startDate && <div className="field-error">{errors.startDate}</div>}
              </div>
            </div>

            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ paddingTop: 6 }}>End Date</label>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={form.neverEnds}
                    onChange={e => set('neverEnds', e.target.checked)}
                  />
                  <span style={{ fontSize: 12 }}>Never ends (runs indefinitely)</span>
                </label>
                {!form.neverEnds && (
                  <input
                    type="date"
                    className="form-input sm"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={e => set('endDate', e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="form-group-row" style={{ alignItems: 'center' }}>
              <label>Auto-Send</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={form.autoSend}
                  onChange={e => set('autoSend', e.target.checked)}
                />
                <span style={{ fontSize: 12 }}>
                  Automatically email invoice to customer on each cycle
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Line items ── */}
        {errors.items && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--c-danger)', fontSize: 12 }}>
            <AlertCircle size={14} /> {errors.items}
          </div>
        )}
        <div className="tab-content-area" style={{ background: 'white', border: `1px solid ${errors.items ? 'var(--c-danger)' : 'var(--c-border)'}`, borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}>
          <table className="line-items-table compact" style={{ borderCollapse: 'collapse', border: 'none', width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--c-surface2)' }}>
                <th style={{ width: 36, textAlign: 'center' }}>#</th>
                <th>Description</th>
                <th style={{ width: 70, textAlign: 'right' }}>Qty</th>
                <th style={{ width: 130, textAlign: 'right' }}>Unit Price</th>
                <th style={{ width: 90, textAlign: 'center' }}>GST %</th>
                <th style={{ width: 130, textAlign: 'right' }}>Amount</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--c-text3)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                  <td>
                    <input
                      className="table-input"
                      placeholder="Service / product description"
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input text-right"
                      type="number" min="0.01" step="0.01"
                      value={item.qty}
                      onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input text-right"
                      type="number" min="0" step="0.01"
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
                    {fmt.currency(item.qty * item.unitPrice)}
                  </td>
                  <td>
                    {items.length > 1 && (
                      <button className="action-icon-btn red" onClick={() => removeItem(item.id)} title="Remove">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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

        {/* ── Notes + Totals ── */}
        <div className="responsive-grid cols-2-1" style={{ alignItems: 'flex-start' }}>
          <div className="form-section-compact">
            <div className="form-group-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ marginTop: 6 }}>Notes</label>
              <textarea
                className="form-input sm"
                rows={3}
                placeholder="e.g. Monthly retainer for design services as agreed in contract dated…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>

          <div style={{ padding: '14px 20px', background: 'var(--c-surface2)', borderRadius: 12 }}>
            <div className="summary-row">
              <span>Subtotal</span>
              <span className="font-mono">{fmt.currency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>GST</span>
              <span className="font-mono">{fmt.currency(tax)}</span>
            </div>
            <div className="summary-row total" style={{ borderTopColor: 'var(--c-border2)' }}>
              <span style={{ fontWeight: 700 }}>Total / cycle</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--c-primary)' }} className="font-mono">
                {fmt.currency(total)}
              </span>
            </div>

            {/* Next run preview */}
            {form.startDate && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--c-primary-lt)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  First invoice on
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary)' }}>
                  {new Date(form.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 2 }}>
                  {form.autoSend ? '📧 Will be auto-sent to customer' : '📋 Will be saved as draft'}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </Modal>
  )
}
