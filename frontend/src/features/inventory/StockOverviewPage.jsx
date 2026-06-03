import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { Search, AlertCircle, Package, Layers, TrendingUp, Eye } from 'lucide-react'
import { fmt } from '@/lib/utils'

const WAREHOUSES = [
  { id: 'main', name: 'Main Warehouse' },
  { id: 'branch1', name: 'Branch Office' },
  { id: 'branch2', name: 'Distribution Center' },
]

const STOCK_STATUS = {
  inStock: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'In Stock' },
  lowStock: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Low Stock' },
  outOfStock: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Out of Stock' },
}

// Mock data - replace with API
const MOCK_STOCK = [
  { id: 1, sku: 'PROD-001', product: 'Laptop - Dell XPS 13', category: 'Electronics', quantity: 45, reorderLevel: 10, warehouse: 'main', value: 1125000, status: 'inStock' },
  { id: 2, sku: 'PROD-002', product: 'Mouse - Wireless', category: 'Accessories', quantity: 3, reorderLevel: 20, warehouse: 'main', value: 4500, status: 'lowStock' },
  { id: 3, sku: 'PROD-003', product: 'Keyboard - Mechanical', category: 'Accessories', quantity: 0, reorderLevel: 15, warehouse: 'main', value: 0, status: 'outOfStock' },
  { id: 4, sku: 'PROD-004', product: 'Monitor - 27" 4K', category: 'Electronics', quantity: 12, reorderLevel: 5, warehouse: 'branch1', value: 540000, status: 'inStock' },
  { id: 5, sku: 'PROD-005', product: 'USB Cable - Type C', category: 'Accessories', quantity: 156, reorderLevel: 50, warehouse: 'branch1', value: 78000, status: 'inStock' },
  { id: 6, sku: 'PROD-006', product: 'HDMI Cable', category: 'Accessories', quantity: 8, reorderLevel: 25, warehouse: 'branch2', value: 4000, status: 'lowStock' },
  { id: 7, sku: 'PROD-007', product: 'Desk Lamp - LED', category: 'Office', quantity: 23, reorderLevel: 5, warehouse: 'branch2', value: 57500, status: 'inStock' },
  { id: 8, sku: 'PROD-008', product: 'Office Chair', category: 'Furniture', quantity: 0, reorderLevel: 3, warehouse: 'main', value: 0, status: 'outOfStock' },
]

export default function StockOverviewPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [stock, setStock] = useState(MOCK_STOCK)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    setContext('Inventory', 'Stock Overview')
    setActions(null)
    return clear
  }, [setActions, setContext, clear])

  const filteredStock = stock.filter(item => {
    const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWarehouse = selectedWarehouse === 'all' || item.warehouse === selectedWarehouse
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    return matchesSearch && matchesWarehouse && matchesStatus
  })

  const totalValue = filteredStock.reduce((sum, item) => sum + item.value, 0)
  const totalQuantity = filteredStock.reduce((sum, item) => sum + item.quantity, 0)
  const lowStockCount = filteredStock.filter(item => item.status === 'lowStock' || item.status === 'outOfStock').length
  const inStockCount = filteredStock.filter(item => item.status === 'inStock').length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Stock Overview</h1>
          <p>View real-time stock levels across all products and warehouses.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Value</span>
            <TrendingUp size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-primary)' }}>
            {fmt.currency(totalValue)}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Items</span>
            <Package size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{totalQuantity}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>In Stock</span>
            <Eye size={18} style={{ color: 'var(--c-info)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{inStockCount}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Low Stock Alert</span>
            <AlertCircle size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-warning)' }}>{lowStockCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 320 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by product or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            className="form-select"
            style={{ width: 180 }}
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="all">All Warehouses</option>
            {WAREHOUSES.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ width: 140 }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="inStock">In Stock</option>
            <option value="lowStock">Low Stock</option>
            <option value="outOfStock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredStock.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<Layers size={48} />}
              title="No stock items found"
              description={searchTerm || selectedWarehouse !== 'all' || selectedStatus !== 'all'
                ? "Try adjusting your filters or search terms."
                : "No stock data available."}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>PRODUCT</th>
                  <th>CATEGORY</th>
                  <th style={{ textAlign: 'center' }}>QUANTITY</th>
                  <th style={{ textAlign: 'center' }}>REORDER LEVEL</th>
                  <th>WAREHOUSE</th>
                  <th style={{ textAlign: 'right' }}>VALUE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text3)', fontWeight: 600 }}>
                      {item.sku}
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.product}</td>
                    <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>{item.category}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 14 }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--c-text3)', fontSize: 12 }}>
                      {item.reorderLevel}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {WAREHOUSES.find(w => w.id === item.warehouse)?.name}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: item.value > 0 ? 'var(--c-primary)' : 'var(--c-text3)' }}>
                      {fmt.currency(item.value)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: STOCK_STATUS[item.status]?.bg,
                          color: STOCK_STATUS[item.status]?.color,
                        }}
                      >
                        {STOCK_STATUS[item.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: STOCK_STATUS.inStock.color }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>In Stock: Quantity ≥ Reorder Level</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: STOCK_STATUS.lowStock.color }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Low Stock: Quantity &lt; Reorder Level</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: STOCK_STATUS.outOfStock.color }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Out of Stock: Quantity = 0</span>
        </div>
      </div>
    </div>
  )
}
