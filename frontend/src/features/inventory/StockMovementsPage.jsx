import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { Search, ArrowRightLeft, ArrowUp, ArrowDown, ArrowRight, Calendar } from 'lucide-react'
import { fmt } from '@/lib/utils'

const MOVEMENT_TYPES = {
  stockIn: { icon: ArrowDown, color: 'var(--c-success)', label: 'Stock In', bg: 'var(--c-success-lt)' },
  stockOut: { icon: ArrowUp, color: 'var(--c-error)', label: 'Stock Out', bg: 'var(--c-error-lt)' },
  transfer: { icon: ArrowRight, color: 'var(--c-info)', label: 'Transfer', bg: 'var(--c-info-lt)' },
  adjustment: { icon: ArrowRightLeft, color: 'var(--c-warning)', label: 'Adjustment', bg: 'var(--c-warning-lt)' },
}

// Mock data - replace with API
const MOCK_MOVEMENTS = [
  {
    id: 1,
    date: '2024-05-28',
    type: 'stockIn',
    sku: 'PROD-001',
    product: 'Laptop - Dell XPS 13',
    quantity: 10,
    fromLocation: null,
    toLocation: 'Main Warehouse',
    reference: 'PO-2024-001',
    remarks: 'Purchase order from vendor',
  },
  {
    id: 2,
    date: '2024-05-27',
    type: 'stockOut',
    sku: 'PROD-002',
    product: 'Mouse - Wireless',
    quantity: 5,
    fromLocation: 'Main Warehouse',
    toLocation: null,
    reference: 'INV-2024-045',
    remarks: 'Sold to customer',
  },
  {
    id: 3,
    date: '2024-05-26',
    type: 'transfer',
    sku: 'PROD-004',
    product: 'Monitor - 27" 4K',
    quantity: 3,
    fromLocation: 'Main Warehouse',
    toLocation: 'Branch Office',
    reference: 'TRF-2024-012',
    remarks: 'Stock transfer for branch expansion',
  },
  {
    id: 4,
    date: '2024-05-25',
    type: 'adjustment',
    sku: 'PROD-005',
    product: 'USB Cable - Type C',
    quantity: 25,
    fromLocation: 'Branch Office',
    toLocation: 'Branch Office',
    reference: 'ADJ-2024-008',
    remarks: 'Inventory count adjustment - physical verification',
  },
  {
    id: 5,
    date: '2024-05-24',
    type: 'stockIn',
    sku: 'PROD-006',
    product: 'HDMI Cable',
    quantity: 50,
    fromLocation: null,
    toLocation: 'Distribution Center',
    reference: 'PO-2024-002',
    remarks: 'Purchase order from vendor',
  },
  {
    id: 6,
    date: '2024-05-23',
    type: 'stockOut',
    sku: 'PROD-007',
    product: 'Desk Lamp - LED',
    quantity: 8,
    fromLocation: 'Distribution Center',
    toLocation: null,
    reference: 'INV-2024-046',
    remarks: 'Sold to customer',
  },
  {
    id: 7,
    date: '2024-05-22',
    type: 'transfer',
    sku: 'PROD-001',
    product: 'Laptop - Dell XPS 13',
    quantity: 5,
    fromLocation: 'Branch Office',
    toLocation: 'Main Warehouse',
    reference: 'TRF-2024-013',
    remarks: 'Stock consolidation',
  },
  {
    id: 8,
    date: '2024-05-21',
    type: 'adjustment',
    sku: 'PROD-003',
    product: 'Keyboard - Mechanical',
    quantity: -3,
    fromLocation: 'Main Warehouse',
    toLocation: 'Main Warehouse',
    reference: 'ADJ-2024-009',
    remarks: 'Damage adjustment - items found damaged',
  },
]

export default function StockMovementsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [movements, setMovements] = useState(MOCK_MOVEMENTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  useEffect(() => {
    setContext('Inventory', 'Stock Movements')
    setActions(null)
    return clear
  }, [setActions, setContext, clear])

  const filteredMovements = movements.filter(item => {
    const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.reference.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || item.type === selectedType
    return matchesSearch && matchesType
  })

  const getTotalInbound = () => {
    return filteredMovements
      .filter(m => m.type === 'stockIn')
      .reduce((sum, m) => sum + m.quantity, 0)
  }

  const getTotalOutbound = () => {
    return filteredMovements
      .filter(m => m.type === 'stockOut')
      .reduce((sum, m) => sum + m.quantity, 0)
  }

  const getTotalTransfers = () => {
    return filteredMovements
      .filter(m => m.type === 'transfer')
      .reduce((sum, m) => sum + m.quantity, 0)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Stock Movements</h1>
          <p>Complete audit trail of all stock in, stock out and transfer events.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ArrowDown size={16} style={{ color: 'var(--c-success)' }} />
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Stock In</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-success)' }}>
            {getTotalInbound()} items
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ArrowUp size={16} style={{ color: 'var(--c-error)' }} />
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Stock Out</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-error)' }}>
            {getTotalOutbound()} items
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ArrowRight size={16} style={{ color: 'var(--c-info)' }} />
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Transfers</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-info)' }}>
            {getTotalTransfers()} items
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Calendar size={16} style={{ color: 'var(--c-text3)' }} />
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Total Events</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {filteredMovements.length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 320 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by product, SKU or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            className="form-select"
            style={{ width: 150 }}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="stockIn">Stock In</option>
            <option value="stockOut">Stock Out</option>
            <option value="transfer">Transfers</option>
            <option value="adjustment">Adjustments</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredMovements.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<ArrowRightLeft size={48} />}
              title="No stock movements found"
              description={searchTerm || selectedType !== 'all'
                ? "Try adjusting your filters or search terms."
                : "No movement records available."}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>TYPE</th>
                  <th>SKU</th>
                  <th>PRODUCT</th>
                  <th style={{ textAlign: 'center' }}>QUANTITY</th>
                  <th>FROM LOCATION</th>
                  <th>TO LOCATION</th>
                  <th>REFERENCE</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(item => {
                  const Type = MOVEMENT_TYPES[item.type]
                  return (
                    <tr key={item.id}>
                      <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Type.icon size={14} style={{ color: Type.color }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: Type.color }}>
                            {Type.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text3)' }}>
                        {item.sku}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{item.product}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.quantity < 0 ? 'var(--c-error)' : 'var(--c-success)' }}>
                        {item.quantity > 0 ? '+' : ''}{item.quantity}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                        {item.fromLocation || '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                        {item.toLocation || '—'}
                      </td>
                      <td style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-primary)' }}>
                        {item.reference}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                        {item.remarks}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {Object.entries(MOVEMENT_TYPES).map(([key, Type]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: Type.color }} />
            <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{Type.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
