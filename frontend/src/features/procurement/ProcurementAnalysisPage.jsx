import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { productsApi, vendorsApi } from '@/api'
import { useTopbarStore } from '@/store/topbarStore'
import { useAuthStore } from '@/store/authStore'
// ── MOCK BLOCK — remove next 3 lines to use real data ────────────────────────
import { MOCK_PRODUCTS } from './mock/mockProducts'
import { MOCK_MONTHLY, MOCK_PRODUCT_TRENDS } from './mock/mockTrends'
const DEV_MOCK_EMAIL = 'admin@ozofi.com'
import { PageLoading } from '@/components/ui'
import { Search, Filter, AlertTriangle, TrendingUp, Package, DollarSign, BarChart2, Zap, Activity, ChevronRight } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import ProductDrilldown from './components/ProductDrilldown'
import { useProcurementData } from './hooks/useProcurementData'
import { fmt } from '@/lib/utils'

const COLORS = ['#6366f1','#10b981','#f59e0b','#0ea5e9','#7c3aed']
const ABC_COLOR = { A:'#10b981', B:'#f59e0b', C:'#ef4444' }
const SEL = { padding:'6px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:12, color:'#475569', background:'#fff' }
const TT = ({ active, payload, label, money }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <div style={{ fontWeight:700, marginBottom:3 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color }}>{p.name}: <strong>{money ? fmt.currency(p.value) : p.value}</strong></div>)}
    </div>
  )
}

function KPICard({ icon:Icon, label, value, sub, color, bg }) {
  return (
    <div style={{ background:bg, borderRadius:12, padding:'14px 16px', border:`1px solid ${color}22` }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ width:24, height:24, borderRadius:6, background:color+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={12} color={color} />
        </div>
        <span style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, color:'#64748b' }}>{sub}</div>
    </div>
  )
}

function SectionHead({ title, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 }}>
      <span style={{ fontSize:13, fontWeight:700 }}>{title}</span>
      {sub && <span style={{ fontSize:11, color:'#94a3b8' }}>{sub}</span>}
    </div>
  )
}

function buildInsights(data) {
  const ins = []
  const { withABC, reorderCandidates, overstocked, avgMargin, totalRetailValue, categoryBreakdown } = data
  const critical = reorderCandidates.filter(p => Number(p.stock_qty) === 0)
  if (critical.length) ins.push({ p:'critical', color:'#ef4444', bg:'#fef2f2', title:`${critical.length} product${critical.length>1?'s':''} out of stock`, action:`Place emergency orders. Est. cost: ${fmt.currency(critical.reduce((s,p)=>s+p.purchase_price*Math.max(Number(p.low_stock_alert)*2,10),0))}` })
  const lowNotZero = reorderCandidates.filter(p => Number(p.stock_qty) > 0)
  if (lowNotZero.length) ins.push({ p:'high', color:'#f59e0b', bg:'#fffbeb', title:`${lowNotZero.length} products approaching reorder point`, action:'Review sales velocity and place purchase orders before stockout.' })
  const lowMargin = withABC.filter(p => p.margin > 0 && p.margin < 10 && Number(p.unit_price) > 0)
  if (lowMargin.length) ins.push({ p:'high', color:'#ef4444', bg:'#fef2f2', title:`${lowMargin.length} products with margin below 10%`, action:`Renegotiate purchase prices or adjust sell price. Extra profit potential: ${fmt.currency(lowMargin.reduce((s,p)=>s+Number(p.unit_price)*0.05*Number(p.stock_qty),0))}` })
  if (overstocked.length) ins.push({ p:'medium', color:'#7c3aed', bg:'#ede9fe', title:`${overstocked.length} products overstocked — ${fmt.currency(overstocked.reduce((s,p)=>s+p.stockValue,0))} capital tied up`, action:'Consider clearance promotions or bundle deals to free working capital.' })
  if (categoryBreakdown.length > 0) {
    const t = categoryBreakdown[0], sh = totalRetailValue>0?(t.retailValue/totalRetailValue*100):0
    if (sh > 60) ins.push({ p:'medium', color:'#f59e0b', bg:'#fffbeb', title:`${sh.toFixed(0)}% of value concentrated in ${t.name}`, action:'Diversify into adjacent categories to reduce concentration risk.' })
  }
  const classA = withABC.filter(p => p.abcClass==='A' && p.margin>=20)
  if (classA.length) ins.push({ p:'low', color:'#10b981', bg:'#ecfdf5', title:`${classA.length} Class A products with healthy margins — scale opportunity`, action:`Increase stock depth for ${classA.slice(0,2).map(p=>p.name).join(' and ')}.` })
  if (!ins.length) ins.push({ p:'low', color:'#10b981', bg:'#ecfdf5', title:'Inventory health is strong', action:`All stock above alert levels · avg margin ${avgMargin.toFixed(1)}%` })
  return ins
}

