import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { DollarSign, Clock, CheckCircle, AlertTriangle, Search, FileText, Zap, Eye, Check, X } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { fmt } from '@/lib/utils'

const PAYMENT_STATUS = {
  pending_approval: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Pending Approval' },
  approved: { bg: 'var(--c-info-lt)', color: 'var(--c-info)', label: 'Approved' },
  scheduled: { bg: 'var(--c-primary-lt)', color: 'var(--c-primary)', label: 'Scheduled' },
  processing: { bg: 'var(--c-info-lt)', color: 'var(--c-info)', label: 'Processing' },
  completed: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Completed' },
  rejected: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Rejected' },
}

const MOCK_PAYMENTS = [
  { id: 1, vendor: 'Acme Corp', amount: 145000, paymentDate: '2024-06-10', status: 'pending_approval', daysUntilPayment: 7, approvedBy: null },
  { id: 2, vendor: 'Tech Supplies Ltd', amount: 82500, paymentDate: '2024-06-08', status: 'approved', daysUntilPayment: 5, approvedBy: 'Rajesh K.' },
  { id: 3, vendor: 'Global Industries', amount: 225000, paymentDate: '2024-06-05', status: 'scheduled', daysUntilPayment: 2, approvedBy: 'Priya S.' },
  { id: 4, vendor: 'Manufacturing Parts Co', amount: 95300, paymentDate: '2024-06-03', status: 'processing', daysUntilPayment: 0, approvedBy: 'Rajesh K.' },
  { id: 5, vendor: 'Office Essentials', amount: 42750, paymentDate: '2024-05-28', status: 'completed', daysUntilPayment: -5, approvedBy: 'Priya S.' },
]

export default function BankingVendorPaymentsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [payments, setPayments] = useState(MOCK_PAYMENTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    setContext('Banking', 'Vendor Payments')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('Bulk Payment Schedule - connect to payment workflow')}>
        <Zap size={15} /> Schedule Payments
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredPayments = payments.filter(item => {
    const matchesSearch = item.vendor.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const pendingApproval = payments.filter(p => p.status === 'pending_approval').length
  const scheduledTotal = payments.filter(p => p.status === 'scheduled').reduce((sum, p) => sum + p.amount, 0)
  const totalPending = payments.filter(p => ['pending_approval', 'approved', 'scheduled', 'processing'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0)
  const completedTotal = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)

  const handleApprove = (id) => {
    setPayments(payments.map(p => p.id === id ? { ...p, status: 'approved', approvedBy: 'You' } : p))
  }

  const handleReject = (id) => {
    if (confirm('Reject this payment request?')) {
      setPayments(payments.map(p => p.id === id ? { ...p, status: 'rejected' } : p))
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Vendor Payments</h1>
          <p>Schedule, approve and process bulk payments to vendors.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Pending Approval</span>
            <AlertTriangle size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-warning)' }}>
            {pendingApproval}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>awaiting approval</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Scheduled Amount</span>
            <Clock size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-primary)' }}>
            {fmt.currency(scheduledTotal)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>ready to process</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Pending</span>
            <DollarSign size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-warning)' }}>
            {fmt.currency(totalPending)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>in pipeline</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Completed</span>
            <CheckCircle size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-success)' }}>
            {fmt.currency(completedTotal)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>processed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 340 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by vendor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <select
          className="form-select"
          style={{ width: 180 }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredPayments.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<FileText size={48} />}
              title="No payments found"
              description={searchTerm || selectedStatus !== 'all'
                ? "Try adjusting your filters or search terms."
                : "All vendor payments are processed."}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>VENDOR</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT</th>
                  <th style={{ textAlign: 'center' }}>PAYMENT DATE</th>
                  <th style={{ textAlign: 'center' }}>DAYS UNTIL</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>APPROVED BY</th>
                  <th style={{ width: 140, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(item => {
                  const Status = PAYMENT_STATUS[item.status]
                  const daysColor = item.daysUntilPayment < 0 ? 'var(--c-text3)' : item.daysUntilPayment === 0 ? 'var(--c-error)' : 'var(--c-text)'
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{item.vendor}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>
                        {fmt.currency(item.amount)}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                        {new Date(item.paymentDate).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: daysColor, fontSize: 13 }}>
                        {item.daysUntilPayment < 0
                          ? `${Math.abs(item.daysUntilPayment)}d ago`
                          : item.daysUntilPayment === 0
                            ? 'Today'
                            : `${item.daysUntilPayment}d`}
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
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                        {item.approvedBy || '—'}
                      </td>
                      <td style={{ textAlign: 'center', paddingLeft: 8, paddingRight: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {item.status === 'pending_approval' && (
                            <>
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
                                onClick={() => handleApprove(item.id)}
                                title="Approve payment"
                                onMouseOver={(e) => {
                                  e.target.style.background = 'var(--c-success)'
                                  e.target.style.color = 'white'
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.background = 'var(--c-success-lt)'
                                  e.target.style.color = 'var(--c-success)'
                                }}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                style={{
                                  padding: '6px 8px',
                                  background: 'var(--c-error-lt)',
                                  color: 'var(--c-error)',
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
                                onClick={() => handleReject(item.id)}
                                title="Reject payment"
                                onMouseOver={(e) => {
                                  e.target.style.background = 'var(--c-error)'
                                  e.target.style.color = 'white'
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.background = 'var(--c-error-lt)'
                                  e.target.style.color = 'var(--c-error)'
                                }}
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                          {item.status !== 'pending_approval' && (
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
                              onClick={() => alert('View payment details: ' + item.vendor)}
                              title="View details"
                              onMouseOver={(e) => {
                                e.target.style.background = 'var(--c-info)'
                                e.target.style.color = 'white'
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'var(--c-info-lt)'
                                e.target.style.color = 'var(--c-info)'
                              }}
                            >
                              <Eye size={14} />
                            </button>
                          )}
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

      {/* Payment Status Legend */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--c-text3)' }}>Payment Status Workflow</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {Object.entries(PAYMENT_STATUS).map(([key, status]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: status.color }} />
              <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                <strong>{status.label}:</strong> {
                  key === 'pending_approval' ? 'Awaiting approval' :
                  key === 'approved' ? 'Approved, awaiting schedule' :
                  key === 'scheduled' ? 'Scheduled for processing' :
                  key === 'processing' ? 'Payment in progress' :
                  key === 'completed' ? 'Payment completed' :
                  'Payment rejected'
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
