import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { blanketAgreementsApi, vendorsApi, productsApi } from '@/api'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import VendorCombobox from '@/features/vendors/VendorCombobox'
import ProductCombobox from '@/features/products/ProductCombobox'

export default function BlanketAgreementForm({ initial, isOpen, onClose }) {
  const qc = useQueryClient()
  const isEditing = !!initial

  const [formData, setFormData] = useState({
    agreement_number: '',
    vendor_id: '',
    vendor_name: '',
    status: 'active',
    start_date: '',
    end_date: '',
    total_value: '',
    terms: '',
    items: []
  })

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })
  const { data: vendorProducts = [] } = useQuery({
    queryKey: ['vendorProducts', formData.vendor_id],
    queryFn: () => vendorsApi.getProducts(formData.vendor_id),
    enabled: !!formData.vendor_id
  })

  // Prioritize vendor mapped products, then add the rest
  const productOptions = vendorProducts.length > 0
    ? [...vendorProducts, ...products.filter(p => !vendorProducts.find(vp => vp.id === p.id))]
    : products;

  useEffect(() => {
    if (initial) {
      setFormData({
        agreement_number: initial.agreement_number || '',
        vendor_id: initial.vendor_id || '',
        vendor_name: initial.vendor_name || '',
        status: initial.status || 'active',
        start_date: initial.start_date || '',
        end_date: initial.end_date || '',
        total_value: initial.total_value || '',
        terms: initial.terms || '',
        items: initial.items || []
      })
    } else {
      setFormData(prev => ({
        ...prev,
        agreement_number: `BA-${Math.floor(Math.random() * 100000)}`,
        start_date: new Date().toISOString().split('T')[0]
      }))
    }
  }, [initial])

  const saveMut = useMutation({
    mutationFn: (data) => isEditing ? blanketAgreementsApi.update(initial.id, data) : blanketAgreementsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['blanketAgreements'])
      toast.success(isEditing ? 'Agreement updated' : 'Agreement created')
      onClose()
    },
    onError: (e) => toast.error(e.message)
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.vendor_id) return toast.error('Please select a vendor')
    saveMut.mutate(formData)
  }

  const addProductLine = (prod) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: prod.id,
        item_name: prod.name,
        target_qty: 1,
        unit_price: prod.purchase_price || prod.unit_price || 0
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
    <Modal title={isEditing ? 'Edit Blanket Agreement' : 'New Blanket Agreement'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Agreement Number *</label>
            <input className="form-input" required value={formData.agreement_number} onChange={e => setFormData({...formData, agreement_number: e.target.value})} disabled={isEditing} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Vendor *</label>
            <VendorCombobox 
              vendors={vendors}
              value={formData.vendor_id} 
              onPick={v => setFormData({...formData, vendor_id: v?.id || '', vendor_name: v?.name || ''})} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Start Date</label>
            <input type="date" className="form-input" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">End Date</label>
            <input type="date" className="form-input" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Target Value</label>
            <input type="number" className="form-input" value={formData.total_value} onChange={e => setFormData({...formData, total_value: e.target.value})} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Status</label>
            <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Terms & Conditions</label>
          <textarea className="form-input" rows="2" value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} />
        </div>

        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontWeight: 600 }}>Agreement Items / Locked Prices</h4>
            <div style={{ width: 300 }}>
              <ProductCombobox products={productOptions} onPick={addProductLine} placeholder="Search product..." />
            </div>
          </div>
          
          {formData.items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', background: 'var(--c-bg)', borderRadius: 8, color: 'var(--c-text3)' }}>
              No items added. Select a product to add to the agreement.
            </div>
          ) : (
            <table className="data-table" style={{ border: '1px solid var(--c-border)' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: 120 }}>Target Qty</th>
                  <th style={{ width: 150 }}>Locked Unit Price</th>
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
                      <input type="number" className="form-input" value={item.target_qty} onChange={e => updateLine(idx, 'target_qty', Number(e.target.value))} />
                    </td>
                    <td>
                      <input type="number" className="form-input" value={item.unit_price} onChange={e => updateLine(idx, 'unit_price', Number(e.target.value))} />
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
            {saveMut.isPending ? 'Saving...' : 'Save Agreement'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
