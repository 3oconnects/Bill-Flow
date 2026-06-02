/**
 * ProductAnalysisModal — full business intelligence report for a product.
 * Tabs: Overview · Sales Trends · Inventory Health · Recommendations · Deep Dive
 */
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import {
  X, TrendingUp, TrendingDown, Minus as FlatTrend,
  Package, ShoppingBag, BarChart2, Zap, AlertTriangle,
  CheckCircle, Info, Filter, Star, ArrowUpRight, ArrowDownRight,
  ChevronRight, Users, Activity, DollarSign, Target, Award
} from 'lucide-react'
import { fmt } from '@/lib/utils'

// ─── colour palette ──────────────────────────────────────────────────────────
const C = {
  indigo: '#6366f1', sky: '#0ea5e9', emerald: '#10b981',
  amber: '#f59e0b', rose: '#ef4444', violet: '#7c3aed',
  slate: '#64748b', teal: '#14b8a6',
}

// ─── tiny helpers ────────────────────────────────────────────────────────────
const pct = (n, d) => (d > 0 ? ((n / d) * 100).toFixed(1) : '0.0')
const inr  = v => fmt.currency(v)
const num  = v => Number(v || 0)
const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const monthLabel = d => d.toLocaleString('default', { month: 'short', year: '2-digit' })

function pill(text, color, bg) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: bg, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {text}
    </span>
  )
}

// ─── Score ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 90, strokeWidth = 8 }) {
  const r   = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash  = (score / 100) * circ
  const color = score >= 75 ? C.emerald : score >= 50 ? C.amber : C.rose
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size/2} y={size/2 + 6} textAnchor="middle" fontSize={20} fontWeight={800} fill={color}>{score}</text>
    </svg>
  )
}

// ─── mini stat card ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg, trend }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${color}22` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.slate, marginTop: 6 }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: trend > 0 ? C.emerald : trend < 0 ? C.rose : C.slate }}>
          {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <FlatTrend size={12} />}
          {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs prev period
        </div>
      )}
    </div>
  )
}

