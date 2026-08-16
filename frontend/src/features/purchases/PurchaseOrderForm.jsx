import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi, vendorsApi, productsApi } from '@/api'
import { Modal } from '@/components/ui'
import { toast } from '@/store/toastStore'
import { Plus, Trash2 } from 'lucide-react'
import VendorCombobox from '@/features/vendors/VendorCombobox'
import ProductCombobox from '@/features/products/ProductCombobox'

const EMPTY_ITEM = { product_id: '', description: '', quantity: 1, unit_price: 0, amount: 0 }

export default function PurchaseOrderForm({ isOpen, onClose, initial }) {
  const qc = useQueryClient()
  const [poNumber, setPoNumber] = useState(initial?.po_number || `PO-${Date.now().toString().slice(-6)}`)
  const [vendorId, setVendorId] = useState(initial?.vendor_id || '')
  const [status, setStatus] = useState(initial?.status || 'draft')
  const [expectedDate, setExpectedDate] = useState(initial?.expected_delivery_date ? initial.expected_delivery_date.split('T')[0] : '')
  const [items, setItems] = useState(initial?.items?.length ? initial.items : [])

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })

  // When a vendor is selected, we can optionally fetch their mapped products to prioritize them
  const { data: vendorProducts = [] } = useQuery({
    queryKey: ['vendorProducts', vendorId],
    queryFn: () => vendorsApi.products(vendorId),
    enabled: !!vendorId
  })

  // Combine products: prioritize vendor's own mapped products, then add the rest
  const productOptions = useMemo(() => {
    if (!vendorId || vendorProducts.length === 0) return products
    const mappedIds = new Set(vendorProducts.map(vp => vp.product_id))
    const mapped = products.filter(p => mappedIds.has(p.id))
    const unmapped = products.filter(p => !mappedIds.has(p.id))
    return [...mapped, ...unmapped]
  }, [products, vendorProducts, vendorId])

  const selectedVendor = vendors.find(v => v.id === vendorId)

  // Calculations
  const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unit_price)), 0)
  const total = subtotal

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (initial) return purchaseOrdersApi.update(initial.id, payload)
      return purchaseOrdersApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries(['purchaseOrders'])
      toast.success(initial ? 'Purchase Order updated' : 'Purchase Order created')
      onClose()
    },
    onError: (e) => toast.error(e.message || 'Failed to save Purchase Order')
  })

  const handleSave = (e) => {
    e.preventDefault()
    if (!vendorId || !selectedVendor) return toast.error('Please select a vendor')
    if (!poNumber.trim()) return toast.error('PO Number is required')

    const cleanItems = items.filter(i => i.description || i.product_id).map(i => ({
      product_id: i.product_id || null,
      description: i.description || '',
      quantity: Number(i.quantity) || 0,
      unit_price: Number(i.unit_price) || 0,
      amount: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0)
    }))

    if (!cleanItems.length) return toast.error('Add at least one item')

    mutation.mutate({
      po_number: poNumber,
      vendor_id: vendorId,
      vendor_name: selectedVendor.name,
      status,
      expected_delivery_date: expectedDate || null,
      subtotal,
      total,
      items: cleanItems
    })
  }

  const updateItem = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].unit_price)
    }
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { ...EMPTY_ITEM, _id: Date.now() }])
  
  const addProductLine = (p) => {
    // If it's linked to the vendor, we might have a specific supply price from vendorProducts
    const vp = vendorProducts.find(x => x.product_id === p.id)
    const unitPrice = vp ? vp.supply_price : p.unit_price || 0

    setItems(prev => {
      // Check if product already exists
      const idx = prev.findIndex(it => it.product_id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        const cur = next[idx]
        const newQty = (Number(cur.quantity) || 0) + 1
        next[idx] = { ...cur, quantity: newQty, amount: newQty * Number(cur.unit_price) }
        return next
      }
      return [...prev, {
        _id: Date.now() + Math.random(),
        product_id: p.id,
        description: p.name,
        quantity: 1,
        unit_price: unitPrice,
        amount: unitPrice
      }]
    })
  }

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const footer = (
    <>
      <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</button>
      <button type="button" className="btn btn-primary" onClick={handleSave} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save Purchase Order'}
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Purchase Order' : 'New Purchase Order'} size="xl" footer={footer}>
      <form onSubmit={handleSave} className="po-form-standard">
        <div className="responsive-grid cols-2" style={{ gap: 24, marginBottom: 24 }}>
          <div className="form-group-row">
            <label>Vendor *</label>
            <div style={{ flex: 1 }}>
              <VendorCombobox vendors={vendors} value={vendorId} onPick={v => setVendorId(v?.id || '')} />
            </div>
          </div>
          <div className="form-group-row">
            <label>PO Number *</label>
            <input className="form-input sm" value={poNumber} onChange={e => setPoNumber(e.target.value)} required />
          </div>
          <div className="form-group-row">
            <label>Status</label>
            <select className="form-select sm" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partially_received">Partially Received</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-group-row">
            <label>Expected Delivery</label>
            <input type="date" className="form-input sm" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
          </div>
        </div>

        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface2)' }}>
            <div style={{ fontWeight: 600 }}>Line Items</div>
            <div style={{ width: 300 }}>
              <ProductCombobox products={productOptions} onPick={addProductLine} placeholder="Search product to add..." />
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Description</th>
                <th className="text-right" style={{ width: 100 }}>Qty</th>
                <th className="text-right" style={{ width: 120 }}>Unit Price</th>
                <th className="text-right" style={{ width: 120 }}>Amount</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center" style={{ padding: '32px 16px', color: 'var(--c-text3)' }}>
                    No items yet. Search and pick a product from the top right.
                  </td>
                </tr>
              )}
              {items.map((it, idx) => (
                <tr key={it._id || idx}>
                  <td>
                    <input className="form-input sm" placeholder="Item description" 
                           value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" className="form-input sm text-right" min="1"
                           value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  </td>
                  <td>
                    <input type="number" className="form-input sm text-right" step="0.01"
                           value={it.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                  </td>
                  <td className="text-right" style={{ verticalAlign: 'middle', fontWeight: 500 }}>
                    {Number(it.amount || 0).toFixed(2)}
                  </td>
                  <td className="text-center">
                    <button type="button" className="btn-icon-sm danger" onClick={() => removeItem(idx)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={addItem}>
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 250, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--c-text2)' }}>
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--c-border)' }}>
              <span>Total</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
