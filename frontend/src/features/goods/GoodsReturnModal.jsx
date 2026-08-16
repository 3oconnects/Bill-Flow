import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Badge, EmptyState } from '@/components/ui'
import { Plus, Trash2, RotateCcw, Truck, Paperclip, Scan } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { vendorsApi, productsApi, goodsReceiptsApi, goodsReturnsApi } from '@/api'
import { toast } from '@/store/toastStore'
import VendorCombobox from '@/features/vendors/VendorCombobox'
import ProductCombobox from '@/features/products/ProductCombobox'
import ProductScanModal from '@/features/products/ProductScanModal'
import ReceiptCombobox from './ReceiptCombobox'

import { useEffect } from 'react'

export default function GoodsReturnModal({ isOpen, onClose, onSave, initialData }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('contents')
  const [vendorId, setVendorId] = useState('')
  const [items, setItems] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [baseReceipt, setBaseReceipt] = useState('')
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0])

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })
  const { data: goodsReceipts = [] } = useQuery({ queryKey: ['goodsReceipts'], queryFn: goodsReceiptsApi.list })
  
  const selectedVendor = vendors.find(v => v.id === vendorId)
  
  // Filter receipts for the selected vendor
  const vendorReceipts = vendorId ? goodsReceipts.filter(r => r.vendor_id === vendorId) : []

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setVendorId(initialData.vendor_id || '')
        setBaseReceipt(initialData.base_receipt_no || '')
        setReturnDate(initialData.return_date ? initialData.return_date.split('T')[0] : new Date().toISOString().split('T')[0])
        setRemarks(initialData.remarks || '')
        setItems(initialData.items ? initialData.items.map((i, idx) => ({
          id: i.id || Date.now() + idx,
          product_id: i.product_id,
          itemCode: i.itemCode || '',
          description: i.name || i.description,
          qty: i.qty,
          reason: i.reason || 'Damaged in Transit'
        })) : [])
      } else {
        setVendorId('')
        setBaseReceipt('')
        setReturnDate(new Date().toISOString().split('T')[0])
        setRemarks('')
        setItems([])
      }
    }
  }, [isOpen, initialData])

  const addItem = () => setItems([...items, { id: Date.now(), product_id: '', itemCode: '', description: '', qty: 1, reason: 'Damaged in Transit' }])
  const removeItem = (id) => setItems(items.filter(i => i.id !== id))

  const handleScanSelect = (match, isBundle) => {
    if (isBundle) {
      const newItems = match.map((m, i) => ({
        id: Date.now() + i,
        product_id: m.product.id,
        itemCode: m.product.sku || m.product.barcode || m.product.id,
        description: m.product.name,
        qty: m.qty,
        reason: 'Damaged in Transit'
      }))
      setItems([...items, ...newItems])
    } else {
      const newItem = {
        id: Date.now(),
        product_id: match.id,
        itemCode: match.sku || match.barcode || match.id,
        description: match.name,
        qty: 1,
        reason: 'Damaged in Transit'
      }
      setItems([...items, newItem])
    }
  }

  const handleReceiptSelect = (val) => {
    setBaseReceipt(val)
    const receipt = vendorReceipts.find(r => r.receipt_number === val)
    if (receipt && receipt.items) {
      const returnItems = receipt.items.map(item => ({
        id: Date.now() + Math.random(),
        product_id: item.product_id,
        itemCode: item.itemCode,
        description: item.description,
        qty: item.qty, // Default to returning the full quantity
        reason: 'Damaged in Transit'
      }))
      setItems(returnItems)
      toast.success(`Loaded ${returnItems.length} items from ${val}`)
    }
  }

  const saveMut = useMutation({
    mutationFn: (data) => initialData ? goodsReturnsApi.update(initialData.id, data) : goodsReturnsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goodsReturns'] })
      toast.success(initialData ? 'Goods Return updated' : 'Goods Return created')
      if (onSave) onSave()
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.error || `Failed to ${initialData ? 'update' : 'create'} Goods Return`)
  })

  const handleConfirm = () => {
    if (!vendorId) return toast.error('Please select a vendor')
    if (!items.length) return toast.error('Add at least one item to return')

    saveMut.mutate({
      vendor_id: vendorId,
      vendor_name: selectedVendor?.name,
      base_receipt_no: baseReceipt,
      return_date: returnDate,
      remarks,
      items: items.map(i => ({
        product_id: i.product_id,
        name: i.description,
        qty: i.qty,
        reason: i.reason
      }))
    })
  }

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={handleConfirm} disabled={saveMut.isPending}>
        {saveMut.isPending ? 'Saving...' : (initialData ? 'Save Changes' : 'Confirm Return')}
      </button>
    </>
  )

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Goods Return" : "Goods Return"} size="xl" footer={footer}>
      <div className="po-form-standard">
        {/* Header Metadata */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          <div className="form-section-compact" style={{ flex: 1 }}>
            <div className="form-group-row">
              <label>Vendor</label>
              <div style={{ flex: 1 }}>
                <VendorCombobox vendors={vendors} value={vendorId} onPick={(v) => setVendorId(v?.id || '')} />
              </div>
            </div>
            <div className="form-group-row">
              <label>Name</label>
              <input type="text" className="form-input sm disabled" readOnly value={selectedVendor?.name || ''} />
            </div>
            <div className="form-group-row">
              <label>Base Receipt</label>
              <div className="input-group-compact" style={{ display: 'flex', flex: 1 }}>
                <ReceiptCombobox
                  receipts={vendorReceipts}
                  value={baseReceipt}
                  onPick={handleReceiptSelect}
                />
                <button className="btn-icon-sm" title="Link to Receipt" style={{ marginLeft: 4 }}>📋</button>
              </div>
            </div>
          </div>

          <div className="form-section-compact">
            <div className="form-group-row">
              <label>No.</label>
              <div className="input-group-compact">
                <select className="form-select sm" style={{ width: 100 }}><option>Primary</option></select>
                <input type="text" className="form-input sm" value="GRT-2024-002" readOnly style={{ fontWeight: 600 }} />
              </div>
            </div>
            <div className="form-group-row">
              <label>Status</label>
              <div><Badge status="open" /></div>
            </div>
            <div className="form-group-row">
              <label>Return Date</label>
              <input type="date" className="form-input sm" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
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
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-surface2)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowScanner(true)}>
                    <Scan size={16} style={{ marginRight: 6 }} /> Scan Barcode / Bundle
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={addItem}>
                    <Plus size={16} style={{ marginRight: 6 }} /> Add Blank Row
                  </button>
                </div>
                <div style={{ width: 300 }}>
                  <ProductCombobox 
                    products={products}
                    onPick={(p) => {
                      if (!p) return
                      const newItem = {
                        id: Date.now(),
                        product_id: p.id,
                        itemCode: p.sku || p.barcode || p.id,
                        description: p.name,
                        qty: 1,
                        reason: 'Damaged in Transit'
                      }
                      setItems([...items, newItem])
                    }}
                    placeholder="Search product to add..."
                  />
                </div>
              </div>
              <table className="line-items-table compact">
                <thead>
                  <tr style={{ background: 'var(--c-surface2)' }}>
                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                    <th>Item Code</th>
                    <th>Description</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Qty Return</th>
                    <th style={{ width: 140 }}>Reason</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--c-text3)' }}>
                        No items added. Search for a product or scan a barcode.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text3)' }}>{idx + 1}</td>
                        <td>
                          <input className="table-input" placeholder="Item Code" value={item.itemCode || ''} onChange={(e) => {
                            const next = [...items]; next[idx].itemCode = e.target.value; setItems(next)
                          }} />
                        </td>
                        <td><input className="table-input" placeholder="Description" value={item.description} onChange={(e) => {
                          const next = [...items]; next[idx].description = e.target.value; setItems(next)
                        }} /></td>
                        <td><input className="table-input text-right" type="number" value={item.qty} min={1} onChange={(e) => {
                          const next = [...items]; next[idx].qty = Number(e.target.value) || 0; setItems(next)
                        }} /></td>
                        <td>
                          <select className="table-input" value={item.reason} onChange={(e) => {
                            const next = [...items]; next[idx].reason = e.target.value; setItems(next)
                          }}>
                            <option value="Damaged in Transit">Damaged in Transit</option>
                            <option value="Incorrect Item">Incorrect Item</option>
                            <option value="Quality Failure">Quality Failure</option>
                            <option value="Excess Stock">Excess Stock</option>
                          </select>
                        </td>
                        <td>
                          <button className="action-icon-btn red" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="responsive-grid cols-1-1" style={{ padding: 24 }}>
              <div className="form-section">
                <h4 className="section-title">Return Shipping</h4>
                <textarea className="form-input sm" rows={4} placeholder="Return carrier details..."></textarea>
              </div>
              <div className="form-section">
                <h4 className="section-title">From Warehouse</h4>
                <select className="form-select sm"><option>General Warehouse (MAIN)</option></select>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div style={{ padding: 48 }}>
              <EmptyState icon={<RotateCcw size={32} />} title="No attachments" description="Attach photos of damaged goods or vendor approval emails." />
            </div>
          )}
        </div>

        {/* Remarks Section */}
        <div style={{ marginTop: 24, display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remarks</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: 80, resize: 'vertical' }} 
              placeholder="Reason for return..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
          <div style={{ width: 300 }}>
            {/* Totals could go here */}
          </div>
        </div>
      </div>
    </Modal>

    {showScanner && (
      <ProductScanModal
        onClose={() => setShowScanner(false)}
        onSelect={handleScanSelect}
      />
    )}
    </>
  )
}
