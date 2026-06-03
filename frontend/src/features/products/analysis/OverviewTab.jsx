import {
  TrendingUp, ShoppingBag, BarChart2, Package,
  DollarSign, Activity, Info,
} from 'lucide-react'
import { C, inr, num } from './analyticsEngine'
import { ScoreRing, StatCard, pill } from './AnalysisShared'
import { fmt } from '@/lib/utils'

export default function OverviewTab({ product: p, analytics: a, recs }) {
  const scoreLabel = s => s >= 75 ? 'Excellent' : s >= 55 ? 'Good' : s >= 35 ? 'Fair' : 'Poor'
  const scoreColor = s => s >= 75 ? C.emerald : s >= 55 ? C.amber : C.rose

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Score row */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        {/* Overall score */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)', borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff' }}>
          <ScoreRing score={a.overallScore} size={100} strokeWidth={9} />
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>Overall Score</div>
          <div style={{ fontSize: 11, opacity: 0.7, textAlign: 'center' }}>Based on sales, inventory &amp; margin health</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.2)' }}>
              Class {a.abcClass}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.2)' }}>
              {scoreLabel(a.overallScore)}
            </span>
          </div>
        </div>

        {/* 3 sub-scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, alignContent: 'start' }}>
          {[
            { label: 'Sales Score',     score: a.salesScore,  icon: ShoppingBag, desc: `${a.velocity.toFixed(1)} units/month avg velocity` },
            { label: 'Inventory Score', score: a.invScore,    icon: Package,     desc: `${a.daysOfSupply === Infinity ? '∞' : a.daysOfSupply} days of supply remaining` },
            { label: 'Margin Score',    score: a.marginScore, icon: BarChart2,   desc: `${a.grossMarginPct.toFixed(1)}% gross margin on selling price` },
          ].map(s => (
            <div key={s.label} style={{ border: `1px solid ${scoreColor(s.score)}33`, borderRadius: 12, padding: '14px 16px', background: scoreColor(s.score) + '08' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: scoreColor(s.score) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={13} color={scoreColor(s.score)} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor(s.score), textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              </div>
              <ScoreRing score={s.score} size={70} strokeWidth={7} />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {[
          { label: 'Total Revenue',  value: inr(a.totalRevenue),            sub: `${a.invoiceCount} invoices`,              icon: TrendingUp,  color: C.indigo,  bg: '#eef2ff', trend: a.revTrend },
          { label: 'Units Sold',     value: a.totalUnits.toLocaleString(),   sub: `${a.velocity.toFixed(1)}/month avg`,      icon: ShoppingBag, color: C.sky,     bg: '#e0f2fe', trend: a.unitTrend },
          { label: 'Total Profit',   value: inr(a.totalProfit),              sub: `${a.grossMarginPct.toFixed(1)}% margin`,  icon: DollarSign,  color: a.totalProfit >= 0 ? C.emerald : C.rose, bg: a.totalProfit >= 0 ? '#ecfdf5' : '#fef2f2' },
          { label: 'Days of Supply', value: a.daysOfSupply === Infinity ? '∞ days' : `${a.daysOfSupply}d`, sub: `${num(p.stock_qty)} ${p.unit} in stock`, icon: Package, color: a.daysOfSupply < 30 ? C.rose : C.emerald, bg: a.daysOfSupply < 30 ? '#fef2f2' : '#ecfdf5' },
          { label: 'Stock Turnover', value: a.turnover.toFixed(2) + 'x',    sub: 'units sold ÷ avg stock',                  icon: Activity,    color: C.violet,  bg: '#ede9fe' },
        ].map(k => <StatCard key={k.label} {...k} />)}
      </div>

      {/* Insight summary */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={14} color={C.indigo} /> Business Summary
        </div>
        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>
          <strong>{p.name}</strong> is classified as a <strong>Class {a.abcClass}</strong> product with an overall business score of <strong>{a.overallScore}/100</strong> ({scoreLabel(a.overallScore)}).
          {' '}It has generated <strong>{inr(a.totalRevenue)}</strong> in revenue across <strong>{a.invoiceCount} invoices</strong> with an average velocity of <strong>{a.velocity.toFixed(1)} units/month</strong>.
          {' '}The gross margin is <strong>{a.grossMarginPct.toFixed(1)}%</strong> (₹{fmt.number(num(p.unit_price) - num(p.purchase_price))} per unit profit).
          {' '}At current sell-through rate, stock will last approximately <strong>{a.daysOfSupply === Infinity ? 'indefinitely (no recent sales)' : `${a.daysOfSupply} days`}</strong>.
          {' '}{a.revTrend > 5 ? `Revenue is trending up ${a.revTrend.toFixed(1)}% month-on-month — a positive signal.`
              : a.revTrend < -10 ? `⚠ Revenue declined ${Math.abs(a.revTrend).toFixed(1)}% last month — attention needed.`
              : 'Revenue is broadly stable month-on-month.'}
        </p>
      </div>

      {/* Top recs preview */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Top Recommendations</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recs.slice(0, 3).map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: r.color + '0a', border: `1px solid ${r.color}22` }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: r.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <r.icon size={14} color={r.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.action}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {pill(r.priority, r.priority === 'high' ? '#fff' : r.color, r.priority === 'high' ? r.color : r.color + '22')}
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{r.confidence}% confidence</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
