import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Package, Plus, Printer, Copy, BarChart2, Truck } from 'lucide-react'
import { productsApi, vendorsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import ProductForm from './ProductForm'
import ProductAnalysisModal from './ProductAnalysisModal'

import { S, TABS, WIDE } from './detail/DetailShared'
import { StockAdjust, LinkVendorModalContent } from './detail/Modals'
import PriceListsTab from './detail/PriceListsTab'
import StockHistoryTab from './detail/StockHistoryTab'
import SalesHistoryTab from './detail/SalesHistoryTab'
import ProductKnowledgeCard from './detail/ProductKnowledgeCard'
import ProductCodes from './detail/ProductCodes'
import { confirmAction } from '@/store/confirmStore'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen,       setEditOpen]       = useState(false)
  const [stockOpen,      setStockOpen]      = useState(false)
  const [linkVendorOpen, setLinkVendorOpen] = useState(false)
  const [analysisOpen,   setAnalysisOpen]   = useState(false)
  const [tab,            setTab]            = useState('info')

  const { data: product, isLoading }                             = useQuery({ queryKey: ['product', id],         queryFn: () => productsApi.get(id) })
  const { data: linkedVendors = [] }                             = useQuery({ queryKey: ['product-vendors', id], queryFn: () => productsApi.getVendors(id) })
  const { data: stockHistory = [] }                              = useQuery({ queryKey: ['stock-history', id],   queryFn: () => productsApi.getStockHistory(id) })
  const { data: salesHistory = [] }                              = useQuery({ queryKey: ['sales-history', id],   queryFn: () => productsApi.getSalesHistory(id) })
  const { data: priceLists = [], refetch: refetchPriceLists }    = useQuery({ queryKey: ['price-lists', id],     queryFn: () => productsApi.getPriceLists(id) })
  const { data: allVendors = [] }                                = useQuery({ queryKey: ['vendors'],              queryFn: vendorsApi.list })

  const cloneMut = useMutation({
    mutationFn: () => productsApi.clone(id),
    onSuccess: d => { toast.success('Cloned'); navigate('/products/' + d.id) },
    onError: e => toast.error(e.message),
  })
  const removeVendorMut = useMutation({
    mutationFn: pvid => productsApi.removeVendor(id, pvid),
    onSuccess: () => { qc.invalidateQueries(['product-vendors', id]); toast.success('Vendor unlinked') },
    onError: e => toast.error(e.message),
  })

  if (isLoading) return <PageLoading />
  if (!product)  return <div style={{ padding: 24, color: 'var(--text-2)' }}>Product not found.</div>

  const p = product
  const isLow = Number(p.stock_qty) <= Number(p.low_stock_alert)
  const margin = p.unit_price > 0 ? (((p.unit_price - p.purchase_price) / p.unit_price) * 100).toFixed(1) : 0

  const printLabel = () => {
    const w = window.open('', '_blank', 'width=400,height=300')
    w.document.write(`<html><head><title>${p.name}</title><style>body{font-family:Arial;margin:0;padding:20px}.l{border:1px solid #ccc;border-radius:8px;padding:16px;width:280px}h2{font-size:14px;margin:0 0 4px}.s{font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:2px;margin:8px 0}.p{font-size:20px;font-weight:800;color:#4f46e5}.m{font-size:10px;color:#888;margin-top:8px}@media print{body{margin:0}}</style></head><body><div class="l"><h2>${p.name}</h2><div class="s">${p.sku||p.unique_id}</div><div class="p">&#8377;${Number(p.unit_price).toLocaleString('en-IN')}</div><div class="m">HSN: ${p.hsn_code||'N/A'} &middot; GST: ${p.tax_rate}%</div></div><script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
    w.document.close()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="pd-header">
        <button className="topbar-icon-btn" onClick={() => navigate('/products')}><ArrowLeft size={17} /></button>
        <div className="pd-header-info">
          <div className="pd-header-titlerow">
            <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0, overflowWrap: 'break-word' }}>{p.name}</h1>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', background: p.is_active ? '#ecfdf5' : '#f3f4f6', color: p.is_active ? '#10b981' : '#6b7280' }}>{p.is_active ? 'Active' : 'Inactive'}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
            SKU: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-2)' }}>{p.sku || '—'}</span>
            {p.brand && ` · ${p.brand}`}{p.model_number && ` · ${p.model_number}`}
          </div>
        </div>
        <div className="pd-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={printLabel}><Printer size={13} /> Print Label</button>
          <button className="btn btn-ghost btn-sm" onClick={() => confirmAction('Clone this product?', () => cloneMut.mutate())}><Copy size={13} /> Clone</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setStockOpen(true)}><Package size={13} /> Adjust Stock</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnalysisOpen(true)} style={{ background: 'linear-gradient(135deg,var(--c-primary),#4d9cf0)', color: '#fff', border: 'none' }}><BarChart2 size={13} /> Business Report</button>
          <button className="btn btn-primary btn-sm" onClick={() => setEditOpen(true)}><Edit2 size={13} /> Edit</button>
        </div>
      </div>

      <div className="pd-stats">
        {[
          { label: 'Selling Price',  val: fmt.currency(p.unit_price),            sub: 'Customer price',                         color: 'var(--c-primary)', bg: 'var(--c-primary-lt)' },
          { label: 'Purchase Price', val: fmt.currency(p.purchase_price),         sub: 'Cost price',                             color: '#64748b', bg: 'var(--bg-2)' },
          { label: 'Gross Margin',   val: `${margin}%`,                           sub: `₹${fmt.number(p.unit_price - p.purchase_price)} profit/unit`, color: Number(margin) > 20 ? '#10b981' : '#f59e0b', bg: Number(margin) > 20 ? '#ecfdf5' : '#fffbeb' },
          { label: 'Stock',          val: `${fmt.number(p.stock_qty)} ${p.unit}`, sub: isLow ? `⚠ Below alert (${fmt.number(p.low_stock_alert)})` : `Alert at ${fmt.number(p.low_stock_alert)}`, color: isLow ? '#ef4444' : '#10b981', bg: isLow ? '#fef2f2' : '#ecfdf5' },
        ].map(k => (
          <div key={k.label} className="pd-stat-card" style={{ background: k.bg, border: `1px solid ${k.color}22` }}>
            <div className="pd-stat-label" style={{ color: k.color }}>{k.label}</div>
            <div className="pd-stat-val" style={{ color: k.color }}>{k.val}</div>
            <div className="pd-stat-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="pd-tabbar">
        <div className="pd-tabs">
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} className={`pd-tab-btn${active ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                <t.icon size={12} />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="pd-body">
        <div style={S.card}>
          {tab === 'info' && (
            <div>
              <div style={S.title}>Product Details</div>
              <div className="pd-kv-grid">
                {[['Name',p.name],['Category',p.category],['Unit',p.unit],['HSN Code',p.hsn_code],['Brand',p.brand],['Model',p.model_number],['Tax Rate',`${p.tax_rate}%`],['Unique ID',p.unique_id]].filter(([,v])=>v).map(([l,v]) => (
                  <div key={l} className="pd-kv-row">
                    <span style={S.lbl}>{l}</span>
                    <span className="pd-kv-val" style={{ fontFamily: ['HSN Code','Unique ID'].includes(l) ? 'monospace' : 'inherit' }}>{v}</span>
                  </div>
                ))}
              </div>
              {p.description && <div style={{ marginTop: 16 }}><div style={S.title}>Description</div><div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>{p.description}</div></div>}
            </div>
          )}

          {tab === 'pricing' && (
            <div>
              <div style={S.title}>Pricing Overview</div>
              <div className="pd-grid-3" style={{ marginBottom: 22 }}>
                {[
                  { l: 'Selling Price',  v: fmt.currency(p.unit_price),               n: 'Customer-facing price', c: 'var(--c-primary)', bg: 'var(--c-primary-lt)' },
                  { l: 'Purchase Price', v: fmt.currency(p.purchase_price),            n: 'Cost from vendor',      c: '#64748b', bg: 'var(--bg-2)' },
                  { l: 'Gross Profit',   v: fmt.currency(p.unit_price-p.purchase_price), n: `Margin: ${margin}%`,  c: (p.unit_price-p.purchase_price)>=0?'#10b981':'#ef4444', bg: (p.unit_price-p.purchase_price)>=0?'#ecfdf5':'#fef2f2' },
                ].map(k => (
                  <div key={k.l} style={{ background: k.bg, borderRadius: 10, padding: '13px 15px', border: `1px solid ${k.c}22`, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: k.c, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.l}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: k.c, overflowWrap: 'break-word' }}>{k.v}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{k.n}</div>
                  </div>
                ))}
              </div>
              <div style={S.title}>GST Breakdown (per unit)</div>
              <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '4px 14px' }}>
                {[['Tax Rate',`${p.tax_rate}%`],['Taxable Amount',fmt.currency(p.unit_price)],['GST Amount',fmt.currency(p.unit_price*(p.tax_rate/100))],['Total (incl. GST)',fmt.currency(p.unit_price*(1+p.tax_rate/100))]].map(([l,v],i,a) => (
                  <div key={l} className="pd-kv-row" style={{ borderBottom: i===a.length-1 ? 'none' : '1px solid var(--border)' }}><span style={S.lbl}>{l}</span><span className="pd-kv-val">{v}</span></div>
                ))}
              </div>
            </div>
          )}

          {tab === 'warranty' && (
            <div className="pd-kv-grid">
              {[{title:'Warranty',rows:[['Type',p.warranty_type],['Duration',`${p.warranty_duration} ${p.warranty_unit}`],['Terms',p.warranty_terms]]},{title:'Guarantee',rows:[['Type',p.guarantee_type],['Duration',`${p.guarantee_duration} ${p.guarantee_unit}`],['Terms',p.guarantee_terms]]}].map(s => (
                <div key={s.title}>
                  <div style={S.title}>{s.title}</div>
                  {s.rows.map(([l,v],i,a) => <div key={l} className="pd-kv-row" style={{ borderBottom: i===a.length-1 ? 'none' : '1px solid var(--border)' }}><span style={S.lbl}>{l}</span><span className="pd-kv-val" style={{ textTransform: 'capitalize' }}>{v||'None'}</span></div>)}
                </div>
              ))}
            </div>
          )}

          {tab === 'vendors' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Linked Vendors</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{linkedVendors.length} vendor{linkedVendors.length !== 1 ? 's' : ''} linked</div>
                </div>
                <button className="btn btn-primary" onClick={() => setLinkVendorOpen(true)}><Plus size={13} /> Link Vendor</button>
              </div>
              {linkedVendors.length === 0 ? (
                <div style={S.empty}><Truck size={26} style={{ marginBottom: 8, opacity: 0.3 }} /><div style={{ fontWeight: 600, fontSize: 13 }}>No vendors linked yet</div></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                  <thead><tr>{['Vendor','Supply Price','Margin','Status',''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {linkedVendors.map((pv, i) => {
                      const vm = p.unit_price > 0 ? (((p.unit_price - pv.supply_price) / p.unit_price) * 100).toFixed(1) : 0
                      return (
                        <tr key={pv.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{pv.vendor_name || allVendors.find(v => v.id === pv.vendor_id)?.name || '—'}</td>
                          <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 600 }}>{fmt.currency(pv.supply_price)}</td>
                          <td style={S.td}><span style={{ color: Number(vm) > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{vm}%</span></td>
                          <td style={S.td}>{pv.is_primary ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: '#ecfdf5', color: '#10b981' }}>Primary</span> : <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'var(--bg-2)', color: 'var(--text-3)' }}>Secondary</span>}</td>
                          <td style={{ ...S.td, textAlign: 'right' }}>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', fontSize: 11 }} onClick={() => confirmAction('Unlink vendor?', () => removeVendorMut.mutate(pv.id))}>Unlink</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )}

          {tab === 'stock-history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>Stock Movement History</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{stockHistory.length} record{stockHistory.length !== 1 ? 's' : ''}</div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setStockOpen(true)}><Package size={13} /> Adjust Stock</button>
              </div>
              <StockHistoryTab stockHistory={stockHistory} unit={p.unit} />
            </div>
          )}

          {tab === 'sales' && (
            <div>
              <div style={{ marginBottom: 14 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Sales History</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Invoice lines containing this product</div></div>
              <SalesHistoryTab salesHistory={salesHistory} />
            </div>
          )}

          {tab === 'price-lists' && <PriceListsTab productId={id} priceLists={priceLists} unitPrice={p.unit_price} onRefresh={refetchPriceLists} />}

        </div>

        {!WIDE.includes(tab) && (
          <div className="pd-sidecard-list">
            <div style={S.card}>
              <div style={S.title}>Inventory</div>
              <div className="pd-kv-row"><span style={S.lbl}>Current Stock</span><span className="pd-kv-val" style={{ color: isLow ? '#ef4444' : '#10b981' }}>{fmt.number(p.stock_qty)} {p.unit}</span></div>
              <div className="pd-kv-row" style={{ borderBottom: 'none' }}><span style={S.lbl}>Alert Threshold</span><span className="pd-kv-val">{fmt.number(p.low_stock_alert)} {p.unit}</span></div>
              <div style={{ background: 'var(--bg-2)', borderRadius: 4, height: 6, margin: '12px 0' }}>
                <div style={{ height: '100%', borderRadius: 4, transition: 'width .4s', width: `${Math.min(100, (p.stock_qty / Math.max(p.low_stock_alert * 3, 1)) * 100)}%`, background: isLow ? '#ef4444' : '#10b981' }} />
              </div>
              {isLow && <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>⚠ Below alert threshold</div>}
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStockOpen(true)}><Package size={13} /> Adjust Stock</button>
            </div>

            <div style={S.card}>
              <div style={S.title}>Quick Info</div>
              {[['HSN Code',p.hsn_code],['Tax Rate',`${p.tax_rate}%`],['Stock Value',fmt.currency(p.stock_qty*p.purchase_price)],['Retail Value',fmt.currency(p.stock_qty*p.unit_price)]].filter(([,v])=>v).map(([l,v],i,a) => (
                <div key={l} className="pd-kv-row" style={{ borderBottom: i===a.length-1 ? 'none' : '1px solid var(--border)' }}><span style={S.lbl}>{l}</span><span className="pd-kv-val">{v}</span></div>
              ))}
            </div>

            <ProductCodes p={p} />

            <ProductKnowledgeCard p={p} />
          </div>
        )}
      </div>

      {editOpen && (
        <Modal title="Edit Product" onClose={() => setEditOpen(false)} size="lg">
          <ProductForm initial={p} onSuccess={() => { setEditOpen(false); qc.invalidateQueries(['product', id]); toast.success('Updated') }} onCancel={() => setEditOpen(false)} />
        </Modal>
      )}
      {stockOpen && (
        <Modal title="Adjust Stock" onClose={() => setStockOpen(false)}>
          <StockAdjust product={p} onDone={() => { setStockOpen(false); qc.invalidateQueries(['product', id]); qc.invalidateQueries(['stock-history', id]) }} />
        </Modal>
      )}
      {linkVendorOpen && (
        <Modal title="Link Vendor" onClose={() => setLinkVendorOpen(false)}>
          <LinkVendorModalContent productId={id} existingVendorIds={linkedVendors.map(v => v.vendor_id)} vendors={allVendors}
            onSuccess={() => { setLinkVendorOpen(false); qc.invalidateQueries(['product-vendors', id]) }}
            onCancel={() => setLinkVendorOpen(false)} />
        </Modal>
      )}
      {analysisOpen && (
        <ProductAnalysisModal product={p} salesHistory={salesHistory} stockHistory={stockHistory} onClose={() => setAnalysisOpen(false)} />
      )}
    </div>
  )
}
