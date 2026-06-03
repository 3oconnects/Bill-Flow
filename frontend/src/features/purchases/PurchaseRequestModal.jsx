import { useState } from 'react'
import { Modal, Badge, EmptyState } from '@/components/ui'
import { Plus, Trash2, Paperclip, Users } from 'lucide-react'
import { fmt } from '@/lib/utils'

export default function PurchaseRequestModal({ isOpen, onClose, onSave }) {
  const [items, setItems] = useState([{ id: 1, itemCode: '', description: '', qty: 1, unit: 'EA', priority: 'normal' }])
  const [activeTab, setActiveTab] = useState('contents')

  const addItem = () => setItems([...items, { id: Date.now(), itemCode: '', description: '', qty: 1, unit: 'EA', priority: 'normal' }])
  const removeItem = (id) => setItems(items.filter(i => i.id !== id))

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={() => onSave?.()}>Submit Request</button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purchase Request" size="xl" footer={footer}>
      <div className="po-form-standard">
        {/* Header Metadata */}
        <div className="responsive-grid cols-1-1" style={{ marginBottom: 32, gap: 48 }}>
          {/* Left: Requester & Department */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Requester</label>
              <input type="text" className="form-input sm" placeholder="Your name" value="Current User" readOnly />
            </div>
            <div className="form-group-row">
              <label>Department</label>
              <select className="form-select sm">
                <option>Select Department...</option>
                <option>Engineering</option>
                <option>Operations</option>
                <option>Marketing</option>
              </select>
            </div>
            <div className="form-group-row">
              <label>Cost Center</label>
              <input type="text" className="form-input sm" placeholder="CC-001" />
            </div>
            <div className="form-group-row">
              <label>Priority</label>
              <select className="form-select sm">
                <option>Normal</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
          </div>

          {/* Right: Document Info */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Request No.</label>
              <div className="input-group-compact">
                <select className="form-select sm" style={{ width: 100 }}><option>Primary</option></select>
                <input type="text" className="form-input sm" value="PR-2024-001" readOnly style={{ fontWeight: 600 }} />
              </div>
            </div>
            <div className="form-group-row">
              <label>Status</label>
              <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                <Badge status="draft" label="Draft" />
              </div>
            </div>
            <div className="form-group-row">
              <label>Posting Date</label>
              <input type="date" className="form-input sm" />
            </div>
            <div className="form-group-row">
              <label>Required Date</label>
              <input type="date" className="form-input sm" />
            </div>
            <div className="form-group-row">
              <label>Delivery Location</label>
              <select className="form-select sm">
                <option>Main Warehouse</option>
                <option>Branch Office</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Tabs */}
        <div className="tabs" style={{ marginBottom: 0, gap: 4 }}>
          <button className={`tab-btn${activeTab === 'contents' ? ' active' : ''}`} onClick={() => setActiveTab('contents')}>Items Needed</button>
          <button className={`tab-btn${activeTab === 'approval' ? ' active' : ''}`} onClick={() => setActiveTab('approval')}>Approvals</button>
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
                    <th style={{ width: 60, textAlign: 'center' }}>Unit</th>
                    <th style={{ width: 70, textAlign: 'right' }}>Qty</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Priority</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--c-text3)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                      <td><input className="table-input" placeholder="Item No." /></td>
                      <td><input className="table-input" placeholder="Description" /></td>
                      <td><select className="table-select"><option>EA</option><option>BOX</option><option>KG</option></select></td>
                      <td><input className="table-input text-right" type="number" placeholder="0" /></td>
                      <td>
                        <select className="table-select">
                          <option>Normal</option>
                          <option>High</option>
                          <option>Urgent</option>
                        </select>
                      </td>
                      <td>
                        <button className="action-icon-btn red" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={7} style={{ padding: '8px 12px' }}>
                      <button className="btn btn-ghost btn-xs" onClick={addItem}>
                        <Plus size={14} /> Add Item
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'approval' && (
            <div className="responsive-grid cols-1" style={{ padding: 24, gap: 16 }}>
              <div className="form-section">
                <h4 className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={16} /> Approval Chain
                </h4>
                <div style={{ background: 'var(--c-surface2)', padding: 12, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span>Department Manager</span>
                    <Badge status="pending" label="Pending" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Finance Approval</span>
                    <Badge status="pending" label="Pending" />
                  </div>
                </div>
              </div>
              <div className="form-section">
                <h4 className="section-title">Business Justification</h4>
                <textarea className="form-input sm" rows={4} placeholder="Explain why this purchase is needed..."></textarea>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div style={{ padding: 48 }}>
              <EmptyState icon={<Paperclip size={32} />} title="No attachments" description="Attach supporting documents or specifications." />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="form-section-compact">
          <div className="form-group-row">
            <label>Notes / Special Instructions</label>
            <textarea className="form-input sm" rows={2} placeholder="Any special instructions or requirements..."></textarea>
          </div>
        </div>
      </div>
    </Modal>
  )
}
