import { Info } from 'lucide-react'
import { C } from './analyticsEngine'
import { pill } from './AnalysisShared'

export default function RecommendationsTab({ recs }) {
  const priorityStyle = {
    high:   { color: '#fff', bg: C.rose },
    medium: { color: C.amber, bg: C.amber + '18' },
    low:    { color: C.emerald, bg: C.emerald + '18' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Info size={14} color={C.indigo} />
        Recommendations are generated from your historical sales data, inventory levels, margin analysis, and business patterns. Confidence scores reflect data completeness.
      </div>

      {recs.map((r) => {
        const ps = priorityStyle[r.priority]
        return (
          <div key={r.id} style={{ background: '#fff', border: `1px solid ${r.color}28`, borderLeft: `4px solid ${r.color}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Icon */}
              <div style={{ width: 38, height: 38, borderRadius: 10, background: r.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <r.icon size={18} color={r.color} />
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ps.bg, color: ps.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.priority}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#64748b' }}>{r.category}</span>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Why this matters</div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{r.why}</div>
                </div>

                <div style={{ background: r.color + '0a', borderRadius: 8, padding: '10px 12px', marginBottom: 10, border: `1px solid ${r.color}18` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: r.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Suggested Action</div>
                  <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6, fontWeight: 500 }}>{r.action}</div>
                </div>

                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Expected Impact: </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.emerald }}>{r.impact}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Confidence: </span>
                    <div style={{ width: 60, height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                      <div style={{ width: `${r.confidence}%`, height: '100%', background: r.confidence > 80 ? C.emerald : C.amber, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.confidence > 80 ? C.emerald : C.amber }}>{r.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
