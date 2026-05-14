import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, Trash2, Package, UploadCloud, Scan, Shield, AlertCircle, XCircle, Grid, List } from 'lucide-react'
import { productsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, EmptyState, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import ProductForm from './ProductForm'
import BulkUpload from './BulkUpload'

export default function ProductsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all')
  const [category, setCategory] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [view, setView] = useState('list')
  const [scanOpen, setScanOpen] = useState(false)
  const [scanInput, setScanInput] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.list,
  })

  const deleteMut = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product deleted') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = products.filter((p) => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase()) && !p.brand?.toLowerCase().includes(search.toLowerCase())) return false
    if (category && p.category !== category) return false
    if (filterTab === 'active' && !p.is_active) return false
    if (filterTab === 'inactive' && p.is_active) return false
    if (filterTab === 'low_stock' && Number(p.stock_qty) > Number(p.low_stock_alert)) return false
    return true
  })

  const activeProducts = products.filter(p => p.is_active).length
  const outOfStock = products.filter(p => Number(p.stock_qty) === 0)
  const lowStock = products.filter(p => Number(p.stock_qty) > 0 && Number(p.stock_qty) <= Number(p.low_stock_alert))
  const totalValue = products.reduce((acc, p) => acc + (Number(p.stock_qty) * Number(p.purchase_price || p.unit_price || 0)), 0)

  // Get unique categories for dropdown
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1>Products</h1>
        </div>
        <div className="page-header-right" style={{ gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => { setScanInput(''); setScanOpen(true) }} style={{ background: 'white', border: '1px solid var(--c-border)', borderRadius: 8, padding: '8px 16px', color: 'var(--c-text2)', fontWeight: 600 }}>
            <Scan size={15} /> Scan Product
          </button>
          <button className="btn btn-ghost" onClick={() => { setEditing(null); setFormOpen(true) }} style={{ background: 'white', border: '1px solid var(--c-border)', borderRadius: 8, padding: '8px 16px', color: 'var(--c-text2)', fontWeight: 600 }}>
            <Plus size={15} /> Add Product
          </button>
          <button className="btn btn-primary" onClick={() => setBulkOpen(true)} style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 600 }}>
            <UploadCloud size={15} /> Bulk Upload
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c-blue-lt)', color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Products</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)' }}>{products.length}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)' }}>{activeProducts} ACTIVE</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c-green-lt)', color: 'var(--c-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Inventory Value</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)' }}>{fmt.currency(totalValue)}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c-yellow-lt)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Low Stock</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)' }}>{lowStock.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c-red-lt)', color: 'var(--c-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Out of Stock</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)' }}>{outOfStock.length}</div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 320 }}>
          <div className="search-wrap" style={{ width: '100%', maxWidth: 360, background: 'white', border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 16px' }}>
            <Search className="search-icon" size={16} color="var(--c-text3)" />
            <input className="form-input" style={{ border: 'none', background: 'transparent', padding: 0 }} placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 180, background: 'white', border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 16px' }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 13, fontWeight: 600, color: 'var(--c-text3)', cursor: 'pointer' }}>
            <div onClick={() => setFilterTab('all')} style={{ color: filterTab === 'all' ? 'var(--c-text)' : '', transition: 'color 0.2s' }}>All</div>
            <div onClick={() => setFilterTab('active')} style={{ color: filterTab === 'active' ? 'var(--c-text)' : '', transition: 'color 0.2s' }}>Active</div>
            <div onClick={() => setFilterTab('inactive')} style={{ color: filterTab === 'inactive' ? 'var(--c-text)' : '', transition: 'color 0.2s' }}>Inactive</div>
            <div onClick={() => setFilterTab('low_stock')} style={{ color: filterTab === 'low_stock' ? 'var(--c-text)' : '', transition: 'color 0.2s' }}>Low Stock</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-icon-sm" onClick={() => setView('grid')} style={{ padding: 8, background: view === 'grid' ? 'var(--c-primary)' : 'white', color: view === 'grid' ? 'white' : 'var(--c-text3)', border: '1px solid var(--c-border)', borderRadius: 8 }}>
              <Grid size={16} />
            </button>
            <button className="btn-icon-sm" onClick={() => setView('list')} style={{ padding: 8, background: view === 'list' ? 'var(--c-primary)' : 'white', color: view === 'list' ? 'white' : 'var(--c-text3)', border: '1px solid var(--c-border)', borderRadius: 8 }}>
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon={<Package size={48} />} title="No products yet"
            description="Add your first product to start building your inventory"
            action={<button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={15} /> Add Product</button>} />
        ) : view === 'list' ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Purchase</th>
                  <th>Stock</th>
                  <th>Tax</th>
                  <th>Status</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isLow = Number(p.stock_qty) <= Number(p.low_stock_alert)
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${p.id}`)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.brand && <div style={{ fontSize: 11, color: 'var(--c-text2)' }}>{p.brand} · {p.model_number}</div>}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku || '—'}</td>
                      <td style={{ color: 'var(--c-text2)', textTransform: 'capitalize' }}>{p.category}</td>
                      <td style={{ fontWeight: 600 }}>{fmt.currency(p.unit_price)}</td>
                      <td style={{ color: 'var(--c-text2)' }}>{fmt.currency(p.purchase_price)}</td>
                      <td>
                        <span style={{ color: isLow ? 'var(--red)' : 'var(--c-text)', fontWeight: isLow ? 600 : 400 }}>
                          {fmt.number(p.stock_qty)} {p.unit}
                        </span>
                        {isLow && <div style={{ fontSize: 10, color: 'var(--red)' }}>Low stock</div>}
                      </td>
                      <td style={{ color: 'var(--c-text2)' }}>{p.tax_rate}%</td>
                      <td>
                        <Badge status={p.is_active ? 'active' : 'inactive'} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="topbar-icon-btn" title="Edit" onClick={() => { setEditing(p); setFormOpen(true) }}>
                            <Edit2 size={14} />
                          </button>
                          <button className="topbar-icon-btn" title="Delete" onClick={() => window.confirm(`Delete "${p.name}"?`) && deleteMut.mutate(p.id)} style={{ color: 'var(--red)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, padding: 24 }}>
            {filtered.map(p => {
              const isLow = Number(p.stock_qty) <= Number(p.low_stock_alert)
              return (
                <div key={p.id} className="card" onClick={() => navigate(`/products/${p.id}`)} style={{ padding: 16, cursor: 'pointer', transition: 'box-shadow 0.2s', border: '1px solid var(--c-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ background: 'var(--c-surface2)', borderRadius: 8, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={20} color="var(--c-text2)" />
                    </div>
                    <Badge status={p.is_active ? 'active' : 'inactive'} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text2)', fontFamily: 'monospace', marginBottom: 12 }}>{p.sku || 'No SKU'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 2 }}>Stock</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isLow ? 'var(--red)' : 'var(--c-text)' }}>{fmt.number(p.stock_qty)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 2 }}>Price</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-primary)' }}>{fmt.currency(p.unit_price)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? 'Edit Product' : 'New Product'} onClose={() => setFormOpen(false)} size="lg">
          <ProductForm
            initial={editing}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['products']); toast.success(editing ? 'Product updated' : 'Product created') }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
      {bulkOpen && (
        <Modal title="Bulk Import Products" onClose={() => setBulkOpen(false)} size="lg">
          <BulkUpload
            onClose={() => setBulkOpen(false)}
            onDone={() => { setBulkOpen(false); navigate('/products') }}
          />
        </Modal>
      )}
      {scanOpen && (
        <Modal title="" onClose={() => setScanOpen(false)} size="md">
          <div className="scanner-modal" style={{ padding: '0 8px 8px' }}>
            <div className="scanner-header" style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
              <div className="scanner-icon-wrap" style={{ width: 44, height: 44, background: 'var(--c-primary-lt)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-primary)', flexShrink: 0 }}>
                <Scan size={22} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Product Barcode Scanner</div>
                <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>Scan the item to view details or add to inventory</div>
              </div>
            </div>

            <div className="scanner-viewport" style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 12, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                Camera Viewport Placeholder
              </div>
              <div className="scanner-guide" style={{ position: 'absolute', top: '20%', left: '20%', right: '20%', bottom: '20%', border: '2px dashed rgba(255,255,255,0.5)', borderRadius: 8 }}></div>
            </div>

            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', height: 48, marginBottom: 24 }}>
              <UploadCloud size={16} /> Upload Barcode Image
            </button>

            <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Or enter SKU manually</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="search-wrap" style={{ flex: 1 }}>
                  <input 
                    className="form-input" 
                    placeholder="e.g. SKU-1002" 
                    value={scanInput} 
                    onChange={e => setScanInput(e.target.value)} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const match = products.find(p => p.sku === scanInput)
                        if (match) {
                          setScanOpen(false)
                          navigate(`/products/${match.id}`)
                        } else {
                          toast.error('Product not found.')
                        }
                      }
                    }}
                  />
                </div>
                <button className="btn btn-primary" style={{ padding: '0 24px' }} onClick={() => {
                  const match = products.find(p => p.sku === scanInput)
                  if (match) {
                    setScanOpen(false)
                    navigate(`/products/${match.id}`)
                  } else {
                    toast.error('Product not found.')
                  }
                }}>Search</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
