import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, Badge, EmptyState } from '@/components/ui'
import { Plus, Trash2, Package, Truck, Paperclip, Scan } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { vendorsApi, productsApi, goodsReceiptsApi } from '@/api'
import { toast } from '@/store/toastStore'
import VendorCombobox from '@/features/vendors/VendorCombobox'
import ProductCombobox from '@/features/products/ProductCombobox'
import ProductScanModal from '@/features/products/ProductScanModal'

export default function GoodsReceiptModal({ isOpen, onClose, onSave, initialData, readOnly }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('contents')
  const [vendorId, setVendorId] = useState('')
  const [items, setItems] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  
  const [receiptNumber, setReceiptNumber] = useState('')
  const [basePoNo, setBasePoNo] = useState('')
  const [postingDate, setPostingDate] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setReceiptNumber(initialData.receipt_number || '')
        setBasePoNo(initialData.base_po_no || '')
        setVendorId(initialData.vendor_id || '')
        setPostingDate(initialData.posting_date ? initialData.posting_date.split('T')[0] : '')
        setDocumentDate(initialData.document_date ? initialData.document_date.split('T')[0] : '')
        setRemarks(initialData.remarks || '')
        setItems(initialData.items || [])
      } else {
        setReceiptNumber('GR-' + new Date().getFullYear() + '-' + Math.floor(Math.random()*1000).toString().padStart(3, '0'))
        setBasePoNo('')
        setVendorId('')
        setPostingDate('')
        setDocumentDate('')
        setRemarks('')
        setItems([])
      }
      setActiveTab('contents')
    }
  }, [isOpen, initialData])

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list })
  
  const selectedVendor = vendors.find(v => v.id === vendorId)

  const addItem = () => setItems([...items, { id: Date.now(), product_id: '', itemCode: '', description: '', qty: 1, whse: 'MAIN' }])
  const removeItem = (id) => setItems(items.filter(i => i.id !== id))

  const handleScanSelect = (match, isBundle) => {
    if (isBundle) {
      const newItems = match.map((m, i) => ({
        id: Date.now() + i,
        product_id: m.product.id,
        itemCode: m.product.sku || m.product.barcode || m.product.id,
        description: m.product.name,
        qty: m.qty,
        whse: 'MAIN'
      }))
      setItems([...items, ...newItems])
    } else {
      const newItem = {
        id: Date.now(),
        product_id: match.id,
        itemCode: match.sku || match.barcode || match.id,
        description: match.name,
        qty: 1,
        whse: 'MAIN'
      }
      setItems([...items, newItem])
    }
  }

  const saveMut = useMutation({
    mutationFn: goodsReceiptsApi.create,
    onSuccess: () => {
      qc.invalidateQueries(['goodsReceipts'])
      toast.success('Goods Receipt created successfully')
      onSave?.()
      onClose()
    },
    onError: (e) => toast.error(e.message || 'Failed to create Goods Receipt')
  })

  const handleConfirm = () => {
    if (!vendorId) return toast.error('Please select a vendor')
    if (!items.length) return toast.error('Please add at least one item')
    
    saveMut.mutate({
      receipt_number: receiptNumber,
      vendor_id: vendorId,
      vendor_name: selectedVendor?.name || '',
      base_po_no: basePoNo,
      posting_date: postingDate,
      document_date: documentDate,
      status: 'open',
      remarks,
      items
    })
  }

  const footer = (
    <>
      <button className="btn btn-ghost" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
      {!readOnly && (
        <button className="btn btn-primary" onClick={handleConfirm} disabled={saveMut.isPending}>
          {saveMut.isPending ? 'Confirming...' : 'Confirm Receipt'}
        </button>
      )}
    </>
  )

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Goods Receipt PO" size="xl" footer={footer}>
        <div className="po-form-standard">
          {/* Header Metadata */}
          <div className="responsive-grid cols-1-1" style={{ marginBottom: 32, gap: 48 }}>
            <div className="form-section-compact">
              <div className="form-group-row">
                <label>Vendor</label>
                <div style={{ flex: 1 }}>
                  <VendorCombobox vendors={vendors} value={vendorId} onPick={(v) => !readOnly && setVendorId(v?.id || '')} disabled={readOnly} />
                </div>
              </div>
              <div className="form-group-row">
                <label>Name</label>
                <input type="text" className="form-input sm disabled" readOnly value={selectedVendor?.name || ''} />
              </div>
              <div className="form-group-row">
                <label>Base Document</label>
                <div className="input-group-compact">
                  <input type="text" className="form-input sm" placeholder="PO Number Reference" value={basePoNo} onChange={e => !readOnly && setBasePoNo(e.target.value)} disabled={readOnly} />
                  {!readOnly && <button className="btn-icon-sm" title="Copy from PO">📋</button>}
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
                  <select className="form-select sm" style={{ width: 100 }} disabled={readOnly}><option>Primary</option></select>
                  <input type="text" className="form-input sm" value={receiptNumber} onChange={e => !readOnly && setReceiptNumber(e.target.value)} disabled={readOnly} />
                </div>
              </div>
              <div className="form-group-row">
                <label>Status</label>
                <div><Badge status={initialData?.status || 'open'} /></div>
              </div>
              <div className="form-group-row">
                <label>Posting Date</label>
                <input type="date" className="form-input sm" value={postingDate} onChange={e => !readOnly && setPostingDate(e.target.value)} disabled={readOnly} />
              </div>
              <div className="form-group-row">
                <label>Document Date</label>
                <input type="date" className="form-input sm" value={documentDate} onChange={e => !readOnly && setDocumentDate(e.target.value)} disabled={readOnly} />
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
                {!readOnly && (
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
                            whse: 'MAIN'
                          }
                          setItems([...items, newItem])
                        }}
                        placeholder="Search product to add..."
                      />
                    </div>
                  </div>
                )}
                <table className="line-items-table compact">
                  <thead>
                    <tr style={{ background: 'var(--c-surface2)' }}>
                      <th style={{ width: 40, textAlign: 'center' }}>#</th>
                      <th style={{ width: 140 }}>Item Code</th>
                      <th>Description</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Qty Received</th>
                      <th style={{ width: 140 }}>Warehouse</th>
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
                        <tr key={item.id || idx}>
                          <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text3)' }}>{idx + 1}</td>
                          <td>
                            <input className="table-input" placeholder="Item Code" value={item.itemCode || ''} onChange={(e) => {
                              if(readOnly) return;
                              const next = [...items]; next[idx].itemCode = e.target.value; setItems(next)
                            }} disabled={readOnly} />
                          </td>
                          <td><input className="table-input" placeholder="Description" value={item.description} onChange={(e) => {
                            if(readOnly) return;
                            const next = [...items]; next[idx].description = e.target.value; setItems(next)
                          }} disabled={readOnly} /></td>
                          <td><input className="table-input text-right" type="number" value={item.qty} min={1} onChange={(e) => {
                            if(readOnly) return;
                            const next = [...items]; next[idx].qty = Number(e.target.value) || 0; setItems(next)
                          }} disabled={readOnly} /></td>
                          <td>
                            <select className="table-input" value={item.whse} onChange={(e) => {
                              if(readOnly) return;
                              const next = [...items]; next[idx].whse = e.target.value; setItems(next)
                            }} disabled={readOnly}>
                              <option value="MAIN">MAIN (General)</option>
                              <option value="WAR-01">WAR-01</option>
                            </select>
                          </td>
                          <td>
                            {!readOnly && <button className="action-icon-btn red" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>}
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

          {/* Remarks Section */}
          <div style={{ marginTop: 24, display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remarks</label>
              <textarea 
                className="form-input" 
                style={{ minHeight: 80, resize: 'vertical' }} 
                placeholder="Goods receipt remarks..."
                value={remarks}
                onChange={e => !readOnly && setRemarks(e.target.value)}
                disabled={readOnly}
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
