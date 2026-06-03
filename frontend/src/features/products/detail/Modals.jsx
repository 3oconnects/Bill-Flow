import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Minus, Plus } from 'lucide-react'
import { productsApi } from '@/api'
import { toast } from '@/store/toastStore'
import { fmt } from '@/lib/utils'
import { Spinner } from '@/components/ui'

export function StockAdjust({ product: p, onDone }) {
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState('')
  const mut = useMutation({
    mutationFn: () => productsApi.adjustStock(p.id, { delta, reason: reason || 'manual', note: reason }),
    onSuccess: () => { toast.success('Stock updated'); onDone() },
    onError: e => toast.error(e.message),
  })
  return (
    <div>
      <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Current stock</span>
        <strong>{fmt.number(p.stock_qty)} {p.unit}</strong>
      </div>
      <div className="form-group">
        <label className="form-label">Adjustment (+add / −deduct)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setDelta(d => d - 1)}><Minus size={13} /></button>
          <input className="form-input" type="number" step="0.001" value={delta} onChange={e => setDelta(Number(e.target.value))} style={{ textAlign: 'center', width: 110, fontWeight: 700, fontSize: 17 }} />
          <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setDelta(d => d + 1)}><Plus size={13} /></button>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)' }}>New total: <strong>{fmt.number(Number(p.stock_qty) + delta)} {p.unit}</strong></div>
      </div>
      <div className="form-group" style={{ marginTop: 10 }}>
        <label className="form-label">Reason</label>
        <select className="form-select" value={reason} onChange={e => setReason(e.target.value)}>
          <option value="">Select…</option>
          {[['purchase','New Purchase'],['sale','Sale / Dispatched'],['return','Customer Return'],['damaged','Damaged / Write-off'],['count','Count Correction'],['manual','Manual']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary" disabled={delta === 0 || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={13} /> : 'Apply'}</button>
      </div>
    </div>
  )
}

export function LinkVendorModalContent({ productId, existingVendorIds, vendors, onSuccess, onCancel }) {
  const [vendorId, setVendorId] = useState('')
  const [price, setPrice] = useState(0)
  const [primary, setPrimary] = useState(false)
  const mut = useMutation({
    mutationFn: () => productsApi.addVendor(productId, { vendor_id: vendorId, supply_price: price, is_primary: primary }),
    onSuccess: () => { toast.success('Vendor linked'); onSuccess() },
    onError: e => toast.error(e.message),
  })
  return (
    <div>
      <div className="form-group">
        <label className="form-label">Vendor</label>
        <select className="form-select" value={vendorId} onChange={e => setVendorId(e.target.value)}>
          <option value="">Select vendor</option>
          {vendors.filter(v => !existingVendorIds.includes(v.id)).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Supply Price (₹)</label>
        <input className="form-input" type="number" step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} /> Set as primary vendor
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!vendorId || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={13} /> : 'Link Vendor'}</button>
      </div>
    </div>
  )
}
