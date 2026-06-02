import { fmt } from '@/lib/utils'

const ABC_META = {
  A: { color: '#10b981', bg: '#ecfdf5', border: '#bbf7d0', desc: 'High value · Priority management' },
  B: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', desc: 'Medium value · Standard management' },
  C: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', desc: 'Low value · Minimal investment' },
}

export default function ABCMatrix({ withABC }) {
  const groups = { A: [], B: [], C: [] }
  withABC.forEach(p => groups[p.abcClass]?.push(p))

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>ABC Classification</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Products ranked by inventory value contribution</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
        {['A', 'B', 'C'].map((cls, i) => {
          const meta = ABC_META[cls]
          const items = groups[cls]
          const totalVal = items.reduce((s, p) => s + p.stockValue, 0)
          return (
            <div key={cls} style={{ padding: '14px 16px', borderRight: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: meta.color }}>{cls}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{items.length} products</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{meta.desc}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, marginBottom: 10 }}>{fmt.currency(totalVal)} stock value</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                {items.slice(0, 8).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: 6, background: meta.bg, fontSize: 11 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120, fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontWeight: 700, color: meta.color, flexShrink: 0, marginLeft: 6 }}>{p.margin.toFixed(0)}%</span>
                  </div>
                ))}
                {items.length > 8 && <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingTop: 2 }}>+{items.length - 8} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
