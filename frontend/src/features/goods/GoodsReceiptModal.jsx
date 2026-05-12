import { useState } from 'react'
import { Modal, Badge, EmptyState } from '@/components/ui'
import { Plus, Trash2, Package, Truck, Paperclip } from 'lucide-react'
import { fmt } from '@/lib/utils'

export default function GoodsReceiptModal({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('contents')
  const [items, setItems] = useState([{ id: 1, itemCode: '', description: '', qty: 1, whse: 'MAIN' }])

  const addItem = () => setItems([...items, { id: Date.now(), itemCode: '', description: '', qty: 1, whse: 'MAIN' }])
  const removeItem = (id) => setItems(items.filter(i => i.id !== id))

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={() => onSave?.()}>Confirm Receipt</button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Goods Receipt PO" size="xl" footer={footer}>
      <div className="po-form-standard">
        {/* Header Metadata */}
        <div className="responsive-grid cols-1-1" style={{ marginBottom: 32, gap: 48 }}>
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Vendor</label>
              <div className="input-group-compact">
                <input type="text" className="form-input sm" placeholder="Select Vendor..." />
                <button className="btn-icon-sm"><Plus size={14} /></button>
              </div>
            </div>
            <div className="form-group-row">
              <label>Name</label>
              <input type="text" className="form-input sm disabled" readOnly />
            </div>
            <div className="form-group-row">
              <label>Base Document</label>
              <div className="input-group-compact">
                <input type="text" className="form-input sm" placeholder="PO Number Reference" />
                <button className="btn-icon-sm" title="Copy from PO">📋</button>
              </div>
            </div>
            <div className="form-group-row">
              <label>Vendor Ref. No.</label>
              <input type="text" className="form-input sm" />
            </div>
          </div>

          <div className="form-section-compact">
            <div className="form-group-row">
              <label>No.</label>
              <div className="input-group-compact">
                <select className="form-select sm" style={{ width: 100 }}><option>Primary</option></select>
                <input type="text" className="form-input sm" value="GR-2024-005" readOnly style={{ fontWeight: 600 }} />
              </div>
            </div>
            <div className="form-group-row">
              <label>Status</label>
              <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                <Badge status="draft" label="Open" />
              </div>
            </div>
            <div className="form-group-row">
              <label>Posting Date</label>
              <input type="date" className="form-input sm" />
            </div>
            <div className="form-group-row">
              <label>Document Date</label>
              <input type="date" className="form-input sm" />
            </div>
          </div>
        </div>

        {/* Form Tabs */}
        <div className="tabs" style={{ marginBottom: 0, gap: 4 }}>
          <button className={`tab-btn${activeTab === 'contents' ? ' active' : ''}`} onClick={() => setActiveTab('contents')}>Contents</button>
          <button className={`tab-btn${activeTab === 'logistics' ? ' active' : ''}`} onClick={() => setActiveTab('logistics')}>Logistics</button>
          <button className={`tab-btn${activeTab === 'attachments' ? ' active' : ''}`} onClick={() => setActiveTab('attachments')}>Attachments</button>
        </div>

        {/* Tab Content */}
        <div className="tab-content-area" style={{ background: 'white', border: '1px solid var(--c-border)', borderTop: 'none', borderRadius: '0 0 8px 8px', marginBottom: 24, overflow: 'hidden' }}>
          {activeTab === 'contents' && (
            <div className="items-grid-wrapper">
              <table className="line-items-table compact">
                <thead>
                  <tr style={{ background: 'var(--c-surface2)' }}>
                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                    <th>Item Code</th>
                    <th>Description</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Qty Received</th>
                    <th style={{ width: 120 }}>Warehouse</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text3)' }}>{idx + 1}</td>
                      <td><input className="table-input" placeholder="Item No." /></td>
                      <td><input className="table-input" placeholder="Description" /></td>
                      <td><input className="table-input text-right" type="number" defaultValue={item.qty} /></td>
                      <td><select className="table-input"><option>MAIN (General)</option><option>WAR-01</option></select></td>
                      <td>
                        <button className="action-icon-btn red" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={6} style={{ padding: '8px 12px' }}>
                      <button className="btn btn-ghost btn-xs" onClick={addItem}>
                        <Plus size={14} /> Add Line Item
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="responsive-grid cols-1-1" style={{ padding: 24 }}>
              <div className="form-section">
                <h4 className="section-title">Delivery Info</h4>
                <textarea className="form-input sm" rows={4} placeholder="Carrier details, tracking, etc."></textarea>
              </div>
              <div className="form-section">
                <h4 className="section-title">Receiving Warehouse</h4>
                <select className="form-select sm"><option>General Warehouse (MAIN)</option></select>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div style={{ padding: 48 }}>
              <EmptyState icon={<Paperclip size={32} />} title="No attachments" description="Attach delivery notes or inspection reports." />
            </div>
          )}
        </div>

        <div className="form-section-compact">
          <div className="form-group-row" style={{ marginTop: 12 }}>
            <label style={{ alignSelf: 'flex-start', marginTop: 8 }}>Remarks</label>
            <textarea className="form-input sm" rows={3} placeholder="Goods receipt remarks..."></textarea>
          </div>
        </div>
      </div>
    </Modal>
  )
}
