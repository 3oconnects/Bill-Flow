import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, ScanLine, Info } from 'lucide-react'
import { warrantyApi, invoicesApi } from '@/api'
import { toast } from '@/store/toastStore'
import { Spinner } from '@/components/ui'
import ProductScanModal from '@/features/products/ProductScanModal'

/**
 * Warranty-claim popup opened from InvoiceDetail.
 *
 * - Customer + invoice are pre-filled (locked).
 * - Product is picked from the invoice's actual line items, OR scanned —
 *   either way, name + SKU + HSN/model auto-fill so the rep can't typo it.
 */
export default function WarrantyClaimModal({
  customerId, customerName,
  invoiceId, invoiceNumber,
  onClose, onCreated,
}) {
  const qc = useQueryClient()
  const [scanOpen, setScanOpen] = useState(false)
  const [form, setForm] = useState({
    invoice_item_id: '',
    product_name: '', model_number: '', sku: '', serial_number: '',
    issue_description: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Pull invoice with items so we can offer the product dropdown.
  const { data: invoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn:  () => invoicesApi.get(invoiceId),
    enabled:  !!invoiceId,
  })
  const items = invoice?.items || []

  // If invoice has exactly one item, pre-select it.
  useEffect(() => {
    if (items.length === 1 && !form.invoice_item_id) {
      const only = items[0]
      setForm(f => ({
        ...f,
        invoice_item_id: only.id,
        product_name: only.description || '',
        model_number: only.hsn_code || '',
        sku: only.sku || '',
      }))
    }
  }, [items, form.invoice_item_id])

  const selectInvoiceItem = (itemId) => {
    const it = items.find(x => x.id === itemId)
    if (!it) { setForm(f => ({ ...f, invoice_item_id: '' })); return }
    setForm(f => ({
      ...f,
      invoice_item_id: it.id,
      product_name: it.description || '',
      model_number: it.hsn_code || f.model_number || '',
      sku: it.sku || '',
    }))
  }

  const onScanned = (p) => {
    const onInvoice = items.find(it => it.product_id === p.id || (p.sku && it.sku === p.sku))
    setForm(f => ({
      ...f,
      invoice_item_id: onInvoice?.id || '',
      product_name: p.name || '',
      model_number: p.hsn_code || onInvoice?.hsn_code || '',
      sku: p.sku || '',
    }))
    if (!onInvoice) {
      toast.error(`"${p.name}" isn't on invoice ${invoiceNumber} — captured as custom`)
    } else {
      toast.success(`Captured ${p.name}`)
    }
  }

  const mutation = useMutation({
    mutationFn: () => warrantyApi.create({
      customer_id:       customerId,
      invoice_id:        invoiceId || null,
      invoice_number:    invoiceNumber || null,
      product_name:      form.product_name,
      model_number:      form.model_number || null,
      serial_number:     form.serial_number || null,
      issue_description: form.issue_description,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['warranty-claims'])
      qc.invalidateQueries(['warranty'])
      toast.success('Warranty claim filed')
      onCreated?.()
      onClose()
    },
    onError: (e) => toast.error(e.message || 'Failed to file claim'),
  })

  const submit = () => {
    if (!customerId)             return toast.error('Missing customer context')
    if (!form.product_name)      return toast.error('Product is required')
    if (!form.issue_description) return toast.error('Describe the issue')
    mutation.mutate()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal modal-md">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="var(--c-primary)" /> Raise Warranty Claim
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{
            background: 'var(--c-surface2, var(--c-bg))', border: '1px solid var(--c-border)',
            borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12,
          }}>
            <div><strong>Customer:</strong> {customerName || '—'}</div>
            {invoiceNumber && <div><strong>Linked invoice:</strong> {invoiceNumber}</div>}
          </div>

          {/* Product picker — invoice items + scan */}
          <div className="form-row cols-2 compact" style={{ marginBottom: 8, alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label req">Product on invoice</label>
              <select className="form-select" value={form.invoice_item_id}
                onChange={e => selectInvoiceItem(e.target.value)}>
                <option value="">
                  {items.length ? '— Pick item from invoice —' : 'Loading invoice items…'}
                </option>
                {items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.description}{it.sku ? ` · ${it.sku}` : ''} (Qty {it.quantity})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Or scan</label>
              <button type="button" className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setScanOpen(true)}>
                <ScanLine size={14} /> Scan QR / Barcode
              </button>
            </div>
          </div>

          {/* If somehow the invoice items are empty / scanner pulled a non-invoice item */}
          {!form.invoice_item_id && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label req">Product name</label>
              <input className="form-input" value={form.product_name}
                onChange={e => set('product_name', e.target.value)}
                placeholder="e.g. iPhone 15 Pro Max" />
            </div>
          )}

          {form.product_name && (
            <div style={{
              marginBottom: 12, padding: '8px 12px', borderRadius: 8,
              background: 'var(--c-primary-lt)', border: '1px solid var(--c-border)',
              fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }}>
              <Info size={12} color="var(--c-primary)" />
              <strong>{form.product_name}</strong>
              {form.sku && <span style={{ fontFamily: 'monospace', color: 'var(--c-text3)' }}>SKU {form.sku}</span>}
              {form.model_number && <span style={{ color: 'var(--c-text3)' }}>HSN/Model {form.model_number}</span>}
            </div>
          )}

          <div className="form-row cols-2 compact" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Model number</label>
              <input className="form-input" style={{ fontFamily: 'monospace' }}
                value={form.model_number} onChange={e => set('model_number', e.target.value)}
                placeholder="e.g. A3106" />
            </div>
            <div className="form-group">
              <label className="form-label">Serial number</label>
              <input className="form-input" style={{ fontFamily: 'monospace' }}
                value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
                placeholder="S/N: 0987654321" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label req">Issue description</label>
            <textarea className="form-input" rows={3} value={form.issue_description}
              onChange={e => set('issue_description', e.target.value)}
              placeholder="Describe the defect or issue…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner size={14} /> : <><Shield size={14} /> File Claim</>}
          </button>
        </div>
      </div>

      {scanOpen && (
        <ProductScanModal onClose={() => setScanOpen(false)} onSelect={onScanned} />
      )}
    </div>
  )
}
