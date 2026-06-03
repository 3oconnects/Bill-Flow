import { useState } from 'react'
import { Info, ChevronDown } from 'lucide-react'
import { S } from './DetailShared'

export default function ProductKnowledgeCard({ p }) {
  const [open, setOpen] = useState(true)
  const margin = p.unit_price > 0 ? (((p.unit_price - p.purchase_price) / p.unit_price) * 100).toFixed(1) : '0.0'
  const mc = Number(margin) >= 20 ? '#10b981' : Number(margin) >= 10 ? '#f59e0b' : '#ef4444'
  const warranty = p.warranty_type && p.warranty_type !== 'none' && p.warranty_duration ? `${p.warranty_duration} ${p.warranty_unit} ${p.warranty_type}` : null
  const guarantee = p.guarantee_type && p.guarantee_type !== 'none' && p.guarantee_duration ? `${p.guarantee_duration} ${p.guarantee_unit} ${p.guarantee_type}` : null
  const fields = [
    p.brand         && { e: '🏷️', l: 'Brand',     v: p.brand },
    p.model_number  && { e: '🔢', l: 'Model',     v: p.model_number, mono: true },
    p.category      && { e: '📂', l: 'Category',  v: p.category },
    p.unit          && { e: '📦', l: 'Unit',      v: p.unit },
    p.hsn_code      && { e: '#️⃣', l: 'HSN Code',  v: p.hsn_code, mono: true },
    p.sku           && { e: '🔖', l: 'SKU',       v: p.sku, mono: true },
    warranty        && { e: '🛡️', l: 'Warranty',  v: warranty },
    guarantee       && { e: '✅', l: 'Guarantee', v: guarantee },
  ].filter(Boolean)

  return (
    <div style={{ background: 'var(--bg-1,#fff)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#6366f108', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid var(--border)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Info size={12} color="#fff" />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Product Knowledge</span>
        </div>
        <ChevronDown size={13} color="#94a3b8" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', background: mc + '12', borderRadius: 8, marginBottom: 12, border: `1px solid ${mc}22` }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: mc, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Margin</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: mc, lineHeight: 1.1 }}>{margin}%</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>₹{(p.unit_price - p.purchase_price).toLocaleString('en-IN')} / unit</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: mc + '20', color: mc }}>
                {Number(margin) >= 20 ? 'Healthy' : Number(margin) >= 10 ? 'Moderate' : 'Low'}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>incl. GST</div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                ₹{Math.round(p.unit_price * (1 + p.tax_rate / 100)).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {fields.map((f, i) => (
            <div key={f.l} style={S.row(i === fields.length - 1)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>{f.e}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{f.l}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', fontFamily: f.mono ? 'monospace' : 'inherit', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.v}</span>
            </div>
          ))}

          {p.description && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{p.description}</div>
            </div>
          )}

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Status</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: p.is_active ? '#ecfdf5' : '#f3f4f6', color: p.is_active ? '#10b981' : '#6b7280' }}>
              {p.is_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
