import { useState, useMemo } from 'react'
import {
  X, TrendingUp, Package, Zap, Filter, Award, BarChart2
} from 'lucide-react'
import { computeAnalytics, buildRecommendations, C } from './analysis/analyticsEngine'
import OverviewTab from './analysis/OverviewTab'
import SalesTrendsTab from './analysis/SalesTrendsTab'
import InventoryHealthTab from './analysis/InventoryHealthTab'
import RecommendationsTab from './analysis/RecommendationsTab'
import DeepDiveTab from './analysis/DeepDiveTab'

const MODAL_TABS = [
  { id: 'overview',   label: 'Overview',            icon: Award },
  { id: 'trends',     label: 'Sales Trends',        icon: TrendingUp },
  { id: 'inventory',  label: 'Inventory Health',    icon: Package },
  { id: 'recs',       label: 'Recommendations',     icon: Zap },
  { id: 'deepdive',   label: 'Deep Dive',           icon: Filter },
]

export default function ProductAnalysisModal({ product, salesHistory, stockHistory, onClose }) {
  const [tab, setTab] = useState('overview')

  const analytics = useMemo(() => computeAnalytics(product, salesHistory, stockHistory), [product, salesHistory, stockHistory])
  const recs      = useMemo(() => buildRecommendations(product, analytics), [product, analytics])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '32px 16px', overflowY: 'auto',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#f8fafc', borderRadius: 20, width: '100%', maxWidth: 980,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 64px)', overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChart2 size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Business Intelligence Report</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{product.name} · {product.sku || product.unique_id}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Overall Score</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: analytics.overallScore >= 75 ? C.emerald : analytics.overallScore >= 50 ? C.amber : C.rose }}>{analytics.overallScore}/100</div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal tabs */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', gap: 4, flexShrink: 0 }}>
          {MODAL_TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? C.indigo : '#64748b',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: active ? `2px solid ${C.indigo}` : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
                <t.icon size={13} />
                {t.label}
                {t.id === 'recs' && recs.some(r => r.priority === 'high') && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.rose, display: 'inline-block', marginLeft: 2 }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Modal content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {tab === 'overview'  && <OverviewTab        product={product} analytics={analytics} recs={recs} />}
          {tab === 'trends'    && <SalesTrendsTab     product={product} analytics={analytics} />}
          {tab === 'inventory' && <InventoryHealthTab product={product} analytics={analytics} />}
          {tab === 'recs'      && <RecommendationsTab recs={recs} product={product} analytics={analytics} />}
          {tab === 'deepdive'  && <DeepDiveTab        product={product} salesHistory={salesHistory} stockHistory={stockHistory} />}
        </div>
      </div>
    </div>
  )
}
