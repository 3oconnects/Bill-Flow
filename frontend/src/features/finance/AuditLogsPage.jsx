import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { Search, ChevronDown, Eye, Trash2, Edit2, Plus, Activity } from 'lucide-react'
import { EmptyState } from '@/components/ui'

const ACTION_TYPES = {
  create: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Created' },
  update: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Updated' },
  delete: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Deleted' },
  view: { bg: 'var(--c-info-lt)', color: 'var(--c-info)', label: 'Viewed' },
  export: { bg: 'var(--c-primary-lt)', color: 'var(--c-primary)', label: 'Exported' },
}

const ENTITY_TYPES = {
  invoice: 'Invoice',
  customer: 'Customer',
  vendor: 'Vendor',
  product: 'Product',
  purchase: 'Purchase Order',
  payment: 'Payment',
  credit_note: 'Credit Note',
  bank_account: 'Bank Account',
  gst_return: 'GST Return',
  expense: 'Expense',
}

const MOCK_AUDIT_LOGS = [
  { id: 1, timestamp: '2024-06-03 14:32:18', user: 'Rajesh Kumar', email: 'rajesh@company.com', action: 'create', entityType: 'invoice', entityId: 'INV-2024-001', entityName: 'Invoice INV-2024-001', details: 'Created new invoice for Acme Corp, Amount: ₹50,000', ipAddress: '192.168.1.100' },
  { id: 2, timestamp: '2024-06-03 13:45:22', user: 'Priya Sharma', email: 'priya@company.com', action: 'update', entityType: 'customer', entityId: 'CUST-0042', entityName: 'Acme Corporation', details: 'Updated phone number from +91-1234567890 to +91-9876543210', ipAddress: '192.168.1.105' },
  { id: 3, timestamp: '2024-06-03 12:18:45', user: 'Admin User', email: 'admin@company.com', action: 'delete', entityType: 'gst_return', entityId: 'GSTR-MAY-2024', entityName: 'May 2024 GST Return', details: 'Deleted pending GST return (unsent)', ipAddress: '192.168.1.101' },
  { id: 4, timestamp: '2024-06-03 11:22:30', user: 'Vikram Singh', email: 'vikram@company.com', action: 'update', entityType: 'product', entityId: 'PROD-101', entityName: 'Laptop Pro 15', details: 'Updated price from ₹75,000 to ₹72,000, Updated tax category to GST-18%', ipAddress: '192.168.1.110' },
  { id: 5, timestamp: '2024-06-03 10:05:12', user: 'Rajesh Kumar', email: 'rajesh@company.com', action: 'view', entityType: 'invoice', entityId: 'INV-2024-001', entityName: 'Invoice INV-2024-001', details: 'Viewed invoice details page', ipAddress: '192.168.1.100' },
  { id: 6, timestamp: '2024-06-02 16:40:33', user: 'Priya Sharma', email: 'priya@company.com', action: 'create', entityType: 'payment', entityId: 'PAY-0158', entityName: 'Payment PAY-0158', details: 'Recorded customer payment via NEFT, Amount: ₹50,000', ipAddress: '192.168.1.105' },
  { id: 7, timestamp: '2024-06-02 15:12:18', user: 'Admin User', email: 'admin@company.com', action: 'export', entityType: 'invoice', entityId: 'BATCH-EXPORT', entityName: 'Batch Export (5 items)', details: 'Exported 5 invoices as PDF for email distribution', ipAddress: '192.168.1.101' },
  { id: 8, timestamp: '2024-06-02 14:30:45', user: 'Vikram Singh', email: 'vikram@company.com', action: 'update', entityType: 'vendor', entityId: 'VEND-012', entityName: 'Tech Supplies Inc', details: 'Updated GST registration number and payment terms', ipAddress: '192.168.1.110' },
  { id: 9, timestamp: '2024-06-02 13:15:22', user: 'Rajesh Kumar', email: 'rajesh@company.com', action: 'create', entityType: 'purchase', entityId: 'PO-2024-045', entityName: 'Purchase Order PO-2024-045', details: 'Created PO for office supplies, Amount: ₹12,500', ipAddress: '192.168.1.100' },
  { id: 10, timestamp: '2024-06-02 11:45:08', user: 'Priya Sharma', email: 'priya@company.com', action: 'update', entityType: 'bank_account', entityId: 'ACC-SBI-001', entityName: 'SBI Current Account', details: 'Updated account balance reconciliation status', ipAddress: '192.168.1.105' },
]

