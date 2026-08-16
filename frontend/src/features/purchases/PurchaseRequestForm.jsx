import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { purchaseRequestsApi, productsApi } from '@/api'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import ProductCombobox from '@/features/products/ProductCombobox'

export default function PurchaseRequestForm({ initial, isOpen, onClose }) {
  const qc = useQueryClient()
  const isEditing = !!initial

  const [formData, setFormData] = useState({
    request_number: '',
    department: '',
    requested_by_name: '',
    status: 'draft',
    required_date: '',
    notes: '',
    items: []
  })

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })

  useEffect(() => {
    if (initial) {
      setFormData({
        request_number: initial.request_number || '',
        department: initial.department || '',
        requested_by_name: initial.requested_by_name || '',
        status: initial.status || 'draft',
        required_date: initial.required_date || '',
        notes: initial.notes || '',
        items: initial.items || []
      })
    } else {
      setFormData(prev => ({
        ...prev,
        request_number: `PR-${Math.floor(Math.random() * 100000)}`,
        required_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0] // 7 days from now
      }))
    }
  }, [initial])

  const saveMut = useMutation({
    mutationFn: (data) => isEditing ? purchaseRequestsApi.update(initial.id, data) : purchaseRequestsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['purchaseRequests'])
      toast.success(isEditing ? 'Request updated' : 'Request created')
      onClose()
    },
    onError: (e) => toast.error(e.message)
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.items.length === 0) return toast.error('Please add at least one item')
    saveMut.mutate(formData)
  }

  const addProductLine = (prod) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: prod.id,
        item_name: prod.name,
        qty: 1,
        unit: prod.unit || 'pcs'
      }]
    }))
  }

  const updateLine = (idx, field, val) => {
    const newItems = [...formData.items]
    newItems[idx][field] = val
    setFormData({ ...formData, items: newItems })
  }

  const removeLine = (idx) => {
    const newItems = [...formData.items]
    newItems.splice(idx, 1)
    setFormData({ ...formData, items: newItems })
  }

  return (
    <Modal title={isEditing ? 'Edit Purchase Request' : 'New Purchase Request'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Request Number *</label>
            <input className="form-input" required value={formData.request_number} onChange={e => setFormData({...formData, request_number: e.target.value})} disabled={isEditing} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Department</label>
            <select className="form-input" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
              <option value="">Select Department...</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Operations">Operations</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="Warehouse">Warehouse</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Requested By</label>
            <input className="form-input" placeholder="Name" value={formData.requested_by_name} onChange={e => setFormData({...formData, requested_by_name: e.target.value})} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Required Date</label>
            <input type="date" className="form-input" value={formData.required_date} onChange={e => setFormData({...formData, required_date: e.target.value})} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Status</label>
            <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="converted">Converted to PO</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Notes / Justification</label>
          <textarea className="form-input" rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
        </div>

        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontWeight: 600 }}>Requested Items</h4>
            <div style={{ width: 300 }}>
              <ProductCombobox products={products} onPick={addProductLine} placeholder="Search product..." />
            </div>
          </div>
          
          {formData.items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', background: 'var(--c-bg)', borderRadius: 8, color: 'var(--c-text3)' }}>
              No items added. Select a product to request.
            </div>
          ) : (
            <table className="data-table" style={{ border: '1px solid var(--c-border)' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: 120 }}>Qty</th>
                  <th style={{ width: 120 }}>Unit</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input className="form-input" value={item.item_name} onChange={e => updateLine(idx, 'item_name', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className="form-input" value={item.qty} onChange={e => updateLine(idx, 'qty', Number(e.target.value))} />
                    </td>
                    <td>
                      <input className="form-input" value={item.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} />
                    </td>
                    <td>
                      <button type="button" className="btn-icon-sm danger" onClick={() => removeLine(idx)}><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving...' : 'Save Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