// ─── custom tooltip for recharts ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: p.color }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: C.slate }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{formatter ? formatter(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── engine: compute all analytics from raw data ─────────────────────────────
function computeAnalytics(product, salesHistory, stockHistory) {
  const p = product

  // ── monthly bucketing ──────────────────────────────────────────────
  const byMonth = {}
  salesHistory.forEach(r => {
    const d = new Date(r.invoice_date)
    const key = monthKey(d)
    const label = monthLabel(d)
    if (!byMonth[key]) byMonth[key] = { key, label, revenue: 0, units: 0, profit: 0, invoices: new Set() }
    byMonth[key].revenue  += num(r.amount)
    byMonth[key].units    += num(r.quantity)
    byMonth[key].profit   += num(r.amount) - num(r.quantity) * num(p.purchase_price)
    byMonth[key].invoices.add(r.invoice_id)
  })
  const months = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ ...v, invoices: v.invoices.size }))

  // ── totals ────────────────────────────────────────────────────────
  const totalRevenue = salesHistory.reduce((s, r) => s + num(r.amount), 0)
  const totalUnits   = salesHistory.reduce((s, r) => s + num(r.quantity), 0)
  const totalProfit  = salesHistory.reduce((s, r) => s + (num(r.amount) - num(r.quantity) * num(p.purchase_price)), 0)
  const invoiceCount = new Set(salesHistory.map(r => r.invoice_id)).size

  // ── trend: last 2 months comparison ──────────────────────────────
  const last2 = months.slice(-2)
  const revTrend = last2.length === 2 && last2[0].revenue > 0
    ? ((last2[1].revenue - last2[0].revenue) / last2[0].revenue * 100) : 0
  const unitTrend = last2.length === 2 && last2[0].units > 0
    ? ((last2[1].units - last2[0].units) / last2[0].units * 100) : 0

  // ── sales velocity (units/month) ──────────────────────────────────
  const activeMonths = months.filter(m => m.units > 0).length || 1
  const velocity = totalUnits / activeMonths                        // units/month
  const daysOfSupply = velocity > 0 ? Math.round((num(p.stock_qty) / (velocity / 30))) : Infinity

  // ── stock turnover ────────────────────────────────────────────────
  const stockIn  = stockHistory.filter(r => num(r.delta) > 0).reduce((s, r) => s + num(r.delta), 0)
  const stockOut = stockHistory.filter(r => num(r.delta) < 0).reduce((s, r) => s + Math.abs(num(r.delta)), 0)
  const avgStock = (stockIn + num(p.stock_qty)) / 2 || 1
  const turnover = totalUnits / avgStock

  // ── margin ────────────────────────────────────────────────────────
  const grossMarginPct = num(p.unit_price) > 0
    ? ((num(p.unit_price) - num(p.purchase_price)) / num(p.unit_price) * 100) : 0

  // ── customer concentration ────────────────────────────────────────
  const custMap = {}
  salesHistory.forEach(r => {
    const n = r.customer_name || 'Unknown'
    if (!custMap[n]) custMap[n] = { name: n, revenue: 0, units: 0, orders: 0 }
    custMap[n].revenue += num(r.amount)
    custMap[n].units   += num(r.quantity)
    custMap[n].orders++
  })
  const topCustomers = Object.values(custMap).sort((a, b) => b.revenue - a.revenue)
  const topCustShare  = totalRevenue > 0 && topCustomers.length > 0
    ? (topCustomers[0].revenue / totalRevenue * 100) : 0

  // ── scores ────────────────────────────────────────────────────────
  const salesScore = Math.min(100, Math.round(
    (Math.min(velocity, 30) / 30 * 35) +             // velocity (35)
    (revTrend > 0 ? Math.min(revTrend, 30) : 0) +    // growth (30)
    (invoiceCount > 5 ? 35 : invoiceCount * 7)        // order count (35)
  ))
  const invScore = Math.min(100, Math.round(
    (num(p.stock_qty) >= num(p.low_stock_alert) ? 40 : 10) +  // stock ok (40)
    (daysOfSupply >= 30 ? 30 : daysOfSupply) +                 // days supply (30)
    (Math.min(turnover * 10, 30))                              // turnover (30)
  ))
  const marginScore = Math.min(100, Math.round(grossMarginPct * 2))
  const overallScore = Math.round((salesScore + invScore + marginScore) / 3)

  // ── ABC classification ────────────────────────────────────────────
  const abcClass = totalRevenue === 0 ? 'C' : grossMarginPct > 25 && velocity > 5 ? 'A' : grossMarginPct > 10 ? 'B' : 'C'

  // ── stock history months ──────────────────────────────────────────
  const smByMonth = {}
  stockHistory.forEach(r => {
    const d = new Date(r.created_at || r.date || Date.now())
    const key = monthKey(d)
    const label = monthLabel(d)
    if (!smByMonth[key]) smByMonth[key] = { key, label, in: 0, out: 0 }
    const delta = num(r.delta)
    if (delta > 0) smByMonth[key].in  += delta
    else            smByMonth[key].out += Math.abs(delta)
  })
  const stockMonths = Object.entries(smByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([,v]) => v)

  return {
    months, totalRevenue, totalUnits, totalProfit, invoiceCount,
    revTrend, unitTrend, velocity, daysOfSupply, turnover,
    grossMarginPct, topCustomers, topCustShare,
    salesScore, invScore, marginScore, overallScore,
    abcClass, stockIn, stockOut, stockMonths,
    avgRevenuePerMonth: totalRevenue / (activeMonths || 1),
    avgUnitsPerMonth: velocity,
  }
}

