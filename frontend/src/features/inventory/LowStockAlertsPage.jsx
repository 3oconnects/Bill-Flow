import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { AlertTriangle, AlertCircle, Search, ShoppingCart } from 'lucide-react'
import { fmt } from '@/lib/utils'

const ALERT_SEVERITY = {
  critical: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Critical', icon: AlertTriangle },
  warning: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Warning', icon: AlertCircle },
}

const MOCK_ALERTS = [
  { id: 1, sku: 'PROD-002', product: 'Mouse - Wireless', category: 'Accessories', currentQty: 3, reorderLevel: 20, warehouse: 'Main Warehouse', severity: 'critical', lastRestocked: '2024-04-15', daysBelow: 8 },
  { id: 2, sku: 'PROD-003', product: 'Keyboard - Mechanical', category: 'Accessories', currentQty: 0, reorderLevel: 15, warehouse: 'Main Warehouse', severity: 'critical', lastRestocked: '2024-03-20', daysBelow: 14 },
  { id: 3, sku: 'PROD-006', product: 'HDMI Cable', category: 'Accessories', currentQty: 8, reorderLevel: 25, warehouse: 'Distribution Center', severity: 'warning', lastRestocked: '2024-04-28', daysBelow: 3 },
  { id: 4, sku: 'PROD-008', product: 'Office Chair', category: 'Furniture', currentQty: 0, reorderLevel: 3, warehouse: 'Main Warehouse', severity: 'critical', lastRestocked: '2024-02-10', daysBelow: 83 },
  { id: 5, sku: 'PROD-009', product: 'Desk Organizer', category: 'Office', currentQty: 5, reorderLevel: 12, warehouse: 'Branch Office', severity: 'warning', lastRestocked: '2024-05-01', daysBelow: 2 },
]

export default function LowStockAlertsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')

  useEffect(() => {
    setContext('Inventory', 'Low Stock Alerts')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('Reorder workflow - connect to PO module')}>
        <ShoppingCart size={15} /> Create Purchase Order
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity
    const matchesWarehouse = selectedWarehouse === 'all' || alert.warehouse === selectedWarehouse
    return matchesSearch && matchesSeverity && matchesWarehouse
  })

  const warehouses = [...new Set(alerts.map(a => a.warehouse))]
  const criticalCount = filteredAlerts.filter(a => a.severity === 'critical').length
  const warningCount = filteredAlerts.filter(a => a.severity === 'warning').length
  const totalAffected = filteredAlerts.reduce((sum, a) => sum + a.currentQty, 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Low Stock Alerts</h1>
          <p>Monitor and manage inventory items below reorder levels.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} style={{ color: 'var(--c-error)' }} />
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Critical Alerts</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-error)' }}>
            {criticalCount}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertCircle size={16} style={{ color: 'var(--c-warning)' }} />
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Warning Alerts</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-warning)' }}>
            {warningCount}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShoppingCart size={16} style={{ color: 'var(--c-info)' }} />
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Total Items</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {totalAffected} units
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} style={{ color: 'var(--c-text3)' }} />
            <span style={{ color: 'var(--c-text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Total Alerts</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {filteredAlerts.length}
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
            placeholder="Search by product or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            className="form-select"
            style={{ width: 140 }}
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
          </select>
          <select
            className="form-select"
            style={{ width: 180 }}
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="all">All Warehouses</option>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredAlerts.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<AlertTriangle size={48} />}
              title="No low stock alerts"
              description={searchTerm || selectedSeverity !== 'all' || selectedWarehouse !== 'all'
                ? "Try adjusting your filters or search terms."
                : "All inventory items are at healthy stock levels."}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>SKU</th>
                  <th style={{ width: '22%' }}>PRODUCT</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>CATEGORY</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>CURRENT</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>REORDER LVL</th>
                  <th style={{ width: '14%' }}>WAREHOUSE</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>SEVERITY</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>DAYS BELOW</th>
                  <th style={{ width: '4%' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(alert => {
                  const Severity = ALERT_SEVERITY[alert.severity]
                  const SeverityIcon = Severity.icon
                  return (
                    <tr key={alert.id}>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text3)', fontWeight: 600 }}>
                        {alert.sku}
                      </td>
                      <td style={{ fontWeight: 600 }}>{alert.product}</td>
                      <td style={{ fontSize: 12, color: 'var(--c-text2)', textAlign: 'center' }}>{alert.category}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: alert.currentQty === 0 ? 'var(--c-error)' : 'var(--c-text)' }}>
                        {alert.currentQty}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--c-text3)', fontSize: 12 }}>{alert.reorderLevel}</td>
                      <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>{alert.warehouse}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <SeverityIcon size={14} style={{ color: Severity.color }} />
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: Severity.bg,
                              color: Severity.color,
                            }}
                          >
                            {Severity.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: alert.daysBelow > 7 ? 'var(--c-error)' : 'var(--c-text)' }}>
                        {alert.daysBelow}d
                      </td>
                      <td>
                        <button
                          className="action-icon-btn"
                          onClick={() => alert('Open PO creation for: ' + alert.product)}
                          title="Create PO"
                        >
                          <ShoppingCart size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Priority Notice */}
      {criticalCount > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: 'var(--c-error-lt)',
            border: `1px solid var(--c-error)`,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--c-error)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--c-error)', marginBottom: 4 }}>⚠️ Critical Stock Issues</div>
            <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: '1.5' }}>
              You have {criticalCount} product{criticalCount > 1 ? 's' : ''} at critically low stock levels. Consider creating purchase orders immediately to avoid stockouts.
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} style={{ color: 'var(--c-error)' }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Critical: At or below 50% of reorder level</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} style={{ color: 'var(--c-warning)' }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Warning: Between 50-100% of reorder level</span>
        </div>
      </div>
    </div>
  )
}
