import { useState } from 'react'
import { Modal, Badge, EmptyState } from '@/components/ui'
import { Plus, Trash2, Calendar, FileText, Truck, Landmark, Paperclip, X } from 'lucide-react'
import { fmt } from '@/lib/utils'

export default function PurchaseOrderModal({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('contents')
  const [items, setItems] = useState([{ id: 1, itemCode: '', description: '', qty: 1, price: 0, discount: 0, taxCode: 'P1' }])

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0)
  const total = subtotal // Simplified for demo

  const addItem = () => setItems([...items, { id: Date.now(), itemCode: '', description: '', qty: 1, price: 0, discount: 0, taxCode: 'P1' }])
  const removeItem = (id) => setItems(items.filter(i => i.id !== id))

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={() => onSave?.()}>Create Purchase Order</button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purchase Order" size="xl" footer={footer}>
      <div className="po-form-standard">
        {/* Header Metadata */}
        <div className="responsive-grid cols-1-1" style={{ marginBottom: 32, gap: 48 }}>
          {/* Left Header: Vendor */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Vendor</label>
              <div className="input-group-compact">
                <input type="text" className="form-input sm" placeholder="Select Vendor..." />
                <button className="btn-icon-sm" title="Add New Vendor"><Plus size={14} /></button>
              </div>
            </div>
            <div className="form-group-row">
              <label>Name</label>
              <input type="text" className="form-input sm disabled" placeholder="Vendor Name" readOnly />
            </div>
            <div className="form-group-row">
              <label>Contact Person</label>
              <select className="form-select sm"><option>Select...</option></select>
            </div>
            <div className="form-group-row">
              <label>Vendor Ref. No.</label>
              <input type="text" className="form-input sm" placeholder="Ref #" />
            </div>
            <div className="form-group-row">
              <label>Currency</label>
              <select className="form-select sm"><option>Local Currency (INR)</option></select>
            </div>
          </div>

          {/* Right Header: Document Info */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>No.</label>
              <div className="input-group-compact">
                <select className="form-select sm" style={{ width: 100 }}><option>Primary</option></select>
                <input type="text" className="form-input sm" value="PO-2024-001" readOnly style={{ fontWeight: 600 }} />
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
              <label>Delivery Date</label>
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
          <button className={`tab-btn${activeTab === 'accounting' ? ' active' : ''}`} onClick={() => setActiveTab('accounting')}>Accounting</button>
          <button className={`tab-btn${activeTab === 'attachments' ? ' active' : ''}`} onClick={() => setActiveTab('attachments')}>Attachments</button>
        </div>

        {/* Tab Content */}
        <div className="tab-content-area" style={{ background: 'white', border: '1px solid var(--c-border)', borderTop: 'none', padding: '0px', borderRadius: '0 0 8px 8px', marginBottom: 24, overflow: 'hidden' }}>
          {activeTab === 'contents' && (
            <div className="items-grid-wrapper">
              <table className="line-items-table compact" style={{ borderCollapse: 'collapse', border: 'none' }}>
                <thead>
                  <tr style={{ background: 'var(--c-surface2)' }}>
                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                    <th>Item Code</th>
                    <th>Description</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Qty</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Unit Price</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Total</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--c-text3)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                      <td><input className="table-input" placeholder="Item No." /></td>
                      <td><input className="table-input" placeholder="Description" /></td>
                      <td><input className="table-input text-right" type="number" defaultValue={item.qty} /></td>
                      <td><input className="table-input text-right" type="number" placeholder="0.00" /></td>
                      <td className="text-right font-mono" style={{ fontSize: 12, paddingRight: 12 }}>{fmt.currency(item.qty * item.price)}</td>
                      <td>
                        <button className="action-icon-btn red" onClick={() => removeItem(item.id)} title="Remove Item"><Trash2 size={14} /></button>
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

          {activeTab === 'logistics' && (
            <div className="responsive-grid cols-1-1" style={{ padding: 24 }}>
              <div className="form-section">
                <h4 className="section-title">Ship To</h4>
                <textarea className="form-input sm" rows={4} placeholder="Shipping address details..."></textarea>
              </div>
              <div className="form-section">
                <h4 className="section-title">Ship-from Warehouse</h4>
                <select className="form-select sm"><option>General Warehouse (MAIN)</option></select>
              </div>
            </div>
          )}

          {activeTab === 'accounting' && (
            <div className="responsive-grid cols-1-1" style={{ padding: 24 }}>
              <div className="form-section">
                <h4 className="section-title">Payment Terms</h4>
                <select className="form-select sm"><option>Net 30 Days</option></select>
              </div>
              <div className="form-section">
                <h4 className="section-title">Payment Method</h4>
                <select className="form-select sm"><option>Bank Transfer / NEFT</option></select>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div style={{ padding: 48 }}>
              <EmptyState icon={<Paperclip size={32} />} title="No attachments" description="Drop files here to attach to this Purchase Order." />
            </div>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="responsive-grid cols-2-1" style={{ alignItems: 'flex-start' }}>
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Buyer</label>
              <select className="form-select sm"><option>No Sales Employee</option></select>
            </div>
            <div className="form-group-row">
              <label>Owner</label>
              <input type="text" className="form-input sm" placeholder="Assign system owner..." />
            </div>
            <div className="form-group-row" style={{ marginTop: 12 }}>
              <label style={{ alignSelf: 'flex-start', marginTop: 8 }}>Remarks</label>
              <textarea className="form-input sm" rows={3} placeholder="Internal remarks..."></textarea>
            </div>
          </div>

          <div className="form-section-compact" style={{ padding: '12px 24px', background: 'var(--c-surface2)', borderRadius: 12 }}>
            <div className="summary-row">
              <span>Total Before Discount</span>
              <span className="font-mono">{fmt.currency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <div className="flex items-center gap-2">
                <span>Discount</span>
                <input type="number" className="form-input sm" style={{ width: 60, padding: '2px 8px', height: 28 }} defaultValue={0} />
                <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>%</span>
              </div>
              <span className="font-mono">{fmt.currency(0)}</span>
            </div>
            <div className="summary-row">
              <span>Tax (GST 18%)</span>
              <span className="font-mono">{fmt.currency(0)}</span>
            </div>
            <div className="summary-row total" style={{ borderTopColor: 'var(--c-border2)' }}>
              <span style={{ fontWeight: 700, color: 'var(--c-text)' }}>Total Payment Due</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--c-primary)' }} className="font-mono">{fmt.currency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