// ─── recommendation engine ────────────────────────────────────────────────────
function buildRecommendations(product, analytics) {
  const p = product
  const a = analytics
  const recs = []

  // 1. Reorder
  if (a.daysOfSupply < 45 && a.daysOfSupply !== Infinity) {
    const urgency = a.daysOfSupply < 14 ? 'high' : a.daysOfSupply < 30 ? 'medium' : 'low'
    recs.push({
      id: 'reorder', priority: urgency, category: 'Inventory',
      icon: Package, color: urgency === 'high' ? C.rose : C.amber,
      title: 'Reorder Stock',
      why: `At current sales velocity of ${a.velocity.toFixed(1)} units/month, you have only ~${a.daysOfSupply === Infinity ? '∞' : a.daysOfSupply} days of supply left.`,
      action: `Place a purchase order for at least ${Math.ceil(a.velocity * 2)} units to cover 2 months of demand.`,
      impact: 'Prevents stockout and lost sales',
      confidence: urgency === 'high' ? 94 : 78,
    })
  }

  // 2. Pricing optimisation
  if (a.grossMarginPct < 15) {
    recs.push({
      id: 'pricing', priority: 'high', category: 'Pricing',
      icon: DollarSign, color: C.rose,
      title: 'Improve Gross Margin',
      why: `Your current margin is ${a.grossMarginPct.toFixed(1)}%, which is below the recommended 15–25% threshold for healthy retail operations.`,
      action: `Consider raising the selling price to ₹${Math.round(num(p.purchase_price) / 0.8).toLocaleString('en-IN')} (20% margin) or negotiating a lower purchase price.`,
      impact: `+₹${Math.round((num(p.purchase_price) / 0.8 - num(p.unit_price)) * a.avgUnitsPerMonth).toLocaleString('en-IN')}/month in additional profit`,
      confidence: 87,
    })
  }

  // 3. Declining trend
  if (a.revTrend < -10) {
    recs.push({
      id: 'decline', priority: 'medium', category: 'Sales',
      icon: TrendingDown, color: C.amber,
      title: 'Address Declining Sales Trend',
      why: `Revenue dropped ${Math.abs(a.revTrend).toFixed(1)}% last month vs the previous month. This may indicate weakening demand or increased competition.`,
      action: 'Run a short promotional campaign (5–10% discount), bundle with complementary products, or review if the category is seasonal.',
      impact: 'Stabilise or reverse the downward revenue trend',
      confidence: 72,
    })
  }

  // 4. Fast mover — bulk discount opportunity
  if (a.velocity > 20 && a.grossMarginPct > 20) {
    recs.push({
      id: 'bulk', priority: 'medium', category: 'Pricing',
      icon: Zap, color: C.indigo,
      title: 'Introduce Bulk / Tier Pricing',
      why: `This is a fast-moving product (${a.velocity.toFixed(1)} units/month) with a healthy margin. Volume discounts can drive even higher order sizes.`,
      action: 'Set up a custom price list with 5% discount at 5+ units and 10% at 10+ units.',
      impact: 'Increase average order value by 15–25%',
      confidence: 81,
    })
  }

  // 5. Customer concentration risk
  if (a.topCustShare > 60 && a.topCustomers.length > 0) {
    recs.push({
      id: 'concentration', priority: 'medium', category: 'Risk',
      icon: AlertTriangle, color: C.amber,
      title: 'Reduce Customer Concentration Risk',
      why: `${a.topCustomers[0]?.name} accounts for ${a.topCustShare.toFixed(0)}% of this product's revenue. Losing this customer would significantly impact your business.`,
      action: 'Actively prospect 2–3 new customers for this product category. Offer introductory pricing for first orders.',
      impact: 'Reduce revenue risk and diversify customer base',
      confidence: 83,
    })
  }

  // 6. Slow mover — deadstock risk
  if (a.velocity < 2 && num(p.stock_qty) > 20) {
    recs.push({
      id: 'slowmover', priority: 'medium', category: 'Inventory',
      icon: Activity, color: C.violet,
      title: 'Manage Slow-Moving Inventory',
      why: `With only ${a.velocity.toFixed(1)} units/month in sales and ${num(p.stock_qty)} units in stock, you have ${a.daysOfSupply === Infinity ? 'excess' : `~${a.daysOfSupply} days of`} inventory. Capital is locked up.`,
      action: 'Consider a clearance promotion, bundle deal, or return to vendor to free up working capital.',
      impact: `Free up ≈ ${inr(num(p.stock_qty) * num(p.purchase_price))} in working capital`,
      confidence: 77,
    })
  }

  // 7. Strong performer — scale
  if (a.salesScore > 75 && a.invScore > 70) {
    recs.push({
      id: 'scale', priority: 'low', category: 'Growth',
      icon: TrendingUp, color: C.emerald,
      title: 'Scale This Product',
      why: `This product scores ${a.salesScore} on sales and ${a.invScore} on inventory health. It is one of your better performers.`,
      action: 'Increase marketing spend, add more vendor options, and consider stocking higher quantities for better bulk pricing from suppliers.',
      impact: 'Potential 20–40% revenue increase within 3 months',
      confidence: 68,
    })
  }

  // 8. Good margin but low volume
  if (a.grossMarginPct > 25 && a.velocity < 5 && a.totalRevenue > 0) {
    recs.push({
      id: 'highmarginlowvol', priority: 'medium', category: 'Sales',
      icon: Target, color: C.teal,
      title: 'Promote High-Margin Product',
      why: `This product has a strong ${a.grossMarginPct.toFixed(1)}% margin but low sales volume (${a.velocity.toFixed(1)} units/month). Selling more units would significantly boost profit.`,
      action: 'Feature this product in outbound sales pitches, place it prominently in invoices/quotes, and offer as an upsell to existing customers.',
      impact: `Each additional unit sold = ${inr(num(p.unit_price) - num(p.purchase_price))} profit`,
      confidence: 79,
    })
  }

  if (recs.length === 0) {
    recs.push({
      id: 'ok', priority: 'low', category: 'Status',
      icon: CheckCircle, color: C.emerald,
      title: 'Product is performing well',
      why: 'No significant issues detected. Stock is adequate, margin is healthy, and sales are stable.',
      action: 'Continue monitoring and maintain current inventory levels.',
      impact: 'Maintain current performance',
      confidence: 90,
    })
  }

  return recs.sort((a, b) => {
    const o = { high: 0, medium: 1, low: 2 }
    return o[a.priority] - o[b.priority]
  })
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ product: p, analytics: a, recs }) {
  const abcColor = { A: C.emerald, B: C.amber, C: C.rose }
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
          <div style={{ fontSize: 11, opacity: 0.7, textAlign: 'center' }}>Based on sales, inventory & margin health</div>
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
            { label: 'Sales Score', score: a.salesScore, icon: ShoppingBag, desc: `${a.velocity.toFixed(1)} units/month avg velocity` },
            { label: 'Inventory Score', score: a.invScore, icon: Package, desc: `${a.daysOfSupply === Infinity ? '∞' : a.daysOfSupply} days of supply remaining` },
            { label: 'Margin Score', score: a.marginScore, icon: BarChart2, desc: `${a.grossMarginPct.toFixed(1)}% gross margin on selling price` },
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
          { label: 'Total Revenue',    value: inr(a.totalRevenue),         sub: `${a.invoiceCount} invoices`,              icon: TrendingUp,   color: C.indigo, bg: '#eef2ff', trend: a.revTrend },
          { label: 'Units Sold',       value: a.totalUnits.toLocaleString(), sub: `${a.velocity.toFixed(1)}/month avg`,     icon: ShoppingBag,  color: C.sky,    bg: '#e0f2fe', trend: a.unitTrend },
          { label: 'Total Profit',     value: inr(a.totalProfit),          sub: `${a.grossMarginPct.toFixed(1)}% margin`,  icon: DollarSign,   color: a.totalProfit >= 0 ? C.emerald : C.rose, bg: a.totalProfit >= 0 ? '#ecfdf5' : '#fef2f2' },
          { label: 'Days of Supply',   value: a.daysOfSupply === Infinity ? '∞ days' : `${a.daysOfSupply}d`, sub: `${num(p.stock_qty)} ${p.unit} in stock`, icon: Package,  color: a.daysOfSupply < 30 ? C.rose : C.emerald, bg: a.daysOfSupply < 30 ? '#fef2f2' : '#ecfdf5' },
          { label: 'Stock Turnover',   value: a.turnover.toFixed(2) + 'x', sub: 'units sold ÷ avg stock',                  icon: Activity,     color: C.violet, bg: '#ede9fe' },
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

// ─── Sales Trends tab ─────────────────────────────────────────────────────────
function SalesTrendsTab({ analytics: a, product: p }) {
  const [view, setView] = useState('revenue')
  const chartData = a.months.map(m => ({
    ...m,
    margin: m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : 0,
    aov: m.invoices > 0 ? (m.revenue / m.invoices).toFixed(0) : 0,
  }))

  const views = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'units',   label: 'Units' },
    { id: 'profit',  label: 'Profit' },
    { id: 'aov',     label: 'Avg Order' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Trend KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard icon={TrendingUp}  label="Avg Monthly Revenue" value={inr(a.avgRevenuePerMonth)}  sub="based on active months"          color={C.indigo}  bg="#eef2ff" />
        <StatCard icon={ShoppingBag} label="Avg Monthly Units"   value={`${a.avgUnitsPerMonth.toFixed(1)} ${p.unit}`}  sub="sales velocity"  color={C.sky}     bg="#e0f2fe" />
        <StatCard icon={TrendingUp}  label="Rev MoM Change"      value={`${a.revTrend > 0 ? '+' : ''}${a.revTrend.toFixed(1)}%`} sub="last vs prior month" color={a.revTrend >= 0 ? C.emerald : C.rose} bg={a.revTrend >= 0 ? '#ecfdf5' : '#fef2f2'} />
        <StatCard icon={Activity}    label="Unit MoM Change"     value={`${a.unitTrend > 0 ? '+' : ''}${a.unitTrend.toFixed(1)}%`} sub="last vs prior month" color={a.unitTrend >= 0 ? C.emerald : C.rose} bg={a.unitTrend >= 0 ? '#ecfdf5' : '#fef2f2'} />
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6 }}>
        {views.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: view === v.id ? 700 : 500, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: view === v.id ? C.indigo : '#f1f5f9', color: view === v.id ? '#fff' : '#64748b',
          }}>{v.label}</button>
        ))}
      </div>

      {/* Main chart */}
      {chartData.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, fontSize: 13, color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: 12 }}>
          No sales data to plot yet
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
            {view === 'revenue' ? 'Monthly Revenue' : view === 'units' ? 'Monthly Units Sold' : view === 'profit' ? 'Monthly Gross Profit' : 'Average Order Value'}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {view === 'units' ? (
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip formatter={v => `${v} ${p.unit}`} />} />
                <Bar dataKey="units" name="Units Sold" fill={C.sky} radius={[5, 5, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={view === 'profit' ? C.emerald : view === 'aov' ? C.amber : C.indigo} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={view === 'profit' ? C.emerald : view === 'aov' ? C.amber : C.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip formatter={v => view === 'aov' ? inr(v) : inr(v)} />} />
                <Area type="monotone"
                  dataKey={view === 'profit' ? 'profit' : view === 'aov' ? 'aov' : 'revenue'}
                  name={view === 'profit' ? 'Gross Profit' : view === 'aov' ? 'Avg Order Value' : 'Revenue'}
                  stroke={view === 'profit' ? C.emerald : view === 'aov' ? C.amber : C.indigo}
                  fill="url(#colorGrad)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue + Units combo */}
      {chartData.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Revenue vs Units — Combined View</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 40, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: C.sky }} />
              <Tooltip content={<ChartTooltip formatter={(v, n) => n === 'Units' ? `${v} ${p.unit}` : inr(v)} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left"  dataKey="revenue" name="Revenue" fill={C.indigo} radius={[4,4,0,0]} opacity={0.85} />
              <Bar yAxisId="right" dataKey="units"   name="Units"   fill={C.sky}    radius={[4,4,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top customers */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Customer Revenue Breakdown</div>
        {a.topCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: '#94a3b8' }}>No sales data</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#','Customer','Revenue','Units','Orders','Share'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.topCustomers.slice(0, 8).map((c, i) => {
                const share = pct(c.revenue, a.totalRevenue)
                const colors = [C.indigo, C.sky, C.emerald, C.amber, C.violet, C.teal, C.rose, C.slate]
                return (
                  <tr key={c.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: colors[i] + '20', color: colors[i], fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i+1}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{inr(c.revenue)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{c.units}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{c.orders}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 3 }}>
                          <div style={{ width: `${share}%`, height: '100%', background: colors[i], borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: colors[i], minWidth: 32 }}>{share}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Inventory Health tab ─────────────────────────────────────────────────────
function InventoryHealthTab({ product: p, analytics: a }) {
  const stockPct = Math.min(100, (num(p.stock_qty) / Math.max(num(p.low_stock_alert) * 4, 1)) * 100)
  const healthColor = stockPct > 50 ? C.emerald : stockPct > 25 ? C.amber : C.rose

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Inventory KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard icon={Package}    label="Current Stock"    value={`${fmt.number(p.stock_qty)} ${p.unit}`}       sub={`Alert at ${fmt.number(p.low_stock_alert)}`}      color={num(p.stock_qty) <= num(p.low_stock_alert) ? C.rose : C.emerald} bg={num(p.stock_qty) <= num(p.low_stock_alert) ? '#fef2f2' : '#ecfdf5'} />
        <StatCard icon={Activity}   label="Days of Supply"   value={a.daysOfSupply === Infinity ? '∞ days' : `${a.daysOfSupply}d`}  sub={`at ${a.velocity.toFixed(1)} units/month`}  color={a.daysOfSupply < 30 ? C.rose : C.emerald}   bg={a.daysOfSupply < 30 ? '#fef2f2' : '#ecfdf5'} />
        <StatCard icon={TrendingUp} label="Stock Turnover"   value={`${a.turnover.toFixed(2)}x`}                   sub="sold ÷ avg stock level"                            color={C.violet}  bg="#ede9fe" />
        <StatCard icon={DollarSign} label="Inventory Value"  value={inr(num(p.stock_qty) * num(p.purchase_price))} sub={`Retail: ${inr(num(p.stock_qty) * num(p.unit_price))}`} color={C.amber} bg="#fffbeb" />
      </div>

      {/* Stock level gauge */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Stock Level Health</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Current: <strong>{fmt.number(p.stock_qty)} {p.unit}</strong></span>
          <span style={{ color: '#64748b' }}>Alert: <strong>{fmt.number(p.low_stock_alert)} {p.unit}</strong></span>
          <span style={{ color: '#64748b' }}>Healthy level: <strong>{fmt.number(num(p.low_stock_alert) * 4)} {p.unit}</strong></span>
        </div>
        <div style={{ background: '#f1f5f9', borderRadius: 8, height: 18, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: `${Math.min(100, (num(p.low_stock_alert) / Math.max(num(p.low_stock_alert) * 4, 1)) * 100)}%`, top: 0, bottom: 0, width: 2, background: C.rose, zIndex: 2 }} />
          <div style={{ height: '100%', width: `${stockPct}%`, background: `linear-gradient(90deg, ${C.rose}, ${C.amber} 40%, ${C.emerald})`, borderRadius: 8, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
          <span>0</span><span style={{ color: C.rose }}>Alert zone</span><span>Healthy</span>
        </div>
      </div>

      {/* Stock movement chart */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Stock Movements by Month</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>Inbound vs outbound stock flow</div>
        {a.stockMonths.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: '#94a3b8' }}>No stock movements recorded</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={a.stockMonths} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<ChartTooltip formatter={(v, n) => `${v} ${p.unit}`} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="in"  name="Stock In"  fill={C.emerald} radius={[4,4,0,0]} opacity={0.85} />
              <Bar dataKey="out" name="Stock Out" fill={C.rose}    radius={[4,4,0,0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Reorder analysis */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Reorder Analysis</div>
          {[
            ['Reorder Point',       `${Math.ceil(a.velocity * 1.5)} ${p.unit}`, 'Lead time buffer of 1.5 months'],
            ['Recommended Qty',     `${Math.ceil(a.velocity * 2)} ${p.unit}`,   '2 months demand coverage'],
            ['Estimated PO Value',  inr(Math.ceil(a.velocity * 2) * num(p.purchase_price)), 'at current purchase price'],
            ['Stock Ageing Risk',   a.daysOfSupply > 180 ? 'High' : a.daysOfSupply > 90 ? 'Medium' : 'Low', 'risk of obsolescence'],
          ].map(([l, v, hint]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{l}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{hint}</div>
              </div>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* ABC analysis */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>ABC Classification</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: a.abcClass === 'A' ? '#ecfdf5' : a.abcClass === 'B' ? '#fffbeb' : '#fef2f2', border: `3px solid ${a.abcClass === 'A' ? C.emerald : a.abcClass === 'B' ? C.amber : C.rose}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: a.abcClass === 'A' ? C.emerald : a.abcClass === 'B' ? C.amber : C.rose }}>{a.abcClass}</div>
            </div>
          </div>
          {[
            ['Class A', 'High margin + high velocity → priority management', C.emerald],
            ['Class B', 'Moderate margin or velocity → standard management',  C.amber],
            ['Class C', 'Low margin + low velocity → minimal investment',     C.rose],
          ].map(([cls, desc, col]) => (
            <div key={cls} style={{ display: 'flex', gap: 8, padding: '6px 10px', borderRadius: 8, marginBottom: 6, background: a.abcClass === cls[6] ? col + '12' : 'transparent', border: a.abcClass === cls[6] ? `1px solid ${col}33` : '1px solid transparent' }}>
              <span style={{ fontWeight: 800, color: col, minWidth: 18 }}>{cls[6]}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Recommendations tab ──────────────────────────────────────────────────────
function RecommendationsTab({ recs, product: p, analytics: a }) {
  const priorityStyle = { high: { color: '#fff', bg: C.rose }, medium: { color: C.amber, bg: C.amber + '18' }, low: { color: C.emerald, bg: C.emerald + '18' } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Info size={14} color={C.indigo} />
        Recommendations are generated from your historical sales data, inventory levels, margin analysis, and business patterns. Confidence scores reflect data completeness.
      </div>

      {recs.map((r, i) => {
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

// ─── Deep Dive tab (filterable per-period analysis) ───────────────────────────
function DeepDiveTab({ salesHistory, stockHistory, product: p }) {
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo,   setDateTo]     = useState('')
  const [customer, setCustomer]   = useState('')
  const [status,   setStatus]     = useState('')

  const allCustomers = useMemo(() => {
    const set = new Set(salesHistory.map(r => r.customer_name).filter(Boolean))
    return Array.from(set).sort()
  }, [salesHistory])

  const filtered = useMemo(() => {
    return salesHistory.filter(r => {
      if (dateFrom && r.invoice_date < dateFrom) return false
      if (dateTo   && r.invoice_date > dateTo)   return false
      if (customer && r.customer_name !== customer) return false
      if (status   && (r.invoice_status || '').toLowerCase() !== status) return false
      return true
    })
  }, [salesHistory, dateFrom, dateTo, customer, status])

  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, r) => s + num(r.amount), 0)
    const units   = filtered.reduce((s, r) => s + num(r.quantity), 0)
    const profit  = filtered.reduce((s, r) => s + (num(r.amount) - num(r.quantity) * num(p.purchase_price)), 0)
    const invoices = new Set(filtered.map(r => r.invoice_id)).size
    return { revenue, units, profit, invoices }
  }, [filtered, p.purchase_price])

  // Monthly chart for filtered data
  const chartData = useMemo(() => {
    const bm = {}
    filtered.forEach(r => {
      const d = new Date(r.invoice_date)
      const key = monthKey(d)
      if (!bm[key]) bm[key] = { label: monthLabel(d), revenue: 0, units: 0 }
      bm[key].revenue += num(r.amount)
      bm[key].units   += num(r.quantity)
    })
    return Object.entries(bm).sort(([a], [b]) => a.localeCompare(b)).map(([,v]) => v)
  }, [filtered])

  const statusOptions = ['paid','unpaid','partial','cancelled']
  const statusColor = { paid: C.emerald, unpaid: C.amber, partial: C.sky, cancelled: C.rose }

  const clearFilters = () => { setDateFrom(''); setDateTo(''); setCustomer(''); setStatus('') }
  const hasFilters = dateFrom || dateTo || customer || status

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter bar */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Filter size={14} color={C.indigo} />
          <span style={{ fontWeight: 700, fontSize: 13 }}>Filters</span>
          {hasFilters && (
            <button onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: 11, color: C.rose, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              × Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Customer</label>
            <select value={customer} onChange={e => setCustomer(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }}>
              <option value="">All customers</option>
              {allCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>Invoice Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }}>
              <option value="">All statuses</option>
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
          Showing <strong>{filtered.length}</strong> of {salesHistory.length} records
          {hasFilters && ' (filtered)'}
        </div>
      </div>

      {/* Filtered KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <StatCard icon={TrendingUp}  label="Filtered Revenue" value={inr(stats.revenue)}                                     sub={`${stats.invoices} invoices`}               color={C.indigo}  bg="#eef2ff" />
        <StatCard icon={ShoppingBag} label="Units Sold"        value={`${stats.units.toLocaleString()} ${p.unit}`}            sub="in selected period"                         color={C.sky}     bg="#e0f2fe" />
        <StatCard icon={DollarSign}  label="Gross Profit"      value={inr(stats.profit)}                                      sub={`${stats.revenue > 0 ? pct(stats.profit, stats.revenue) : 0}% margin`} color={stats.profit >= 0 ? C.emerald : C.rose} bg={stats.profit >= 0 ? '#ecfdf5' : '#fef2f2'} />
        <StatCard icon={BarChart2}   label="Avg per Invoice"   value={stats.invoices > 0 ? inr(stats.revenue / stats.invoices) : '₹0'} sub="average order value"            color={C.amber}   bg="#fffbeb" />
      </div>

      {/* Filtered trend chart */}
      {chartData.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Revenue Trend — Filtered Period</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<ChartTooltip formatter={v => inr(v)} />} />
              <Bar dataKey="revenue" name="Revenue" fill={C.indigo} radius={[5,5,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtered table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Transaction Detail</div>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{filtered.length} rows</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: '#94a3b8', fontSize: 13 }}>No records match the selected filters</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Date','Invoice','Customer','Qty','Unit Price','Amount','Status'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const st = (r.invoice_status || 'unpaid').toLowerCase()
                  const sc = statusColor[st] || C.slate
                  return (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid #f8fafc', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: C.indigo }}>{r.invoice_number || '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 500 }}>{r.customer_name || '—'}</td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12 }}>{num(r.quantity).toLocaleString()}</td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12 }}>{inr(r.unit_price)}</td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{inr(r.amount)}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc + '18', color: sc, textTransform: 'capitalize' }}>{st}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                  <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, fontSize: 12 }}>Total ({filtered.length} rows)</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{stats.units.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px' }} />
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: C.indigo }}>{inr(stats.revenue)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
const MODAL_TABS = [
  { id: 'overview',   label: 'Overview',           icon: Award },
  { id: 'trends',     label: 'Sales Trends',        icon: TrendingUp },
  { id: 'inventory',  label: 'Inventory Health',    icon: Package },
  { id: 'recs',       label: 'Recommendations',     icon: Zap },
  { id: 'deepdive',   label: 'Deep Dive',           icon: Filter },
]

export default function ProductAnalysisModal({ product, salesHistory, stockHistory, onClose }) {
  const [tab, setTab] = useState('overview')

  const analytics = useMemo(() => computeAnalytics(product, salesHistory, stockHistory), [product, salesHistory, stockHistory])
  const recs       = useMemo(() => buildRecommendations(product, analytics), [product, analytics])

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
          {tab === 'overview'  && <OverviewTab       product={product} analytics={analytics} recs={recs} />}
          {tab === 'trends'    && <SalesTrendsTab    product={product} analytics={analytics} />}
          {tab === 'inventory' && <InventoryHealthTab product={product} analytics={analytics} />}
          {tab === 'recs'      && <RecommendationsTab recs={recs} product={product} analytics={analytics} />}
          {tab === 'deepdive'  && <DeepDiveTab product={product} salesHistory={salesHistory} stockHistory={stockHistory} />}
        </div>
      </div>
    </div>
  )
}
