import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Package, Plus, Minus, Shield, History, ShoppingBag, Tag, Printer, Copy, TrendingUp, TrendingDown, BarChart2, AlertCircle } from 'lucide-react'
import { productsApi, vendorsApi, invoicesApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import ProductForm from './ProductForm'

function StockAdjust({ product, onDone }) {
  const [delta, setDelta] = useState(0)
  const [note, setNote] = useState('')
  const mutation = useMutation({
    mutationFn: () => productsApi.adjustStock(product.id, { delta, reason: 'manual', note }),
    onSuccess: () => { toast.success('Stock updated'); onDone() },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Current stock:</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt.number(product.stock_qty)} {product.unit}</div>
      </div>
      <div className="form-group">
        <label className="form-label">Adjustment (+ add / − deduct)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setDelta((d) => d - 1)}>
            <Minus size={14} />
          </button>
          <input
            className="form-input" type="number" step="0.001"
            value={delta} onChange={(e) => setDelta(Number(e.target.value))}
            style={{ textAlign: 'center', width: 120, fontWeight: 700, fontSize: 16 }}
          />
          <button type="button" className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setDelta((d) => d + 1)}>
            <Plus size={14} />
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>
          New total: <strong>{fmt.number(Number(product.stock_qty) + delta)} {product.unit}</strong>
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label">Reason</label>
        <select className="form-select sm" value={note} onChange={e => setNote(e.target.value)}>
          <option value="">Select reason...</option>
          <option value="purchase">New Purchase / Received</option>
          <option value="sale">Sale / Dispatched</option>
          <option value="return">Customer Return</option>
          <option value="damaged">Damaged / Write-off</option>
          <option value="count">Physical Count Correction</option>
          <option value="manual">Manual Adjustment</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary" disabled={delta === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner size={14} /> : 'Apply'}
        </button>
      </div>
    </div>
  )
}

