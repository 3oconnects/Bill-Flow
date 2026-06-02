import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Package, Plus, Minus, Tag, Printer, Copy, BarChart2, Trash2, Info, Truck, History, ReceiptText, ChevronDown, Shield, DollarSign } from 'lucide-react'
import { productsApi, vendorsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import ProductForm from './ProductForm'
import ProductAnalysisModal from './ProductAnalysisModal'

const S = {
  card: { background: 'var(--bg-1,#fff)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 },
  title: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 },
  row: (last) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border)', fontSize: 13 }),
  lbl: { fontSize: 12, color: 'var(--text-2)' },
  val: { fontWeight: 600, fontSize: 13 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 20px', textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 12 },
  th: { padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' },
  td: { padding: '10px 14px', fontSize: 13 },
}

const TABS = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'warranty', label: 'Warranty', icon: Shield },
  { id: 'vendors', label: 'Vendors', icon: Truck },
  { id: 'stock-history', label: 'Stock History', icon: History },
  { id: 'sales', label: 'Sales', icon: ReceiptText },
  { id: 'price-lists', label: 'Price Lists', icon: Tag },
]
const WIDE = ['vendors', 'stock-history', 'sales', 'price-lists']

// ── StockAdjust ──────────────────────────────────────────────────────────────
function StockAdjust({ product: p, onDone }) {
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState('')
  const mut = useMutation({
    mutationFn: () => productsApi.adjustStock(p.id, { delta, reason: reason || 'manual', note: reason }),
    onSuccess: () => { toast.success('Stock updated'); onDone() },
    onError: e => toast.error(e.message),
  })
  return (
    <div>
      <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Current stock</span>
        <strong>{fmt.number(p.stock_qty)} {p.unit}</strong>
      </div>
      <div className="form-group">
        <label className="form-label">Adjustment (+add / −deduct)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setDelta(d => d - 1)}><Minus size={13} /></button>
          <input className="form-input" type="number" step="0.001" value={delta} onChange={e => setDelta(Number(e.target.value))} style={{ textAlign: 'center', width: 110, fontWeight: 700, fontSize: 17 }} />
          <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setDelta(d => d + 1)}><Plus size={13} /></button>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)' }}>New total: <strong>{fmt.number(Number(p.stock_qty) + delta)} {p.unit}</strong></div>
      </div>
      <div className="form-group" style={{ marginTop: 10 }}>
        <label className="form-label">Reason</label>
        <select className="form-select" value={reason} onChange={e => setReason(e.target.value)}>
          <option value="">Select…</option>
          {[['purchase','New Purchase'],['sale','Sale / Dispatched'],['return','Customer Return'],['damaged','Damaged / Write-off'],['count','Count Correction'],['manual','Manual']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary" disabled={delta === 0 || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={13} /> : 'Apply'}</button>
      </div>
    </div>
  )
}

// ── LinkVendor ───────────────────────────────────────────────────────────────
function LinkVendorModal({ productId, existingVendorIds, vendors, onSuccess, onCancel }) {
  const [vendorId, setVendorId] = useState('')
  const [price, setPrice] = useState(0)
  const [primary, setPrimary] = useState(false)
  const mut = useMutation({
    mutationFn: () => productsApi.addVendor(productId, { vendor_id: vendorId, supply_price: price, is_primary: primary }),
    onSuccess: () => { toast.success('Vendor linked'); onSuccess() },
    onError: e => toast.error(e.message),
  })
  return (
    <div>
      <div className="form-group">
        <label className="form-label">Vendor</label>
        <select className="form-select" value={vendorId} onChange={e => setVendorId(e.target.value)}>
          <option value="">Select vendor</option>
          {vendors.filter(v => !existingVendorIds.includes(v.id)).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Supply Price (₹)</label>
        <input className="form-input" type="number" step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} /> Set as primary vendor
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!vendorId || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? <Spinner size={13} /> : 'Link Vendor'}</button>
      </div>
    </div>
  )
}