export default function ProcurementAnalysisPage() {
  const setContext = useTopbarStore(s => s.setContext)
  useEffect(() => { setContext('Procurement Analysis','Inventory intelligence · stock health · margin breakdown') }, [])

  const [tab, setTab]              = useState('overview')
  const [trendView, setTrendView]  = useState('stock')
  const [search, setSearch]        = useState('')
  const [filterCat, setFilterCat]  = useState('')
  const [filterABC, setFilterABC]  = useState('')
  const [filterStatus, setFStatus] = useState('')
  const [filterMargin, setFMargin] = useState('')
  const [sortBy, setSortBy]        = useState('retailValue')
  const [selected, setSelected]    = useState(null)

  const { user } = useAuthStore()
  const isMock = DEV_MOCK_EMAIL && user?.email === DEV_MOCK_EMAIL
  const { data: realProducts = [], isLoading: pLoad } = useQuery({ queryKey:['products'], queryFn:productsApi.list, enabled:!isMock })
  const { data: vendors = [],      isLoading: vLoad } = useQuery({ queryKey:['vendors'],  queryFn:vendorsApi.list,  enabled:!isMock })
  const products   = isMock ? MOCK_PRODUCTS       : realProducts
  const monthly    = isMock ? MOCK_MONTHLY        : []
  const prodTrends = isMock ? MOCK_PRODUCT_TRENDS : {}

  const data = useProcurementData(products, vendors)
  if (!isMock && (pLoad || vLoad)) return <PageLoading />
  if (!data) return <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No products found. Add products first.</div>

  const insights = useMemo(() => buildInsights(data), [data])
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const hasFilter = search||filterCat||filterABC||filterStatus||filterMargin

  const catalogueRows = data.withABC.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.sku||'').toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat    && p.category !== filterCat)   return false
    if (filterABC    && p.abcClass !== filterABC)   return false
    if (filterStatus === 'active'   && !p.is_active) return false
    if (filterStatus === 'inactive' &&  p.is_active) return false
    if (filterStatus === 'low'  && Number(p.stock_qty) > Number(p.low_stock_alert)) return false
    if (filterStatus === 'out'  && Number(p.stock_qty) > 0) return false
    if (filterMargin === 'high'   && p.margin < 20) return false
    if (filterMargin === 'medium' && (p.margin < 10 || p.margin >= 20)) return false
    if (filterMargin === 'low'    && p.margin >= 10) return false
    return true
  }).sort((a,b) => sortBy==='name' ? a.name.localeCompare(b.name) : sortBy==='margin' ? b.margin-a.margin : sortBy==='stock' ? b.stock_qty-a.stock_qty : sortBy==='stockValue' ? b.stockValue-a.stockValue : b.retailValue-a.retailValue)

  const catChartData = data.categoryBreakdown.slice(0,5).map(c => ({ name:c.name.charAt(0).toUpperCase()+c.name.slice(1), value:Math.round(c.retailValue) }))
  const bucketData = Object.entries(data.marginBuckets).map(([name,value]) => ({ name:name.split('(')[0].trim(), value }))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {isMock && (
        <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:8, padding:'7px 12px', borderRadius:8, background:'#fffbeb', border:'1px solid #fde68a', fontSize:11, color:'#92400e' }}>
          <span style={{ fontWeight:700 }}>⚠ Demo</span> Sample data active — set <code style={{ background:'#fef3c7', padding:'1px 4px', borderRadius:3 }}>DEV_MOCK_EMAIL = ''</code> to use real data.
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom:'1px solid var(--border)', marginBottom:20 }}>
        <div style={{ display:'flex', gap:2 }}>
          {[{id:'overview',label:'Overview',icon:BarChart2},{id:'catalogue',label:'Full Catalogue',icon:Filter}].map(t => {
            const active = tab===t.id
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 16px', fontSize:12, fontWeight:active?700:500, color:active?'var(--accent,#6366f1)':'var(--text-2)', background:'transparent', border:'none', cursor:'pointer', borderBottom:active?'2px solid var(--accent,#6366f1)':'2px solid transparent', marginBottom:-1 }}>
                <t.icon size={12} />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

          {/* Row 1: KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            <KPICard icon={Package}       label="Total Products"   value={data.total}                        sub={`${data.active} active · ${data.total-data.active} inactive`}   color="#6366f1" bg="#eef2ff" />
            <KPICard icon={DollarSign}    label="Inventory Value"  value={fmt.currency(data.totalStockValue)} sub={`Retail: ${fmt.currency(data.totalRetailValue)}`}               color="#f59e0b" bg="#fffbeb" />
            <KPICard icon={TrendingUp}    label="Potential Profit" value={fmt.currency(data.potentialProfit)} sub={`Avg margin: ${data.avgMargin.toFixed(1)}%`}                    color="#10b981" bg="#ecfdf5" />
            <KPICard icon={AlertTriangle} label="Stock Alerts"     value={data.lowStock.length}               sub={`${data.zeroStock.length} out of stock`}                       color={data.lowStock.length>0?'#ef4444':'#10b981'} bg={data.lowStock.length>0?'#fef2f2':'#ecfdf5'} />
          </div>

          {/* Row 2: Trend chart + AI Insights — only show trend if data exists */}
          <div style={{ display:'grid', gridTemplateColumns: monthly.length ? '1fr 380px' : '1fr', gap:16 }}>
            {/* Trend chart — hidden when no historical data */}
            {monthly.length > 0 && <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <SectionHead title="Inventory Trend" sub="last 6 months" />
                <div style={{ display:'flex', gap:4 }}>
                  {[['stock','Stock Value'],['procurement','Procurement'],['units','Units']].map(([v,l]) => (
                    <button key={v} onClick={()=>setTrendView(v)} style={{ padding:'4px 10px', fontSize:11, fontWeight:trendView===v?700:500, borderRadius:6, border:'none', cursor:'pointer', background:trendView===v?'#6366f1':'#f1f5f9', color:trendView===v?'#fff':'#64748b' }}>{l}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                {trendView==='units' ? (
                  <BarChart data={monthly} margin={{ top:0,right:5,bottom:0,left:-10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize:10, fill:'#94a3b8' }} />
                    <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} />
                    <Tooltip content={<TT />} />
                    <Bar dataKey="units" name="Units" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={monthly} margin={{ top:0,right:5,bottom:0,left:-10 }}>
                    <defs>
                      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize:10, fill:'#94a3b8' }} />
                    <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} tickFormatter={v=>`₹${(v/100000).toFixed(0)}L`} />
                    <Tooltip content={<TT money />} />
                    <Area type="monotone" dataKey={trendView==='stock'?'stockValue':'procurement'} name={trendView==='stock'?'Stock Value':'Procurement'} stroke="#6366f1" fill="url(#tg)" strokeWidth={2.5} dot={{ r:3 }} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>}

            {/* AI Insights */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 18px', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <Zap size={13} color="#6366f1" />
                <SectionHead title="AI Insights" sub={`${insights.length} suggestions`} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7, overflowY:'auto', maxHeight:210 }}>
                {insights.map((r,i) => (
                  <div key={i} style={{ padding:'9px 11px', borderRadius:9, background:r.bg, borderLeft:`3px solid ${r.color}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:20, background:r.color, color:'#fff', textTransform:'uppercase' }}>{r.p}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:'#1e293b' }}>{r.title}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#475569', lineHeight:1.5 }}>{r.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: ABC matrix + Category pie + Margin chart */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
            {/* ABC */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 18px' }}>
              <SectionHead title="ABC Classification" sub="by retail value" />
              {['A','B','C'].map(cls => {
                const items = data.withABC.filter(p=>p.abcClass===cls)
                const val = items.reduce((s,p)=>s+p.stockValue,0)
                const mc = ABC_COLOR[cls]
                return (
                  <div key={cls} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:mc+'18', border:`1px solid ${mc}33`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:14, color:mc, flexShrink:0 }}>{cls}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:11, fontWeight:600 }}>{items.length} products</span>
                        <span style={{ fontSize:11, fontWeight:700, color:mc }}>{fmt.currency(val)}</span>
                      </div>
                      <div style={{ height:4, background:'#f1f5f9', borderRadius:2 }}>
                        <div style={{ height:'100%', width:`${data.totalStockValue>0?Math.round(val/data.totalStockValue*100):0}%`, background:mc, borderRadius:2 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Category pie */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 18px' }}>
              <SectionHead title="Value by Category" />
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={catChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({name,percent})=>`${name.slice(0,4)} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{ fontSize:9 }}>
                    {catChartData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<TT money />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
                {catChartData.map((c,i) => (
                  <div key={c.name} style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:COLORS[i%COLORS.length], flexShrink:0 }} />
                      <span style={{ color:'#475569', textTransform:'capitalize' }}>{c.name}</span>
                    </div>
                    <span style={{ fontWeight:600 }}>{fmt.currency(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Margin distribution */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 18px' }}>
              <SectionHead title="Margin Distribution" />
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={bucketData} margin={{ top:0,right:0,bottom:0,left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize:8, fill:'#94a3b8' }} interval={0} angle={-15} textAnchor="end" height={32} />
                  <YAxis tick={{ fontSize:9, fill:'#94a3b8' }} />
                  <Tooltip content={<TT />} />
                  <Bar dataKey="value" name="Products" radius={[3,3,0,0]}>
                    {bucketData.map((_,i) => <Cell key={i} fill={['#ef4444','#f97316','#f59e0b','#10b981','#6366f1'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                {bucketData.map((b,i)=>(
                  <div key={b.name} style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                    <span style={{ color:'#475569' }}>{b.name}</span>
                    <span style={{ fontWeight:600 }}>{b.value} products</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Reorder + Top margin */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* Reorder needed */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>Reorder Required</div>
                <span style={{ fontSize:11, color:'#94a3b8' }}>{data.reorderCandidates.length} products</span>
              </div>
              {data.reorderCandidates.length===0 ? (
                <div style={{ padding:'24px', textAlign:'center', fontSize:12, color:'#94a3b8' }}>✓ All stock levels healthy</div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#f8fafc' }}>
                    {['Product','Stock','Alert','Urgency'].map(h=><th key={h} style={{ padding:'7px 12px', fontSize:10, fontWeight:700, color:'#94a3b8', textAlign:'left', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #e2e8f0' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.reorderCandidates.slice(0,6).map((p,i)=>{
                      const qty=Number(p.stock_qty), u=qty===0?{l:'Out',c:'#ef4444',bg:'#fef2f2'}:qty/Number(p.low_stock_alert)<=0.5?{l:'Critical',c:'#ef4444',bg:'#fef2f2'}:{l:'Low',c:'#f59e0b',bg:'#fffbeb'}
                      return(
                        <tr key={p.id} style={{ borderBottom:'1px solid #f8fafc', background:i%2?'#fafafa':'#fff' }}>
                          <td style={{ padding:'7px 12px', fontSize:12, fontWeight:500, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</td>
                          <td style={{ padding:'7px 12px', fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#ef4444' }}>{fmt.number(p.stock_qty)}</td>
                          <td style={{ padding:'7px 12px', fontFamily:'monospace', fontSize:12, color:'#64748b' }}>{fmt.number(p.low_stock_alert)}</td>
                          <td style={{ padding:'7px 12px' }}><span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:20, background:u.bg, color:u.c }}>{u.l}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top margin products */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>Top Margin Products</div>
                <span style={{ fontSize:11, color:'#94a3b8' }}>by gross %</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc' }}>
                  {['#','Product','Sell','Cost','Margin'].map(h=><th key={h} style={{ padding:'7px 12px', fontSize:10, fontWeight:700, color:'#94a3b8', textAlign:'left', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #e2e8f0' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.topByMargin.slice(0,6).map((p,i)=>{
                    const mc=p.margin>=30?'#10b981':p.margin>=15?'#f59e0b':'#ef4444'
                    return(
                      <tr key={p.id} style={{ borderBottom:'1px solid #f8fafc', background:i%2?'#fafafa':'#fff' }}>
                        <td style={{ padding:'7px 12px', fontSize:11, color:'#94a3b8', fontWeight:700 }}>{i+1}</td>
                        <td style={{ padding:'7px 12px', fontSize:12, fontWeight:500, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</td>
                        <td style={{ padding:'7px 12px', fontFamily:'monospace', fontSize:11 }}>{fmt.currency(p.unit_price)}</td>
                        <td style={{ padding:'7px 12px', fontFamily:'monospace', fontSize:11 }}>{fmt.currency(p.purchase_price)}</td>
                        <td style={{ padding:'7px 12px' }}><span style={{ fontWeight:800, fontFamily:'monospace', fontSize:12, color:mc }}>{p.margin.toFixed(1)}%</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CATALOGUE ── */}
      {tab==='catalogue' && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:'1 1 180px' }}>
              <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or SKU…"
                style={{ width:'100%', padding:'7px 9px 7px 28px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:12, boxSizing:'border-box' }} />
            </div>
            {[[filterCat,setFilterCat,[['','All Categories'],...categories.map(c=>[c,c.charAt(0).toUpperCase()+c.slice(1)])]],
              [filterABC,setFilterABC,[['','All Classes'],['A','Class A'],['B','Class B'],['C','Class C']]],
              [filterStatus,setFStatus,[['','All Status'],['active','Active'],['inactive','Inactive'],['low','Low Stock'],['out','Out of Stock']]],
              [filterMargin,setFMargin,[['','All Margins'],['high','High ≥20%'],['medium','Medium 10-20%'],['low','Low <10%']]],
              [sortBy,setSortBy,[['retailValue','Sort: Retail Value'],['stockValue','Sort: Stock Value'],['margin','Sort: Margin'],['stock','Sort: Qty'],['name','Sort: Name']]],
            ].map(([val,set,opts],i)=>(
              <select key={i} value={val} onChange={e=>set(e.target.value)} style={SEL}>
                {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            {hasFilter && <button onClick={()=>{setSearch('');setFilterCat('');setFilterABC('');setFStatus('');setFMargin('')}} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid #fecaca', background:'#fef2f2', color:'#ef4444', fontSize:12, cursor:'pointer' }}>× Clear</button>}
            <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto' }}>{catalogueRows.length} of {data.withABC.length}</span>
          </div>
          <div style={{ padding:'5px 16px', fontSize:11, color:'#94a3b8', background:'#fafafa', borderBottom:'1px solid #f1f5f9' }}>Click any row for product details</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Class','Product','SKU','Category','Stock','Sell Price','Cost Price','Margin','Stock Value','Status'].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {catalogueRows.map((p,i)=>{
                  const isLow=Number(p.stock_qty)<=Number(p.low_stock_alert)
                  const mc=p.margin>=20?'#10b981':p.margin>=10?'#f59e0b':'#ef4444'
                  const isSel=selected?.id===p.id
                  return(
                    <tr key={p.id} onClick={()=>setSelected(isSel?null:p)}
                      style={{ borderBottom:'1px solid #f8fafc', background:isSel?'#eef2ff':i%2?'#fafafa':'#fff', cursor:'pointer' }}>
                      <td style={{ padding:'9px 12px' }}><span style={{ fontWeight:800, fontSize:12, color:ABC_COLOR[p.abcClass] }}>{p.abcClass}</span></td>
                      <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</td>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:11, color:'#64748b' }}>{p.sku||'—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'#64748b', textTransform:'capitalize' }}>{p.category}</td>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:12, fontWeight:600, color:isLow?'#ef4444':'#10b981' }}>{fmt.number(p.stock_qty)} {p.unit}</td>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:12 }}>{fmt.currency(p.unit_price)}</td>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:12 }}>{fmt.currency(p.purchase_price)}</td>
                      <td style={{ padding:'9px 12px' }}><span style={{ fontWeight:800, fontFamily:'monospace', fontSize:12, color:mc }}>{p.margin.toFixed(1)}%</span></td>
                      <td style={{ padding:'9px 12px', fontFamily:'monospace', fontSize:12 }}>{fmt.currency(p.stockValue)}</td>
                      <td style={{ padding:'9px 12px' }}><span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:p.is_active?'#ecfdf5':'#f3f4f6', color:p.is_active?'#10b981':'#6b7280' }}>{p.is_active?'Active':'Inactive'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <ProductDrilldown product={selected} trendData={prodTrends[selected.id]} onClose={()=>setSelected(null)} />}
    </div>
  )
}
