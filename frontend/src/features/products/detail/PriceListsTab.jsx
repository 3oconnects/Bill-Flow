import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Plus, Tag, Trash2 } from 'lucide-react'
import { productsApi } from '@/api'
import { toast } from '@/store/toastStore'
import { fmt } from '@/lib/utils'
import { S } from './DetailShared'

export default function PriceListsTab({ productId, priceLists, unitPrice, onRefresh }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', price: '', min_qty: 1, currency: 'INR' })
  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  
  const addMut = useMutation({
    mutationFn: d => productsApi.addPriceList(productId, d),
    onSuccess: () => { onRefresh(); setAdding(false); setForm({ label: '', price: '', min_qty: 1, currency: 'INR' }); toast.success('Price added') },
    onError: e => toast.error(e.message),
  })
  
  const delMut = useMutation({
    mutationFn: id => productsApi.removePriceList(productId, id),
    onSuccess: () => { onRefresh(); toast.success('Removed') },
    onError: e => toast.error(e.message),
  })
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Custom Price Tiers</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Retail, wholesale, distributor pricing per quantity</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={13} /> Add Tier</button>
      </div>
      <div style={{ padding: '11px 14px', background: 'var(--accent-light,#eef2ff)', borderRadius: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>Standard (Default)</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Applies unless overridden</div>
        </div>
        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', fontFamily: 'monospace' }}>{fmt.currency(unitPrice)}</span>
      </div>
      
      {adding && (
        <div style={{ padding: 14, border: '2px solid var(--accent)', borderRadius: 10, marginBottom: 12, background: 'var(--accent-light,#eef2ff)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
            {[['Label','text','label'],['Price (₹)','number','price'],['Min Qty','number','min_qty']].map(([l,t,k]) => (
              <div className="form-group" key={k}><label className="form-label">{l}</label><input className="form-input sm" type={t} value={form[k]} onChange={F(k)} /></div>
            ))}
            <div className="form-group"><label className="form-label">Currency</label>
              <select className="form-select sm" value={form.currency} onChange={F('currency')}>
                {['INR','USD','EUR','GBP','AED'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!form.label || !form.price} onClick={() => addMut.mutate(form)}>Save</button>
          </div>
        </div>
      )}
      
      {priceLists.length === 0 && !adding ? (
        <div style={S.empty}><Tag size={26} style={{ marginBottom: 8, opacity: 0.3 }} /><div style={{ fontWeight: 600, fontSize: 13 }}>No custom price tiers</div></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Label','Min Qty','Price','Currency','vs Standard',''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {priceLists.map((pl, i) => {
              const disc = unitPrice > 0 ? (((unitPrice - Number(pl.price)) / unitPrice) * 100).toFixed(1) : 0
              return (
                <tr key={pl.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{pl.label}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace' }}>{pl.min_qty}+</td>
                  <td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>{fmt.currency(pl.price)}</td>
                  <td style={{ ...S.td, fontSize: 12 }}>{pl.currency}</td>
                  <td style={S.td}><span style={{ color: Number(disc) > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 12 }}>{Number(disc) > 0 ? `−${disc}%` : `+${Math.abs(disc)}%`}</span></td>
                  <td style={{ ...S.td, textAlign: 'right' }}><button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => delMut.mutate(pl.id)}><Trash2 size={13} /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
