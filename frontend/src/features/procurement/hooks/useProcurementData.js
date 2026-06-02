import { useMemo } from 'react'

export function useProcurementData(products = [], vendors = []) {
  return useMemo(() => {
    if (!products.length) return null

    const total = products.length
    const active = products.filter(p => p.is_active).length
    const totalStockValue = products.reduce((s, p) => s + (Number(p.stock_qty) * Number(p.purchase_price)), 0)
    const totalRetailValue = products.reduce((s, p) => s + (Number(p.stock_qty) * Number(p.unit_price)), 0)
    const lowStock = products.filter(p => Number(p.stock_qty) <= Number(p.low_stock_alert))
    const zeroStock = products.filter(p => Number(p.stock_qty) === 0)

    // ABC classification per product
    const withMargin = products.map(p => {
      const sp = Number(p.unit_price), cp = Number(p.purchase_price)
      const margin = sp > 0 ? ((sp - cp) / sp) * 100 : 0
      const stockValue = Number(p.stock_qty) * cp
      const retailValue = Number(p.stock_qty) * sp
      return { ...p, margin, stockValue, retailValue }
    })

    // Sort by retail value for ABC
    const sorted = [...withMargin].sort((a, b) => b.retailValue - a.retailValue)
    const totalRV = sorted.reduce((s, p) => s + p.retailValue, 0)
    let cumulative = 0
    const withABC = sorted.map(p => {
      cumulative += p.retailValue
      const pct = totalRV > 0 ? (cumulative / totalRV) * 100 : 0
      return { ...p, abcClass: pct <= 70 ? 'A' : pct <= 90 ? 'B' : 'C' }
    })

    // Category breakdown
    const byCategory = {}
    withABC.forEach(p => {
      const cat = p.category || 'general'
      if (!byCategory[cat]) byCategory[cat] = { name: cat, count: 0, stockValue: 0, retailValue: 0 }
      byCategory[cat].count++
      byCategory[cat].stockValue += p.stockValue
      byCategory[cat].retailValue += p.retailValue
    })
    const categoryBreakdown = Object.values(byCategory).sort((a, b) => b.retailValue - a.retailValue)

    // Margin distribution
    const marginBuckets = { 'Loss (<0%)': 0, 'Low (0-10%)': 0, 'Moderate (10-20%)': 0, 'Healthy (20-40%)': 0, 'High (>40%)': 0 }
    withABC.forEach(p => {
      if (p.margin < 0) marginBuckets['Loss (<0%)']++
      else if (p.margin < 10) marginBuckets['Low (0-10%)']++
      else if (p.margin < 20) marginBuckets['Moderate (10-20%)']++
      else if (p.margin < 40) marginBuckets['Healthy (20-40%)']++
      else marginBuckets['High (>40%)']++
    })

    // Top 10 by stock value
    const topByValue = [...withABC].sort((a, b) => b.stockValue - a.stockValue).slice(0, 10)
    const topByMargin = [...withABC].filter(p => p.unit_price > 0).sort((a, b) => b.margin - a.margin).slice(0, 10)

    // Reorder candidates: low stock + has sales (non-zero sell price)
    const reorderCandidates = withABC.filter(p =>
      Number(p.stock_qty) <= Number(p.low_stock_alert) && Number(p.unit_price) > 0
    ).sort((a, b) => a.stock_qty - b.stock_qty)

    // Overstocked: stock > 5x alert level and non-zero
    const overstocked = withABC.filter(p =>
      Number(p.stock_qty) > Number(p.low_stock_alert) * 5 && Number(p.low_stock_alert) > 0
    ).sort((a, b) => b.stockValue - a.stockValue).slice(0, 10)

    const avgMargin = withABC.length > 0
      ? withABC.reduce((s, p) => s + p.margin, 0) / withABC.length : 0

    return {
      total, active, totalStockValue, totalRetailValue, lowStock, zeroStock,
      withABC, categoryBreakdown, marginBuckets, topByValue, topByMargin,
      reorderCandidates, overstocked, avgMargin,
      potentialProfit: totalRetailValue - totalStockValue,
    }
  }, [products, vendors])
}
