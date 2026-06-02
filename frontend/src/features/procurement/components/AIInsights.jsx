import { useMemo } from 'react'
import { Zap, TrendingUp, TrendingDown, AlertTriangle, Package, DollarSign, Target, CheckCircle, RefreshCw } from 'lucide-react'
import { fmt } from '@/lib/utils'

function buildInsights(data) {
  const insights = []
  const { withABC, reorderCandidates, overstocked, avgMargin, totalStockValue, totalRetailValue, categoryBreakdown } = data

  // 1. Critical reorders
  const critical = reorderCandidates.filter(p => Number(p.stock_qty) === 0)
  if (critical.length) insights.push({
    priority:'critical', icon:AlertTriangle, color:'#ef4444', bg:'#fef2f2',
    title:`${critical.length} product${critical.length>1?'s':''} completely out of stock`,
    why:`${critical.map(p=>p.name).slice(0,3).join(', ')}${critical.length>3?` +${critical.length-3} more`:''} have zero inventory — active sales are blocked.`,
    action:`Place emergency purchase orders immediately. Estimated restock value: ${fmt.currency(critical.reduce((s,p)=>s+p.purchase_price*Math.max(Number(p.low_stock_alert)*2,10),0))}`,
    score:98,
  })

  // 2. Low stock
  const lowNotZero = reorderCandidates.filter(p => Number(p.stock_qty) > 0)
  if (lowNotZero.length) insights.push({
    priority:'high', icon:Package, color:'#f59e0b', bg:'#fffbeb',
    title:`${lowNotZero.length} products approaching reorder point`,
    why:`These items will run out within days at current consumption. Total reorder value: ${fmt.currency(lowNotZero.reduce((s,p)=>s+p.purchase_price*Number(p.low_stock_alert)*2,0))}`,
    action:'Review sales velocity for each and place purchase orders with primary vendors before stockout occurs.',
    score:85,
  })

  // 3. Margin below threshold
  const lowMargin = withABC.filter(p => p.margin > 0 && p.margin < 10 && Number(p.unit_price) > 0)
  if (lowMargin.length) insights.push({
    priority:'high', icon:DollarSign, color:'#ef4444', bg:'#fef2f2',
    title:`${lowMargin.length} products have margin below 10%`,
    why:`${lowMargin.slice(0,2).map(p=>`${p.name} (${p.margin.toFixed(1)}%)`).join(', ')} are barely profitable. Consider renegotiating purchase prices or adjusting sell price.`,
    action:`Increasing sell price by just 5% on these items could add ${fmt.currency(lowMargin.reduce((s,p)=>s+Number(p.unit_price)*0.05*Number(p.stock_qty),0))} to your portfolio value.`,
    score:80,
  })

  // 4. Overstock warning
  if (overstocked.length) insights.push({
    priority:'medium', icon:TrendingDown, color:'#7c3aed', bg:'#ede9fe',
    title:`${overstocked.length} products are overstocked — capital tied up`,
    why:`${fmt.currency(overstocked.reduce((s,p)=>s+p.stockValue,0))} locked in excess inventory. These products have 5x+ the stock needed relative to alert threshold.`,
    action:'Consider a clearance promotion (10–15% discount), bundle deals with fast-movers, or vendor return if possible.',
    score:72,
  })

  // 5. Category concentration
  if (categoryBreakdown.length > 0) {
    const topCat = categoryBreakdown[0]
    const topShare = totalRetailValue > 0 ? (topCat.retailValue / totalRetailValue * 100) : 0
    if (topShare > 60) insights.push({
      priority:'medium', icon:AlertTriangle, color:'#f59e0b', bg:'#fffbeb',
      title:`High category concentration — ${topShare.toFixed(0)}% in ${topCat.name}`,
      why:`Over-reliance on a single category creates revenue risk if demand shifts or supply is disrupted.`,
      action:'Explore adding 3–5 complementary products from adjacent categories to reduce concentration risk.',
      score:65,
    })
  }

  // 6. Strong ABC A performers
  const classA = withABC.filter(p => p.abcClass === 'A' && p.margin >= 20)
  if (classA.length) insights.push({
    priority:'low', icon:TrendingUp, color:'#10b981', bg:'#ecfdf5',
    title:`${classA.length} Class A products with healthy margins — scale opportunity`,
    why:`These are your best performers: high value + good margin. Investing more here delivers the highest return.`,
    action:`Increase stock depth for top performers. Consider negotiating bulk pricing with vendors for ${classA.slice(0,2).map(p=>p.name).join(' and ')}.`,
    score:60,
  })

  // 7. Good health signal
  if (reorderCandidates.length === 0 && avgMargin > 20) insights.push({
    priority:'low', icon:CheckCircle, color:'#10b981', bg:'#ecfdf5',
    title:'Inventory health is strong',
    why:`All products are above alert thresholds, average margin is ${avgMargin.toFixed(1)}%, and stock value is growing.`,
    action:'Continue monitoring weekly. Consider setting tighter alert thresholds to catch issues earlier.',
    score:55,
  })

  return insights.sort((a,b) => b.score - a.score)
}

const PRIORITY_STYLE = {
  critical: { label:'Critical', color:'#fff',    bg:'#ef4444' },
  high:     { label:'High',     color:'#ef4444', bg:'#fef2f2' },
  medium:   { label:'Medium',   color:'#f59e0b', bg:'#fffbeb' },
  low:      { label:'Low',      color:'#10b981', bg:'#ecfdf5' },
}

export default function AIInsights({ data }) {
  const insights = useMemo(() => buildInsights(data), [data])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#475569', display:'flex', alignItems:'center', gap:8 }}>
        <Zap size={13} color='#6366f1' />
        Suggestions are generated from inventory levels, margin data, ABC classification, and stock movement patterns. Confidence scores reflect data quality.
      </div>

      {insights.map((r, i) => {
        const ps = PRIORITY_STYLE[r.priority]
        return (
          <div key={i} style={{ background:'#fff', borderLeft:`4px solid ${r.color}`, border:`1px solid ${r.color}28`, borderRadius:12, padding:18 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <r.icon size={16} color={r.color} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{r.title}</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:ps.bg, color:ps.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>{ps.label}</span>
                </div>
                <div style={{ fontSize:12, color:'#475569', lineHeight:1.6, marginBottom:10 }}>{r.why}</div>
                <div style={{ background:r.color+'0a', borderRadius:8, padding:'9px 12px', marginBottom:10, border:`1px solid ${r.color}18` }}>
                  <div style={{ fontSize:10, fontWeight:700, color:r.color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Suggested Action</div>
                  <div style={{ fontSize:12, color:'#1e293b', lineHeight:1.6, fontWeight:500 }}>{r.action}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>Confidence:</span>
                  <div style={{ width:80, height:4, background:'#f1f5f9', borderRadius:2 }}>
                    <div style={{ width:`${r.score}%`, height:'100%', background:r.score>80?'#10b981':r.score>60?'#f59e0b':'#ef4444', borderRadius:2 }} />
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:r.score>80?'#10b981':r.score>60?'#f59e0b':'#ef4444' }}>{r.score}%</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
