import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { UsersRound, AlertTriangle, DollarSign, Clock, Send, Eye, CheckCircle, TrendingDown, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { fmt } from '@/lib/utils'

const COLLECTION_STATUS = {
  pending: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Pending' },
  reminder_sent: { bg: 'var(--c-info-lt)', color: 'var(--c-info)', label: 'Reminder Sent' },
  follow_up: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Follow-up' },
  escalated: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Escalated' },
  collected: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Collected' },
}

const MOCK_OVERDUE = [
  { id: 1, invoiceNumber: 'INV-2024-001', customerName: 'Acme Corp', amount: 45000, dueDate: '2024-04-15', daysOverdue: 49, status: 'escalated', remindersSent: 2 },
  { id: 2, invoiceNumber: 'INV-2024-012', customerName: 'Tech Solutions Ltd', amount: 32500, dueDate: '2024-04-20', daysOverdue: 44, status: 'follow_up', remindersSent: 1 },
  { id: 3, invoiceNumber: 'INV-2024-025', customerName: 'Global Industries', amount: 78900, dueDate: '2024-04-25', daysOverdue: 39, status: 'reminder_sent', remindersSent: 1 },
  { id: 4, invoiceNumber: 'INV-2024-038', customerName: 'Smart Enterprises', amount: 25600, dueDate: '2024-05-01', daysOverdue: 33, status: 'pending', remindersSent: 0 },
  { id: 5, invoiceNumber: 'INV-2024-041', customerName: 'Future Systems', amount: 62300, dueDate: '2024-05-05', daysOverdue: 29, status: 'reminder_sent', remindersSent: 1 },
]

export default function CollectionsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [overdues, setOverdues] = useState(MOCK_OVERDUE)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    setContext('Banking', 'Collections Center')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('Send Bulk Reminders - connect to email integration')}>
        <Send size={15} /> Send Reminders
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredOverdues = overdues.filter(item => {
    const matchesSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const totalOverdueAmount = overdues.reduce((sum, item) => sum + item.amount, 0)
  const overdueCount = overdues.filter(o => o.status !== 'collected').length
  const escalatedCount = overdues.filter(o => o.status === 'escalated').length
  const avgDaysOverdue = overdues.length > 0
    ? Math.round(overdues.reduce((sum, o) => sum + o.daysOverdue, 0) / overdues.length)
    : 0

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Collections Center</h1>
          <p>Chase overdue invoices, send reminders and track collection status.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Overdue</span>
            <DollarSign size={18} style={{ color: 'var(--c-error)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-error)' }}>
            {fmt.currency(totalOverdueAmount)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>to be collected</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Overdue Invoices</span>
            <AlertTriangle size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{overdueCount}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>pending collection</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Escalated</span>
            <TrendingDown size={18} style={{ color: 'var(--c-error)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-error)' }}>{escalatedCount}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>require attention</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Avg Days Overdue</span>
            <Clock size={18} style={{ color: 'var(--c-info)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{avgDaysOverdue}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>days</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 340 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by invoice number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <select
          className="form-select"
          style={{ width: 160 }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="reminder_sent">Reminder Sent</option>
          <option value="follow_up">Follow-up</option>
          <option value="escalated">Escalated</option>
          <option value="collected">Collected</option>
        </select>
      </div>

      {/* Overdue Invoices Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredOverdues.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<UsersRound size={48} />}
              title="No overdue invoices found"
              description={searchTerm || selectedStatus !== 'all'
                ? "Try adjusting your filters or search terms."
                : "All invoices are paid. Great work!"}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>INVOICE NUMBER</th>
                  <th>CUSTOMER</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT</th>
                  <th style={{ textAlign: 'center' }}>DUE DATE</th>
                  <th style={{ textAlign: 'center' }}>DAYS OVERDUE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>REMINDERS</th>
                  <th style={{ width: 140, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredOverdues.map(item => {
                  const Status = COLLECTION_STATUS[item.status]
                  const overdueColor = item.daysOverdue > 45 ? 'var(--c-error)' : item.daysOverdue > 30 ? 'var(--c-warning)' : 'var(--c-text)'
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-primary)' }}>
                        {item.invoiceNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.customerName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-error)' }}>
                        {fmt.currency(item.amount)}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                        {new Date(item.dueDate).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: overdueColor }}>
                        {item.daysOverdue}d
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background: Status.bg,
                            color: Status.color,
                          }}
                        >
                          {Status.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 13 }}>
                        {item.remindersSent}
                      </td>
                      <td style={{ textAlign: 'center', paddingLeft: 8, paddingRight: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            style={{
                              padding: '6px 8px',
                              background: 'var(--c-info-lt)',
                              color: 'var(--c-info)',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            onClick={() => alert('Send reminder for: ' + item.invoiceNumber)}
                            title="Send reminder"
                            onMouseOver={(e) => {
                              e.target.style.background = 'var(--c-info)'
                              e.target.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'var(--c-info-lt)'
                              e.target.style.color = 'var(--c-info)'
                            }}
                          >
                            <Send size={14} />
                          </button>
                          <button
                            style={{
                              padding: '6px 8px',
                              background: 'var(--c-primary-lt)',
                              color: 'var(--c-primary)',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            onClick={() => alert('View details: ' + item.invoiceNumber)}
                            title="View invoice"
                            onMouseOver={(e) => {
                              e.target.style.background = 'var(--c-primary)'
                              e.target.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'var(--c-primary-lt)'
                              e.target.style.color = 'var(--c-primary)'
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            style={{
                              padding: '6px 8px',
                              background: 'var(--c-success-lt)',
                              color: 'var(--c-success)',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            onClick={() => {
                              if (confirm('Mark as collected?')) {
                                setOverdues(overdues.filter(o => o.id !== item.id))
                              }
                            }}
                            title="Mark as collected"
                            onMouseOver={(e) => {
                              e.target.style.background = 'var(--c-success)'
                              e.target.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'var(--c-success-lt)'
                              e.target.style.color = 'var(--c-success)'
                            }}
                          >
                            <CheckCircle size={14} />
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

      {/* Collection Status Legend */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--c-text3)' }}>Collection Status Legend</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {Object.entries(COLLECTION_STATUS).map(([key, status]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: status.color }} />
              <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                <strong>{status.label}:</strong> {
                  key === 'pending' ? 'First reminder not sent' :
                  key === 'reminder_sent' ? 'Initial reminder sent' :
                  key === 'follow_up' ? 'Follow-up action initiated' :
                  key === 'escalated' ? 'Needs immediate attention' :
                  'Payment received'
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
