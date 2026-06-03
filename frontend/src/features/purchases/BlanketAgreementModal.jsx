import { useState } from 'react'
import { Modal, Badge, EmptyState } from '@/components/ui'
import { Plus, Trash2, Calendar, Paperclip } from 'lucide-react'
import { fmt } from '@/lib/utils'

export default function BlanketAgreementModal({ isOpen, onClose, onSave }) {
  const [items, setItems] = useState([{ id: 1, itemCode: '', description: '', qty: 1, price: 0, discount: 0 }])
  const [activeTab, setActiveTab] = useState('contents')

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0)
  const total = subtotal

  const addItem = () => setItems([...items, { id: Date.now(), itemCode: '', description: '', qty: 1, price: 0, discount: 0 }])
  const removeItem = (id) => setItems(items.filter(i => i.id !== id))

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={() => onSave?.()}>Create Agreement</button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Blanket Agreement" size="xl" footer={footer}>
      <div className="po-form-standard">
        {/* Header Metadata */}
        <div className="responsive-grid cols-1-1" style={{ marginBottom: 32, gap: 48 }}>
          {/* Left: Vendor & Terms */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Vendor</label>
              <div className="input-group-compact">
                <input type="text" className="form-input sm" placeholder="Select Vendor..." />
                <button className="btn-icon-sm" title="Add New Vendor"><Plus size={14} /></button>
              </div>
            </div>
            <div className="form-group-row">
              <label>Vendor Name</label>
              <input type="text" className="form-input sm disabled" placeholder="Auto-populated" readOnly />
            </div>
            <div className="form-group-row">
              <label>Contact Person</label>
              <select className="form-select sm"><option>Select...</option></select>
            </div>
            <div className="form-group-row">
              <label>Agreement Type</label>
              <select className="form-select sm">
                <option>Quantity-based</option>
                <option>Value-based</option>
                <option>Time-based</option>
              </select>
            </div>
            <div className="form-group-row">
              <label>Currency</label>
              <select className="form-select sm"><option>Local Currency (INR)</option></select>
            </div>
          </div>

          {/* Right: Document Info */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Agreement No.</label>
              <div className="input-group-compact">
                <select className="form-select sm" style={{ width: 100 }}><option>Primary</option></select>
                <input type="text" className="form-input sm" value="BA-2024-001" readOnly style={{ fontWeight: 600 }} />
              </div>
            </div>
            <div className="form-group-row">
              <label>Status</label>
              <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                <Badge status="draft" label="Draft" />
              </div>
            </div>
            <div className="form-group-row">
              <label>Start Date</label>
              <input type="date" className="form-input sm" />
            </div>
            <div className="form-group-row">
              <label>End Date</label>
              <input type="date" className="form-input sm" />
            </div>
            <div className="form-group-row">
              <label>Review Frequency</label>
              <select className="form-select sm">
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Annual</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Tabs */}
        <div className="tabs" style={{ marginBottom: 0, gap: 4 }}>
          <button className={`tab-btn${activeTab === 'contents' ? ' active' : ''}`} onClick={() => setActiveTab('contents')}>Line Items</button>
          <button className={`tab-btn${activeTab === 'terms' ? ' active' : ''}`} onClick={() => setActiveTab('terms')}>Terms & Conditions</button>
          <button className={`tab-btn${activeTab === 'attachments' ? ' active' : ''}`} onClick={() => setActiveTab('attachments')}>Attachments</button>
        </div>

        {/* Tab Content */}
        <div className="tab-content-area" style={{ background: 'white', border: '1px solid var(--c-border)', borderTop: 'none', padding: '0px', borderRadius: '0 0 8px 8px', marginBottom: 24, overflow: 'hidden' }}>
          {activeTab === 'contents' && (
            <div className="items-grid-wrapper">
              <table className="line-items-table compact">
                <thead>
                  <tr style={{ background: 'var(--c-surface2)' }}>
                    <th style={{ width: 40 }}>#</th>
                    <th>Item Code</th>
                    <th>Description</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Unit</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Max Qty</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Unit Price</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--c-text3)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                      <td><input className="table-input" placeholder="Item No." /></td>
                      <td><input className="table-input" placeholder="Description" /></td>
                      <td><select className="table-select"><option>EA</option><option>BOX</option></select></td>
                      <td><input className="table-input text-right" type="number" placeholder="0" /></td>
                      <td><input className="table-input text-right" type="number" placeholder="0.00" /></td>
                      <td>
                        <button className="action-icon-btn red" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
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
          )}

          {activeTab === 'terms' && (
            <div className="responsive-grid cols-1" style={{ padding: 24, gap: 16 }}>
              <div className="form-section">
                <h4 className="section-title">Payment Terms</h4>
                <select className="form-select sm"><option>Net 30 Days</option></select>
              </div>
              <div className="form-section">
                <h4 className="section-title">Minimum Order Value</h4>
                <input type="number" className="form-input sm" placeholder="0.00" />
              </div>
              <div className="form-section">
                <h4 className="section-title">Volume Discount Structure</h4>
                <textarea className="form-input sm" rows={4} placeholder="Define discount tiers..."></textarea>
              </div>
              <div className="form-section">
                <h4 className="section-title">Special Conditions</h4>
                <textarea className="form-input sm" rows={3} placeholder="Any special conditions or exclusions..."></textarea>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div style={{ padding: 48 }}>
              <EmptyState icon={<Paperclip size={32} />} title="No attachments" description="Attach agreement documents, terms, or specifications." />
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="form-section-compact" style={{ padding: '12px 24px', background: 'var(--c-surface2)', borderRadius: 12 }}>
          <div className="summary-row">
            <span>Estimated Total Value</span>
            <span className="font-mono">{fmt.currency(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
