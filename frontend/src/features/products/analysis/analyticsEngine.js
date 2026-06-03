/**
 * analyticsEngine.js — pure computation, no JSX
 * Exports: computeAnalytics, buildRecommendations
 */
import {
  Package, TrendingUp, TrendingDown, DollarSign,
  Zap, AlertTriangle, Activity, Target, CheckCircle,
} from 'lucide-react'
import { fmt } from '@/lib/utils'

export const C = {
  indigo: '#6366f1', sky: '#0ea5e9', emerald: '#10b981',
  amber: '#f59e0b', rose: '#ef4444', violet: '#7c3aed',
  slate: '#64748b', teal: '#14b8a6',
}

export const pct   = (n, d) => (d > 0 ? ((n / d) * 100).toFixed(1) : '0.0')
export const inr   = v => fmt.currency(v)
export const num   = v => Number(v || 0)
export const monthKey   = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export const monthLabel = d => d.toLocaleString('default', { month: 'short', year: '2-digit' })

export function computeAnalytics(product, salesHistory, stockHistory) {
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
  const revTrend  = last2.length === 2 && last2[0].revenue > 0
    ? ((last2[1].revenue - last2[0].revenue) / last2[0].revenue * 100) : 0
  const unitTrend = last2.length === 2 && last2[0].units > 0
    ? ((last2[1].units - last2[0].units) / last2[0].units * 100) : 0

  // ── sales velocity (units/month) ──────────────────────────────────
  const activeMonths = months.filter(m => m.units > 0).length || 1
  const velocity     = totalUnits / activeMonths
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
  const topCustShare = totalRevenue > 0 && topCustomers.length > 0
    ? (topCustomers[0].revenue / totalRevenue * 100) : 0

  // ── scores ────────────────────────────────────────────────────────
  const salesScore = Math.min(100, Math.round(
    (Math.min(velocity, 30) / 30 * 35) +
    (revTrend > 0 ? Math.min(revTrend, 30) : 0) +
    (invoiceCount > 5 ? 35 : invoiceCount * 7)
  ))
  const invScore = Math.min(100, Math.round(
    (num(p.stock_qty) >= num(p.low_stock_alert) ? 40 : 10) +
    (daysOfSupply >= 30 ? 30 : daysOfSupply) +
    (Math.min(turnover * 10, 30))
  ))
  const marginScore  = Math.min(100, Math.round(grossMarginPct * 2))
  const overallScore = Math.round((salesScore + invScore + marginScore) / 3)

  // ── ABC classification ────────────────────────────────────────────
  const abcClass = totalRevenue === 0 ? 'C'
    : grossMarginPct > 25 && velocity > 5 ? 'A'
    : grossMarginPct > 10 ? 'B' : 'C'

  // ── stock history months ──────────────────────────────────────────
  const smByMonth = {}
  stockHistory.forEach(r => {
    const d = new Date(r.created_at || r.date || Date.now())
    const key = monthKey(d)
    const label = monthLabel(d)
    if (!smByMonth[key]) smByMonth[key] = { key, label, in: 0, out: 0 }
    const delta = num(r.delta)
    if (delta > 0) smByMonth[key].in  += delta
    else           smByMonth[key].out += Math.abs(delta)
  })
  const stockMonths = Object.entries(smByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)

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

export function buildRecommendations(product, analytics) {
  const p = product
  const a = analytics
  const recs = []

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

  if (a.revTrend < -10) {
    recs.push({
      id: 'decline', priority: 'medium', category: 'Sales',
      icon: TrendingDown, color: C.amber,
      title: 'Address Declining Sales Trend',
      why: `Revenue dropped ${Math.abs(a.revTrend).toFixed(1)}% last month vs the previous month.`,
      action: 'Run a short promotional campaign (5–10% discount), bundle with complementary products, or review if the category is seasonal.',
      impact: 'Stabilise or reverse the downward revenue trend',
      confidence: 72,
    })
  }

  if (a.velocity > 20 && a.grossMarginPct > 20) {
    recs.push({
      id: 'bulk', priority: 'medium', category: 'Pricing',
      icon: Zap, color: C.indigo,
      title: 'Introduce Bulk / Tier Pricing',
      why: `This is a fast-moving product (${a.velocity.toFixed(1)} units/month) with a healthy margin.`,
      action: 'Set up a custom price list with 5% discount at 5+ units and 10% at 10+ units.',
      impact: 'Increase average order value by 15–25%',
      confidence: 81,
    })
  }

  if (a.topCustShare > 60 && a.topCustomers.length > 0) {
    recs.push({
      id: 'concentration', priority: 'medium', category: 'Risk',
      icon: AlertTriangle, color: C.amber,
      title: 'Reduce Customer Concentration Risk',
      why: `${a.topCustomers[0]?.name} accounts for ${a.topCustShare.toFixed(0)}% of this product's revenue.`,
      action: 'Actively prospect 2–3 new customers for this product category.',
      impact: 'Reduce revenue risk and diversify customer base',
      confidence: 83,
    })
  }

  if (a.velocity < 2 && num(p.stock_qty) > 20) {
    recs.push({
      id: 'slowmover', priority: 'medium', category: 'Inventory',
      icon: Activity, color: C.violet,
      title: 'Manage Slow-Moving Inventory',
      why: `With only ${a.velocity.toFixed(1)} units/month in sales and ${num(p.stock_qty)} units in stock, capital is locked up.`,
      action: 'Consider a clearance promotion, bundle deal, or return to vendor.',
      impact: `Free up ≈ ${inr(num(p.stock_qty) * num(p.purchase_price))} in working capital`,
      confidence: 77,
    })
  }

  if (a.salesScore > 75 && a.invScore > 70) {
    recs.push({
      id: 'scale', priority: 'low', category: 'Growth',
      icon: TrendingUp, color: C.emerald,
      title: 'Scale This Product',
      why: `This product scores ${a.salesScore} on sales and ${a.invScore} on inventory health.`,
      action: 'Increase marketing spend, add more vendor options, and consider stocking higher quantities.',
      impact: 'Potential 20–40% revenue increase within 3 months',
      confidence: 68,
    })
  }

  if (a.grossMarginPct > 25 && a.velocity < 5 && a.totalRevenue > 0) {
    recs.push({
      id: 'highmarginlowvol', priority: 'medium', category: 'Sales',
      icon: Target, color: C.teal,
      title: 'Promote High-Margin Product',
      why: `This product has a strong ${a.grossMarginPct.toFixed(1)}% margin but low sales volume (${a.velocity.toFixed(1)} units/month).`,
      action: 'Feature in outbound sales pitches, prominently in invoices/quotes, and offer as an upsell.',
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
