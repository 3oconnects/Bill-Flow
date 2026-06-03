import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { fmt } from '@/lib/utils'

export default function APItemRow({ item, idx, products, disabled, onUpdate, onRemove, onSelectProduct }) {
  const [pq, setPQ]       = useState('')
  const [showDrop, setSD] = useState(false)
  const filtered = pq ? products.filter(p =>
    p.name?.toLowerCase().includes(pq.toLowerCase()) ||
    p.sku?.toLowerCase().includes(pq.toLowerCase())
  ) : []

  return (
    <tr>
      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text3)' }}>{idx + 1}</td>
      <td><input className="table-input" value={item.item_code} onChange={e => onUpdate('item_code', e.target.value)} disabled={disabled} style={{ width: '100%' }} /></td>
      <td style={{ position: 'relative' }}>
        <input className="table-input" value={item.item_name}
          onChange={e => { onUpdate('item_name', e.target.value); setPQ(e.target.value); setSD(true) }}
          onFocus={() => setSD(true)}
          disabled={disabled} placeholder="Search…" style={{ width: '100%' }} />
        {showDrop && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 700, background: 'white',
            border: '1px solid var(--c-border)', borderRadius: 6, boxShadow: 'var(--shadow-md)',
            maxHeight: 150, overflowY: 'auto', minWidth: 200 }}>
            {filtered.slice(0, 8).map(p => (
              <div key={p.id} className="dropdown-item"
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
                onClick={() => { onSelectProduct(p); setPQ(''); setSD(false) }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: 'var(--c-text2)' }}>{p.sku} · ₹{p.purchase_price}</div>
              </div>
            ))}
          </div>
        )}
      </td>
      <td><input className="table-input" value={item.description} onChange={e => onUpdate('description', e.target.value)} disabled={disabled} style={{ width: '100%' }} /></td>
      <td><input className="table-input text-right" type="number" min="0.001" value={item.quantity} onChange={e => onUpdate('quantity', parseFloat(e.target.value)||0)} disabled={disabled} /></td>
      <td><input className="table-input text-right" type="number" min="0" value={item.unit_price} onChange={e => onUpdate('unit_price', parseFloat(e.target.value)||0)} disabled={disabled} /></td>
      <td><input className="table-input text-right" type="number" min="0" max="100" value={item.discount} onChange={e => onUpdate('discount', parseFloat(e.target.value)||0)} disabled={disabled} /></td>
      <td>
        <select className="table-input" value={item.tax_rate} onChange={e => onUpdate('tax_rate', parseFloat(e.target.value))} disabled={disabled} style={{ textAlign: 'center' }}>
          {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--c-text2)', padding: '0 6px' }}>{fmt.currency(item.tax_amount)}</td>
      <td style={{ textAlign: 'right', fontWeight: 700, padding: '0 6px' }}>{fmt.currency(item.line_total)}</td>
      {!disabled && <td><button className="action-icon-btn red" onClick={onRemove}><Trash2 size={13} /></button></td>}
    </tr>
  )
}