function LinkVendorModal({ productId, existingVendorIds, vendors, onSuccess, onCancel }) {
  const [vendorId, setVendorId] = useState('')
  const [supplyPrice, setSupplyPrice] = useState(0)
  const [isPrimary, setIsPrimary] = useState(false)
  const mutation = useMutation({
    mutationFn: () => productsApi.addVendor(productId, { vendor_id: vendorId, supply_price: supplyPrice, is_primary: isPrimary }),
    onSuccess: () => { toast.success('Vendor linked'); onSuccess() },
    onError: (e) => toast.error(e.message),
  })
  const available = vendors.filter((v) => !existingVendorIds.includes(v.id))
  return (
    <div>
      <div className="form-group">
        <label className="form-label">Vendor</label>
        <select className="form-select" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">Select vendor</option>
          {available.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Supply / Purchase Price (₹)</label>
        <input className="form-input" type="number" step="0.01" value={supplyPrice} onChange={(e) => setSupplyPrice(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Set as primary vendor
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!vendorId || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner size={14} /> : 'Link Vendor'}
        </button>
      </div>
    </div>
  )
}


// ── Price Lists component ──────────────────────────────────────────────
function PriceListsTab({ productId, priceLists, unitPrice, onRefresh }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', price: '', min_qty: 1, currency: 'INR' })

  const addMut = useMutation({
    mutationFn: (data) => productsApi.addPriceList(productId, data),
    onSuccess: () => { onRefresh(); setAdding(false); setForm({ label: '', price: '', min_qty: 1, currency: 'INR' }); toast.success('Price added') },
    onError: e => toast.error(e.message),
  })
  const delMut = useMutation({
    mutationFn: (plId) => productsApi.removePriceList(productId, plId),
    onSuccess: () => { onRefresh(); toast.success('Price removed') },
    onError: e => toast.error(e.message),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Custom Price Lists</div>
          <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>Retail, wholesale, distributor pricing per quantity tier</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add Price Tier
        </button>
      </div>

      {/* Standard price row */}
      <div style={{ padding: '12px 16px', background: 'var(--c-primary-lt)', borderRadius: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-primary)' }}>Standard (Default)</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Applies to all invoices unless overridden</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--c-primary)', fontFamily: 'monospace' }}>{fmt.currency(unitPrice)}</div>
      </div>

      {adding && (
        <div style={{ padding: '14px 16px', border: '2px solid var(--c-primary)', borderRadius: 10, marginBottom: 12, background: 'var(--c-primary-lt)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="form-group">
              <label className="form-label">Label</label>
              <input className="form-input sm" placeholder="e.g. Wholesale" value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input className="form-input sm" type="number" placeholder="0.00" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Qty</label>
              <input className="form-input sm" type="number" placeholder="1" value={form.min_qty} onChange={e => setForm(p => ({...p, min_qty: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select sm" value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))}>
                {['INR','USD','EUR','GBP','AED'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!form.label || !form.price} onClick={() => addMut.mutate(form)}>Save Price</button>
          </div>
        </div>
      )}

      {priceLists.length === 0 && !adding ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--c-text3)', border: '1px dashed var(--c-border)', borderRadius: 10 }}>
          <Tag size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>No custom price tiers</div>
          <div style={{ fontSize: 12 }}>Add wholesale, distributor, or tier-based prices for this product.</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Label', 'Min Qty', 'Price', 'Currency', 'Discount vs Standard', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface2)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {priceLists.map((pl, i) => {
              const disc = unitPrice > 0 ? (((unitPrice - Number(pl.price)) / unitPrice) * 100).toFixed(1) : 0
              return (
                <tr key={pl.id} style={{ borderBottom: '1px solid var(--c-border)', background: i % 2 === 0 ? 'transparent' : 'var(--c-surface2)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{pl.label}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{pl.min_qty}+</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-primary)' }}>{fmt.currency(pl.price)}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{pl.currency}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: Number(disc) > 0 ? 'var(--c-green)' : 'var(--c-danger)', fontWeight: 600, fontSize: 12 }}>
                      {Number(disc) > 0 ? '-' : '+'}{Math.abs(disc)}% {Number(disc) > 0 ? '↓' : '↑'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button className="topbar-icon-btn" style={{ color: 'var(--c-danger)' }} onClick={() => delMut.mutate(pl.id)} title="Remove"><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [stockOpen, setStockOpen] = useState(false)
  const [linkVendorOpen, setLinkVendorOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  const { data: product, isLoading } = useQuery({ queryKey: ['product', id], queryFn: () => productsApi.get(id) })
  const { data: linkedVendors = [] } = useQuery({ queryKey: ['product-vendors', id], queryFn: () => productsApi.getVendors(id) })
  const { data: stockHistory = [] } = useQuery({ queryKey: ['stock-history', id], queryFn: () => productsApi.getStockHistory(id) })
  const { data: salesHistory = [] } = useQuery({ queryKey: ['sales-history', id], queryFn: () => productsApi.getSalesHistory(id) })
  const { data: priceLists = [], refetch: refetchPriceLists } = useQuery({ queryKey: ['price-lists', id], queryFn: () => productsApi.getPriceLists(id) })
  // All hooks must be before early returns (Rules of Hooks)
  const cloneMut = useMutation({
    mutationFn: () => productsApi.clone(id),
    onSuccess: (data) => { toast.success('Product cloned'); navigate('/products/' + data.id) },
    onError: e => toast.error(e.message),
  })

  const handleClone = () => {
    if (window.confirm('Clone this product? A copy will be created with zero stock.')) cloneMut.mutate()
  }
  const { data: allVendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })

  const removeVendorMut = useMutation({
    mutationFn: (pvid) => productsApi.removeVendor(id, pvid),
    onSuccess: () => { qc.invalidateQueries(['product-vendors', id]); toast.success('Vendor unlinked') },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return <PageLoading />
  if (!product) return <div style={{ padding: 24, color: 'var(--text-2)' }}>Product not found.</div>

  const p = product
  const isLowStock = Number(p.stock_qty) <= Number(p.low_stock_alert)

  const handlePrintBarcode = () => {
    const w = window.open('', '_blank', 'width=400,height=300')
    w.document.write(`
      <html><head><title>Label - ${p.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .label { border: 1px solid #ccc; border-radius: 8px; padding: 16px; width: 280px; }
        h2 { font-size: 14px; margin: 0 0 4px; }
        .sku { font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
        .price { font-size: 20px; font-weight: 800; color: #4f46e5; }
        .meta { font-size: 10px; color: #888; margin-top: 8px; }
        @media print { body { margin: 0; } }
      </style></head>
      <body>
        <div class="label">
          <h2>${p.name}</h2>
          ${p.brand ? '<div style="font-size:11px;color:#666">'+p.brand+(p.model_number?' · '+p.model_number:'')+'</div>' : ''}
          <div class="sku">${p.sku || p.unique_id}</div>
          <div class="price">₹${Number(p.unit_price).toLocaleString('en-IN')}</div>
          <div class="meta">HSN: ${p.hsn_code || 'N/A'} · GST: ${p.tax_rate}%</div>
        </div>
        <script>window.onload = () => { window.print(); window.close() }</script>
      </body></html>
    `)
    w.document.close()
  }
  const margin = p.unit_price > 0 ? (((p.unit_price - p.purchase_price) / p.unit_price) * 100).toFixed(1) : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="topbar-icon-btn" onClick={() => navigate('/products')}><ArrowLeft size={18} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{p.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            SKU: <span style={{ fontFamily: 'monospace' }}>{p.sku || '—'}</span>
            {p.brand && ` · ${p.brand}`}
            {p.model_number && ` · ${p.model_number}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handlePrintBarcode}>
            <Printer size={14} /> Print Label
          </button>
          <button className="btn btn-ghost" onClick={handleClone}>
            <Copy size={14} /> Clone
          </button>
          <button className="btn btn-ghost" onClick={() => setStockOpen(true)}>
            <Package size={14} /> Adjust Stock
          </button>
          <button className="btn btn-ghost" onClick={() => setEditOpen(true)}>
            <Edit2 size={14} /> Edit
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Selling Price', value: fmt.currency(p.unit_price), color: 'var(--accent)' },
          { label: 'Purchase Price', value: fmt.currency(p.purchase_price), color: 'var(--text)' },
          { label: 'Gross Margin', value: `${margin}%`, color: Number(margin) > 20 ? 'var(--green)' : 'var(--yellow)' },
          { label: 'Stock', value: `${fmt.number(p.stock_qty)} ${p.unit}`, color: isLowStock ? 'var(--red)' : 'var(--green)' },
        ].map((k) => (
          <div key={k.label} className="card">
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            {k.label === 'Stock' && isLowStock && (
              <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 4 }}>⚠ Below alert threshold ({fmt.number(p.low_stock_alert)})</div>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['info', 'pricing', 'warranty', 'vendors', 'stock-history', 'sales', 'price-lists'].map((t) => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'stock-history' ? '📦 Stock History' : t === 'sales' ? '💰 Sales' : t === 'price-lists' ? '🏷️ Price Lists' : t}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: ['vendors','stock-history','sales','price-lists'].includes(activeTab) ? '1fr' : '1fr 320px', gap: 16 }}>
        <div className="card">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[
                  ['Name', p.name], ['Category', p.category], ['Unit', p.unit], ['HSN Code', p.hsn_code],
                  ['Brand', p.brand], ['Model Number', p.model_number], ['Tax Rate', `${p.tax_rate}%`],
                  ['Status', p.is_active ? 'Active' : 'Inactive'], ['Unique ID', p.unique_id],
                ].map(([label, value]) => value ? (
                  <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', width: 130, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, fontFamily: label === 'Unique ID' || label === 'HSN Code' ? 'monospace' : 'inherit' }}>{value}</span>
                  </div>
                ) : null)}
              </div>
              {p.description && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{p.description}</div>
                </div>
              )}
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Selling Price', value: fmt.currency(p.unit_price), note: 'Customer-facing price' },
                  { label: 'Purchase Price', value: fmt.currency(p.purchase_price), note: 'Cost from vendor' },
                  { label: 'Gross Profit', value: fmt.currency(p.unit_price - p.purchase_price), note: `Margin: ${margin}%` },
                ].map((k) => (
                  <div key={k.label} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{k.note}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>GST Breakdown (per unit)</div>
              <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 16 }}>
                {[
                  ['Tax Rate', `${p.tax_rate}%`],
                  ['Taxable Amount', fmt.currency(p.unit_price)],
                  ['GST Amount', fmt.currency(p.unit_price * (p.tax_rate / 100))],
                  ['Total (incl. GST)', fmt.currency(p.unit_price * (1 + p.tax_rate / 100))],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-2)' }}>{l}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty Tab */}
          {activeTab === 'warranty' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Warranty</div>
                {[
                  ['Type', p.warranty_type], ['Duration', `${p.warranty_duration} ${p.warranty_unit}`], ['Terms', p.warranty_terms],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-3)', width: 80 }}>{l}</span>
                    <span style={{ textTransform: 'capitalize' }}>{v || 'None'}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Guarantee</div>
                {[
                  ['Type', p.guarantee_type], ['Duration', `${p.guarantee_duration} ${p.guarantee_unit}`], ['Terms', p.guarantee_terms],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-3)', width: 80 }}>{l}</span>
                    <span style={{ textTransform: 'capitalize' }}>{v || 'None'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendors Tab */}
          {activeTab === 'vendors' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => setLinkVendorOpen(true)}>
                  <Plus size={14} /> Link Vendor
                </button>
              </div>
              {linkedVendors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No vendors linked yet</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Vendor', 'Supply Price', 'Margin', 'Primary', ''].map((h) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linkedVendors.map((pv) => {
                      const vendorMargin = p.unit_price > 0 ? (((p.unit_price - pv.supply_price) / p.unit_price) * 100).toFixed(1) : 0
                      return (
                        <tr key={pv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{pv.vendor_name || allVendors.find((v) => v.id === pv.vendor_id)?.name || '—'}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600 }}>{fmt.currency(pv.supply_price)}</td>
                          <td style={{ padding: '12px 14px', color: Number(vendorMargin) > 0 ? 'var(--green)' : 'var(--red)' }}>{vendorMargin}%</td>
                          <td style={{ padding: '12px 14px' }}>{pv.is_primary ? <Badge status="active" label="Primary" /> : <Badge status="inactive" label="Secondary" />}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--red)' }}
                              onClick={() => window.confirm('Unlink vendor?') && removeVendorMut.mutate(pv.id)}>
                              Unlink
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar — Stock */}
        {!['vendors','stock-history','sales','price-lists'].includes(activeTab) && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Inventory</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>Current Stock</span>
                <span style={{ fontWeight: 700, color: isLowStock ? 'var(--red)' : 'var(--green)' }}>{fmt.number(p.stock_qty)} {p.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>Alert Threshold</span>
                <span style={{ fontWeight: 600 }}>{fmt.number(p.low_stock_alert)} {p.unit}</span>
              </div>
              {/* Stock Bar */}
              <div style={{ background: 'var(--bg-2)', borderRadius: 4, height: 6, marginBottom: 8 }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.min(100, (p.stock_qty / (p.low_stock_alert * 3)) * 100)}%`,
                  background: isLowStock ? 'var(--red)' : 'var(--green)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setStockOpen(true)}>
                <Package size={14} /> Adjust Stock
              </button>
            </div>

            <div className="card">
              <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quick Info</div>
              {[
                ['HSN Code', p.hsn_code], ['Tax Rate', `${p.tax_rate}%`],
                ['Stock Value', fmt.currency(p.stock_qty * p.purchase_price)],
                ['Retail Value', fmt.currency(p.stock_qty * p.unit_price)],
              ].map(([l, v]) => v && (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editOpen && (
        <Modal title="Edit Product" onClose={() => setEditOpen(false)} size="lg">
          <ProductForm initial={p} onSuccess={() => { setEditOpen(false); qc.invalidateQueries(['product', id]); toast.success('Product updated') }} onCancel={() => setEditOpen(false)} />
        </Modal>
      )}
      {stockOpen && (
        <Modal title="Adjust Stock" onClose={() => setStockOpen(false)}>
          <StockAdjust product={p} onDone={() => { setStockOpen(false); qc.invalidateQueries(['product', id]) }} />
        </Modal>
      )}
      {linkVendorOpen && (
        <Modal title="Link Vendor" onClose={() => setLinkVendorOpen(false)}>
          <LinkVendorModal
            productId={id}
            existingVendorIds={linkedVendors.map((v) => v.vendor_id)}
            vendors={allVendors}
            onSuccess={() => { setLinkVendorOpen(false); qc.invalidateQueries(['product-vendors', id]) }}
            onCancel={() => setLinkVendorOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
