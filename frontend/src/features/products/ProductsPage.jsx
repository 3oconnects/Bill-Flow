import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, Trash2, Package, UploadCloud } from 'lucide-react'
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
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [view, setView] = useState('table')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.list,
  })

  const deleteMut = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product deleted') },
    onError: (e) => toast.error(e.message),
  })

  const filtered = products.filter((p) =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = products.filter((p) => Number(p.stock_qty) <= Number(p.low_stock_alert))

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Products</h1>
          <p>{products.length} products · {lowStock.length} low stock</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-ghost" onClick={() => setBulkOpen(true)}>
            <UploadCloud size={15} /> Bulk Import
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--yellow)' }}>
          ⚠️ {lowStock.length} product{lowStock.length > 1 ? 's' : ''} below low stock threshold
        </div>
      )}

      <div className="card">
        <div className="inv-filter-bar">
          <div className="inv-filter-left">
            <div className="inv-search-wrap">
              <Search className="inv-search-icon" />
              <input className="inv-search-input" placeholder="Search products, SKU, brand..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Package size={48} />} title="No products yet"
            description="Add your first product to start building your inventory"
            action={<button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={15} /> Add Product</button>} />
        ) : (
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
                        {p.brand && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{p.brand} · {p.model_number}</div>}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku || '—'}</td>
                      <td style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>{p.category}</td>
                      <td style={{ fontWeight: 600 }}>{fmt.currency(p.unit_price)}</td>
                      <td style={{ color: 'var(--text-2)' }}>{fmt.currency(p.purchase_price)}</td>
                      <td>
                        <span style={{ color: isLow ? 'var(--red)' : 'var(--text)', fontWeight: isLow ? 600 : 400 }}>
                          {fmt.number(p.stock_qty)} {p.unit}
                        </span>
                        {isLow && <div style={{ fontSize: 10, color: 'var(--red)' }}>Low stock</div>}
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{p.tax_rate}%</td>
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
    </div>
  )
}