export default function AuditLogsPage() {
  const { setContext, clear } = useTopbarStore()
  const [logs, setLogs] = useState(MOCK_AUDIT_LOGS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    setContext('Finance', 'Audit Logs')
    return clear
  }, [setContext, clear])

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = selectedAction === 'all' || log.action === selectedAction
    return matchesSearch && matchesAction
  })

  const stats = {
    totalEvents: logs.length,
    uniqueUsers: new Set(logs.map(l => l.user)).size,
    creates: logs.filter(l => l.action === 'create').length,
    updates: logs.filter(l => l.action === 'update').length,
    deletes: logs.filter(l => l.action === 'delete').length,
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Audit Logs</h1>
          <p>Full change history of every create, update and delete in the system.</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Events</span>
            <Activity size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-primary)' }}>
            {stats.totalEvents}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>log entries</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Users</span>
            <Plus size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-success)' }}>
            {stats.uniqueUsers}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>unique users</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Changes</span>
            <Edit2 size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-warning)' }}>
            {stats.creates + stats.updates}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>{stats.creates} new, {stats.updates} edits</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Deletions</span>
            <Trash2 size={18} style={{ color: 'var(--c-error)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-error)' }}>
            {stats.deletes}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>records deleted</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 340 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by user, email, or entity name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <select
          className="form-select"
          style={{ width: 140 }}
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
        >
          <option value="all">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="view">Viewed</option>
          <option value="export">Exported</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<Activity size={48} />}
              title="No audit logs found"
              description={searchTerm || selectedAction !== 'all'
                ? "Try adjusting your filters or search terms."
                : "No activity recorded yet."}
            />
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', width: '15%' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', width: '20%' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', width: '12%' }}>Action</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', width: '45%' }}>Entity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', width: '8%' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const ActionType = ACTION_TYPES[log.action]
                  const isExpanded = expandedId === log.id
                  return (
                    <tbody key={log.id} style={{ display: 'contents' }}>
                      <tr style={{ borderBottom: '1px solid var(--c-border)', background: isExpanded ? 'var(--c-surface2)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--c-text2)', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                          {log.timestamp}
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)', marginBottom: 4 }}>{log.user}</div>
                          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{log.email}</div>
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '5px 12px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              background: ActionType.bg,
                              color: ActionType.color,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {ActionType.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)', marginBottom: 3 }}>{log.entityName}</div>
                          <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                            {ENTITY_TYPES[log.entityType]} ({log.entityId})
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            style={{
                              padding: '6px 10px',
                              background: 'var(--c-primary-lt)',
                              color: 'var(--c-primary)',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'var(--c-primary)'
                              e.currentTarget.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'var(--c-primary-lt)'
                              e.currentTarget.style.color = 'var(--c-primary)'
                            }}
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: 'var(--c-surface2)', borderBottom: '2px solid var(--c-border)' }}>
                          <td colSpan={5} style={{ padding: '20px 16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.5px' }}>Change Details</div>
                                <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: '1.7', background: 'var(--c-bg)', padding: 12, borderRadius: 6, borderLeft: '3px solid var(--c-primary)' }}>
                                  {log.details}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.5px' }}>IP Address & Request ID</div>
                                <div style={{ fontSize: 13, color: 'var(--c-text)', fontFamily: 'monospace', background: 'var(--c-bg)', padding: 12, borderRadius: 6, borderLeft: '3px solid var(--c-info)', wordBreak: 'break-all' }}>
                                  {log.ipAddress}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--c-text3)' }}>Log Retention</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>📋 Retention Policy:</strong> All audit logs are retained for 90 days. For longer retention, contact your administrator.
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>🔒 Security:</strong> Audit logs are immutable and encrypted. Only admins can view and export logs.
          </div>
        </div>
      </div>
    </div>
  )
}
