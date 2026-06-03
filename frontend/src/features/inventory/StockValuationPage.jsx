import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { DollarSign, BarChart3, Warehouse } from 'lucide-react'
import { fmt } from '@/lib/utils'

const VALUATION_METHODS = {
  fifo: { label: 'FIFO (First In First Out)', description: 'Items valued at oldest purchase cost' },
  lifo: { label: 'LIFO (Last In First Out)', description: 'Items valued at newest purchase cost' },
  weighted: { label: 'Weighted Average', description: 'Items valued at average purchase cost' },
}

const MOCK_VALUATION = [
  { id: 1, sku: 'PROD-001', product: 'Laptop - Dell XPS 13', quantity: 45, unitCost: 25000, category: 'Electronics', warehouse: 'Main Warehouse', fifo: 1125000, lifo: 1125000, weighted: 1125000 },
  { id: 2, sku: 'PROD-002', product: 'Mouse - Wireless', quantity: 3, unitCost: 1500, category: 'Accessories', warehouse: 'Main Warehouse', fifo: 4500, lifo: 4500, weighted: 4500 },
  { id: 3, sku: 'PROD-004', product: 'Monitor - 27" 4K', quantity: 12, unitCost: 45000, category: 'Electronics', warehouse: 'Branch Office', fifo: 540000, lifo: 540000, weighted: 540000 },
  { id: 4, sku: 'PROD-005', product: 'USB Cable - Type C', quantity: 156, unitCost: 500, category: 'Accessories', warehouse: 'Branch Office', fifo: 78000, lifo: 78000, weighted: 78000 },
  { id: 5, sku: 'PROD-006', product: 'HDMI Cable', quantity: 8, unitCost: 500, category: 'Accessories', warehouse: 'Distribution Center', fifo: 4000, lifo: 4000, weighted: 4000 },
  { id: 6, sku: 'PROD-007', product: 'Desk Lamp - LED', quantity: 23, unitCost: 2500, category: 'Office', warehouse: 'Distribution Center', fifo: 57500, lifo: 57500, weighted: 57500 },
]

export default function StockValuationPage() {
  const { setContext, clear } = useTopbarStore()
  const [valuationMethod, setValuationMethod] = useState('fifo')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [data] = useState(MOCK_VALUATION)

  useEffect(() => { setContext('Inventory', 'Stock Valuation'); return clear }, [setContext, clear])

  const filteredData = selectedWarehouse === 'all' ? data : data.filter(d => d.warehouse === selectedWarehouse)
  const methodKey = valuationMethod
  const totalValue = filteredData.reduce((sum, item) => sum + item[methodKey], 0)
  const warehouses = [...new Set(data.map(d => d.warehouse))]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Stock Valuation</h1>
          <p>Calculate total inventory value using FIFO, LIFO or weighted average.</p>
        </div>
      </div>

      {/* Method Selector - 3 Equal Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {Object.entries(VALUATION_METHODS).map(([key, method]) => (
          <div
            key={key}
            onClick={() => setValuationMethod(key)}
            style={{
              padding: 16,
              border: `2px solid ${valuationMethod === key ? 'var(--c-primary)' : 'var(--c-border)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              background: valuationMethod === key ? 'var(--c-primary-lt)' : 'var(--c-surface)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{method.label}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{method.description}</div>
          </div>
        ))}
      </div>

      {/* Filters & Summary */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <select className="form-select" style={{ width: 180 }} value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
          <option value="all">All Warehouses</option>
          {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <div className="spacer" />
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 280 }}>
          <DollarSign size={20} style={{ color: 'var(--c-primary)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', fontWeight: 600, textTransform: 'uppercase' }}>Total Value ({valuationMethod})</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-primary)' }}>{fmt.currency(totalValue)}</div>
          </div>
        </div>
      </div>

      {/* Valuation Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>SKU</th>
                <th style={{ width: '28%' }}>PRODUCT</th>
                <th style={{ width: '12%', textAlign: 'center' }}>CATEGORY</th>
                <th style={{ width: '10%', textAlign: 'center' }}>QUANTITY</th>
                <th style={{ width: '14%', textAlign: 'right' }}>UNIT COST</th>
                <th style={{ width: '14%' }}>WAREHOUSE</th>
                <th style={{ width: '10%', textAlign: 'right' }}>VALUATION</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr key={item.id}>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text3)', fontWeight: 600 }}>{item.sku}</td>
                  <td style={{ fontWeight: 600 }}>{item.product}</td>
                  <td style={{ fontSize: 12, color: 'var(--c-text2)', textAlign: 'center' }}>{item.category}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', color: 'var(--c-text2)' }}>{fmt.currency(item.unitCost)}</td>
                  <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>{item.warehouse}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>{fmt.currency(item[methodKey])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warehouse Summary - 3 Equal Columns */}
      {selectedWarehouse === 'all' && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', color: 'var(--c-text3)' }}>Warehouse Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {warehouses.map(warehouse => {
              const warehouseValue = data.filter(d => d.warehouse === warehouse).reduce((sum, item) => sum + item[methodKey], 0)
              return (
                <div key={warehouse} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Warehouse size={18} style={{ color: 'var(--c-info)' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{warehouse}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-primary)' }}>{fmt.currency(warehouseValue)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
