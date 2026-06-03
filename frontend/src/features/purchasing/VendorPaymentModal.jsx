import { useState } from 'react'
import { Modal, Badge, EmptyState } from '@/components/ui'
import { Plus, Trash2, DollarSign, Calendar, FileText } from 'lucide-react'
import { fmt } from '@/lib/utils'

export default function VendorPaymentModal({ isOpen, onClose, onSave, paymentData }) {
  const [formData, setFormData] = useState(paymentData || {
    vendor: '',
    vendorName: '',
    amount: 0,
    paymentMethod: 'bank',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    status: 'pending',
    notes: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={() => onSave?.(formData)}>Record Payment</button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Vendor Payment" size="lg" footer={footer}>
      <div className="po-form-standard">
        {/* Payment Details */}
        <div className="responsive-grid cols-1-1" style={{ marginBottom: 32, gap: 48 }}>
          {/* Left: Vendor & Amount */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Vendor / Supplier</label>
              <input
                type="text"
                name="vendor"
                className="form-input sm"
                placeholder="Search or select vendor..."
                value={formData.vendor}
                onChange={handleChange}
              />
            </div>
            <div className="form-group-row">
              <label>Vendor Name</label>
              <input
                type="text"
                name="vendorName"
                className="form-input sm disabled"
                placeholder="Auto-populated"
                value={formData.vendorName}
                readOnly
              />
            </div>
            <div className="form-group-row">
              <label>Payment Amount</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--c-text3)' }} />
                <input
                  type="number"
                  name="amount"
                  className="form-input sm"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  style={{ paddingLeft: 32 }}
                />
              </div>
            </div>
            <div className="form-group-row">
              <label>Reference Number</label>
              <input
                type="text"
                name="referenceNumber"
                className="form-input sm"
                placeholder="Cheque#, Reference ID, etc."
                value={formData.referenceNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Right: Payment Method & Date */}
          <div className="form-section-compact">
            <div className="form-group-row">
              <label>Payment Method</label>
              <select name="paymentMethod" className="form-select sm" value={formData.paymentMethod} onChange={handleChange}>
                <option value="bank">Bank Transfer / NEFT</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI / Digital Wallet</option>
                <option value="credit">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group-row">
              <label>Payment Date</label>
              <input
                type="date"
                name="paymentDate"
                className="form-input sm"
                value={formData.paymentDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group-row">
              <label>Status</label>
              <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
                <Badge status={formData.status} label={formData.status.charAt(0).toUpperCase() + formData.status.slice(1)} />
              </div>
            </div>
            <div className="form-group-row">
              <label>Notes</label>
              <textarea
                name="notes"
                className="form-input sm"
                rows={3}
                placeholder="Payment notes or remarks..."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="form-section-compact" style={{ padding: '12px 24px', background: 'var(--c-surface2)', borderRadius: 12 }}>
          <div className="summary-row">
            <span style={{ fontWeight: 700, color: 'var(--c-text)' }}>Payment Amount Due</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--c-primary)' }} className="font-mono">
              {fmt.currency(formData.amount)}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