// ── PriceLists tab ───────────────────────────────────────────────────────────
function PriceListsTab({ productId, priceLists, unitPrice, onRefresh }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', price: '', min_qty: 1, currency: 'INR' })
  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const addMut = useMutation({
    mutationFn: d => productsApi.addPriceList(productId, d),
    onSuccess: () => { onRefresh(); setAdding(false); setForm({ label: '', price: '', min_qty: 1, currency: 'INR' }); toast.success('Price added') },
    onError: e => toast.error(e.message),
  })
  const delMut = useMutation({
    mutationFn: id => productsApi.removePriceList(productId, id),
    onSuccess: () => { onRefresh(); toast.success('Removed') },
    onError: e => toast.error(e.message),
  })
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Custom Price Tiers</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Retail, wholesale, distributor pricing per quantity</div>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={13} /> Add Tier</button>
      </div>
      <div style={{ padding: '11px 14px', background: 'var(--accent-light,#eef2ff)', borderRadius: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent)' }}>Standard (Default)</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Applies unless overridden</div>
        </div>
        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', fontFamily: 'monospace' }}>{fmt.currency(unitPrice)}</span>
      </div>
      {adding && (
        <div style={{ padding: 14, border: '2px solid var(--accent)', borderRadius: 10, marginBottom: 12, background: 'var(--accent-light,#eef2ff)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
            {[['Label','text','label'],['Price (₹)','number','price'],['Min Qty','number','min_qty']].map(([l,t,k]) => (
              <div className="form-group" key={k}><label className="form-label">{l}</label><input className="form-input sm" type={t} value={form[k]} onChange={F(k)} /></div>
            ))}
            <div className="form-group"><label className="form-label">Currency</label>
              <select className="form-select sm" value={form.currency} onChange={F('currency')}>
                {['INR','USD','EUR','GBP','AED'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={!form.label || !form.price} onClick={() => addMut.mutate(form)}>Save</button>
          </div>
        </div>
      )}
      {priceLists.length === 0 && !adding ? (
        <div style={S.empty}><Tag size={26} style={{ marginBottom: 8, opacity: 0.3 }} /><div style={{ fontWeight: 600, fontSize: 13 }}>No custom price tiers</div></div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Label','Min Qty','Price','Currency','vs Standard',''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {priceLists.map((pl, i) => {
              const disc = unitPrice > 0 ? (((unitPrice - Number(pl.price)) / unitPrice) * 100).toFixed(1) : 0
              return (
                <tr key={pl.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{pl.label}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace' }}>{pl.min_qty}+</td>
                  <td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>{fmt.currency(pl.price)}</td>
                  <td style={{ ...S.td, fontSize: 12 }}>{pl.currency}</td>
                  <td style={S.td}><span style={{ color: Number(disc) > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 12 }}>{Number(disc) > 0 ? `−${disc}%` : `+${Math.abs(disc)}%`}</span></td>
                  <td style={{ ...S.td, textAlign: 'right' }}><button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={() => delMut.mutate(pl.id)}><Trash2 size={13} /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── StockHistoryTab ──────────────────────────────────────────────────────────
function StockHistoryTab({ stockHistory, unit }) {
  if (!stockHistory.length) return (
    <div style={S.empty}><History size={26} style={{ marginBottom: 8, opacity: 0.3 }} /><div style={{ fontWeight: 600, fontSize: 13 }}>No stock movements yet</div></div>
  )
  const rLabel = { purchase: 'Purchase', sale: 'Sale', return: 'Return', damaged: 'Damaged', count: 'Count Correction', manual: 'Manual', adjustment: 'Adjustment' }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['Date','Type','Change','Before','After','Note'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>
        {stockHistory.map((r, i) => {
          const d = Number(r.delta), isIn = d > 0
          return (
            <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
              <td style={{ ...S.td, fontSize: 12, color: 'var(--text-2)' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
              <td style={S.td}><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: isIn ? '#ecfdf5' : '#fef2f2', color: isIn ? '#10b981' : '#ef4444' }}>{rLabel[r.reason] || r.reason || 'Adjustment'}</span></td>
              <td style={{ ...S.td, fontWeight: 700, fontFamily: 'monospace', color: isIn ? '#10b981' : '#ef4444' }}>{isIn ? '+' : ''}{d.toLocaleString('en-IN')} {unit}</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{Number(r.qty_before || 0).toLocaleString('en-IN')}</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{Number(r.qty_after || 0).toLocaleString('en-IN')}</td>
              <td style={{ ...S.td, fontSize: 12, color: 'var(--text-3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note || '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── SalesHistoryTab ──────────────────────────────────────────────────────────
function SalesHistoryTab({ salesHistory }) {
  if (!salesHistory.length) return (
    <div style={S.empty}><ReceiptText size={26} style={{ marginBottom: 8, opacity: 0.3 }} /><div style={{ fontWeight: 600, fontSize: 13 }}>No sales recorded yet</div></div>
  )
  const sc = { paid: '#10b981', unpaid: '#f59e0b', partial: '#0ea5e9', cancelled: '#ef4444' }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>{['Date','Invoice','Customer','Qty','Unit Price','Amount','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>
        {salesHistory.map((r, i) => {
          const st = (r.invoice_status || 'unpaid').toLowerCase()
          return (
            <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--bg-2)' : 'transparent' }}>
              <td style={{ ...S.td, fontSize: 12, color: 'var(--text-2)' }}>{r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{r.invoice_number || '—'}</td>
              <td style={{ ...S.td, fontWeight: 500 }}>{r.customer_name || '—'}</td>
              <td style={{ ...S.td, fontFamily: 'monospace' }}>{Number(r.quantity).toLocaleString('en-IN')}</td>
              <td style={{ ...S.td, fontFamily: 'monospace' }}>{fmt.currency(r.unit_price)}</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontWeight: 700 }}>{fmt.currency(r.amount)}</td>
              <td style={S.td}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (sc[st] || '#64748b') + '18', color: sc[st] || '#64748b', textTransform: 'capitalize' }}>{st}</span></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── ProductKnowledge sidebar card ────────────────────────────────────────────
function ProductKnowledgeCard({ p }) {
  const [open, setOpen] = useState(true)
  const margin = p.unit_price > 0 ? (((p.unit_price - p.purchase_price) / p.unit_price) * 100).toFixed(1) : '0.0'
  const mc = Number(margin) >= 20 ? '#10b981' : Number(margin) >= 10 ? '#f59e0b' : '#ef4444'
  const warranty = p.warranty_type && p.warranty_type !== 'none' && p.warranty_duration ? `${p.warranty_duration} ${p.warranty_unit} ${p.warranty_type}` : null
  const guarantee = p.guarantee_type && p.guarantee_type !== 'none' && p.guarantee_duration ? `${p.guarantee_duration} ${p.guarantee_unit} ${p.guarantee_type}` : null
  const fields = [
    p.brand         && { e: '🏷️', l: 'Brand',     v: p.brand },
    p.model_number  && { e: '🔢', l: 'Model',     v: p.model_number, mono: true },
    p.category      && { e: '📂', l: 'Category',  v: p.category },
    p.unit          && { e: '📦', l: 'Unit',      v: p.unit },
    p.hsn_code      && { e: '#️⃣', l: 'HSN Code',  v: p.hsn_code, mono: true },
    p.sku           && { e: '🔖', l: 'SKU',       v: p.sku, mono: true },
    warranty        && { e: '🛡️', l: 'Warranty',  v: warranty },
    guarantee       && { e: '✅', l: 'Guarantee', v: guarantee },
  ].filter(Boolean)

  return (
    <div style={{ background: 'var(--bg-1,#fff)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: '#6366f108', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid var(--border)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Info size={12} color="#fff" />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Product Knowledge</span>
        </div>
        <ChevronDown size={13} color="#94a3b8" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{ padding: '12px 14px' }}>
          {/* Margin badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', background: mc + '12', borderRadius: 8, marginBottom: 12, border: `1px solid ${mc}22` }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: mc, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Margin</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: mc, lineHeight: 1.1 }}>{margin}%</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>₹{(p.unit_price - p.purchase_price).toLocaleString('en-IN')} / unit</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: mc + '20', color: mc }}>
                {Number(margin) >= 20 ? 'Healthy' : Number(margin) >= 10 ? 'Moderate' : 'Low'}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>incl. GST</div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                ₹{Math.round(p.unit_price * (1 + p.tax_rate / 100)).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Fields */}
          {fields.map((f, i) => (
            <div key={f.l} style={S.row(i === fields.length - 1)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>{f.e}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{f.l}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', fontFamily: f.mono ? 'monospace' : 'inherit', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.v}</span>
            </div>
          ))}

          {/* Description */}
          {p.description && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{p.description}</div>
            </div>
          )}

          {/* Status */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Status</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: p.is_active ? '#ecfdf5' : '#f3f4f6', color: p.is_active ? '#10b981' : '#6b7280' }}>
              {p.is_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="topbar-icon-btn" onClick={() => navigate('/products')}><ArrowLeft size={17} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>{p.name}</h1>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: p.is_active ? '#ecfdf5' : '#f3f4f6', color: p.is_active ? '#10b981' : '#6b7280' }}>{p.is_active ? 'Active' : 'Inactive'}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
            SKU: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-2)' }}>{p.sku || '—'}</span>
            {p.brand && ` · ${p.brand}`}{p.model_number && ` · ${p.model_number}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn btn-ghost btn-sm" onClick={printLabel}><Printer size={13} /> Print Label</button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Clone this product?') && cloneMut.mutate()}><Copy size={13} /> Clone</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setStockOpen(true)}><Package size={13} /> Adjust Stock</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnalysisOpen(true)} style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#fff', border: 'none' }}><BarChart2 size={13} /> Business Report</button>
          <button className="btn btn-primary btn-sm" onClick={() => setEditOpen(true)}><Edit2 size={13} /> Edit</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Selling Price',  val: fmt.currency(p.unit_price),            sub: 'Customer price',                         color: '#6366f1', bg: '#eef2ff' },
          { label: 'Purchase Price', val: fmt.currency(p.purchase_price),         sub: 'Cost price',                             color: '#64748b', bg: 'var(--bg-2)' },
          { label: 'Gross Margin',   val: `${margin}%`,                           sub: `₹${fmt.number(p.unit_price - p.purchase_price)} profit/unit`, color: Number(margin) > 20 ? '#10b981' : '#f59e0b', bg: Number(margin) > 20 ? '#ecfdf5' : '#fffbeb' },
          { label: 'Stock',          val: `${fmt.number(p.stock_qty)} ${p.unit}`, sub: isLow ? `⚠ Below alert (${fmt.number(p.low_stock_alert)})` : `Alert at ${fmt.number(p.low_stock_alert)}`, color: isLow ? '#ef4444' : '#10b981', bg: isLow ? '#fef2f2' : '#ecfdf5' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${k.color}22` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: k.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>{k.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 5 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'var(--accent,#6366f1)' : 'var(--text-2)', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: active ? '2px solid var(--accent,#6366f1)' : '2px solid transparent', marginBottom: -1, transition: 'all .15s' }}>
                <t.icon size={12} />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: WIDE.includes(tab) ? '1fr' : '1fr 290px', gap: 16, alignItems: 'start' }}>
        <div style={S.card}>

          {/* Info */}
          {tab === 'info' && (
            <div>
              <div style={S.title}>Product Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 28 }}>
                {[['Name',p.name],['Category',p.category],['Unit',p.unit],['HSN Code',p.hsn_code],['Brand',p.brand],['Model',p.model_number],['Tax Rate',`${p.tax_rate}%`],['Unique ID',p.unique_id]].filter(([,v])=>v).map(([l,v],i,a) => (
                  <div key={l} style={S.row(i>=a.length-2)}>
                    <span style={S.lbl}>{l}</span>
                    <span style={{ ...S.val, fontFamily: ['HSN Code','Unique ID'].includes(l) ? 'monospace' : 'inherit' }}>{v}</span>
                  </div>
                ))}
              </div>
              {p.description && <div style={{ marginTop: 16 }}><div style={S.title}>Description</div><div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>{p.description}</div></div>}
            </div>
          )}

          {/* Pricing */}
          {tab === 'pricing' && (
            <div>
              <div style={S.title}>Pricing Overview</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
                {[
                  { l: 'Selling Price',  v: fmt.currency(p.unit_price),               n: 'Customer-facing price', c: '#6366f1', bg: '#eef2ff' },
                  { l: 'Purchase Price', v: fmt.currency(p.purchase_price),            n: 'Cost from vendor',      c: '#64748b', bg: 'var(--bg-2)' },
                  { l: 'Gross Profit',   v: fmt.currency(p.unit_price-p.purchase_price), n: `Margin: ${margin}%`,  c: (p.unit_price-p.purchase_price)>=0?'#10b981':'#ef4444', bg: (p.unit_price-p.purchase_price)>=0?'#ecfdf5':'#fef2f2' },
                ].map(k => (
                  <div key={k.l} style={{ background: k.bg, borderRadius: 10, padding: '13px 15px', border: `1px solid ${k.c}22` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: k.c, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>{k.l}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: k.c }}>{k.v}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{k.n}</div>
                  </div>
                ))}
              </div>
              <div style={S.title}>GST Breakdown (per unit)</div>
              <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '4px 14px' }}>
                {[['Tax Rate',`${p.tax_rate}%`],['Taxable Amount',fmt.currency(p.unit_price)],['GST Amount',fmt.currency(p.unit_price*(p.tax_rate/100))],['Total (incl. GST)',fmt.currency(p.unit_price*(1+p.tax_rate/100))]].map(([l,v],i,a) => (
                  <div key={l} style={S.row(i===a.length-1)}><span style={S.lbl}>{l}</span><span style={S.val}>{v}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty */}
          {tab === 'warranty' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              {[{title:'Warranty',rows:[['Type',p.warranty_type],['Duration',`${p.warranty_duration} ${p.warranty_unit}`],['Terms',p.warranty_terms]]},{title:'Guarantee',rows:[['Type',p.guarantee_type],['Duration',`${p.guarantee_duration} ${p.guarantee_unit}`],['Terms',p.guarantee_terms]]}].map(s => (
                <div key={s.title}>
                  <div style={S.title}>{s.title}</div>
                  {s.rows.map(([l,v],i,a) => <div key={l} style={S.row(i===a.length-1)}><span style={S.lbl}>{l}</span><span style={{ ...S.val, textTransform: 'capitalize' }}>{v||'None'}</span></div>)}
                </div>
              ))}
            </div>
          )}

          {/* Vendors */}
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
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', fontSize: 11 }} onClick={() => window.confirm('Unlink vendor?') && removeVendorMut.mutate(pv.id)}>Unlink</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Stock History */}
          {tab === 'stock-history' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>Stock Movement History</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{stockHistory.length} record{stockHistory.length !== 1 ? 's' : ''}</div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setStockOpen(true)}><Package size={13} /> Adjust Stock</button>
              </div>
              <StockHistoryTab stockHistory={stockHistory} unit={p.unit} />
            </div>
          )}

          {/* Sales */}
          {tab === 'sales' && (
            <div>
              <div style={{ marginBottom: 14 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Sales History</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Invoice lines containing this product</div></div>
              <SalesHistoryTab salesHistory={salesHistory} />
            </div>
          )}

          {/* Price Lists */}
          {tab === 'price-lists' && <PriceListsTab productId={id} priceLists={priceLists} unitPrice={p.unit_price} onRefresh={refetchPriceLists} />}

        </div>

        {/* Sidebar */}
        {!WIDE.includes(tab) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Inventory */}
            <div style={S.card}>
              <div style={S.title}>Inventory</div>
              <div style={S.row(false)}><span style={S.lbl}>Current Stock</span><span style={{ ...S.val, color: isLow ? '#ef4444' : '#10b981' }}>{fmt.number(p.stock_qty)} {p.unit}</span></div>
              <div style={S.row(true)}><span style={S.lbl}>Alert Threshold</span><span style={S.val}>{fmt.number(p.low_stock_alert)} {p.unit}</span></div>
              <div style={{ background: 'var(--bg-2)', borderRadius: 4, height: 6, margin: '12px 0' }}>
                <div style={{ height: '100%', borderRadius: 4, transition: 'width .4s', width: `${Math.min(100, (p.stock_qty / Math.max(p.low_stock_alert * 3, 1)) * 100)}%`, background: isLow ? '#ef4444' : '#10b981' }} />
              </div>
              {isLow && <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>⚠ Below alert threshold</div>}
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStockOpen(true)}><Package size={13} /> Adjust Stock</button>
            </div>

            {/* Quick Info */}
            <div style={S.card}>
              <div style={S.title}>Quick Info</div>
              {[['HSN Code',p.hsn_code],['Tax Rate',`${p.tax_rate}%`],['Stock Value',fmt.currency(p.stock_qty*p.purchase_price)],['Retail Value',fmt.currency(p.stock_qty*p.unit_price)]].filter(([,v])=>v).map(([l,v],i,a) => (
                <div key={l} style={S.row(i===a.length-1)}><span style={S.lbl}>{l}</span><span style={S.val}>{v}</span></div>
              ))}
            </div>

            {/* Product Knowledge */}
            <ProductKnowledgeCard p={p} />

          </div>
        )}
      </div>

      {/* Modals */}
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
          <LinkVendorModal productId={id} existingVendorIds={linkedVendors.map(v => v.vendor_id)} vendors={allVendors}
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
