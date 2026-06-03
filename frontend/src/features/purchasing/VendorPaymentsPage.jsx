import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { EmptyState } from '@/components/ui'
import { Banknote, Plus, Search, Edit2, Trash2, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { fmt } from '@/lib/utils'

const PAYMENT_METHODS = {
  bank: 'Bank Transfer',
  cheque: 'Cheque',
  upi: 'UPI / Digital',
  credit: 'Credit Card',
  cash: 'Cash',
  other: 'Other',
}

const STATUS_BADGES = {
  pending: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Pending' },
  completed: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Completed' },
  cancelled: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Cancelled' },
}

const MOCK_PAYMENTS = [
  {
    id: 1,
    vendor: 'Acme Corp',
    amount: 25000,
    paymentMethod: 'bank',
    paymentDate: '2024-05-15',
    referenceNumber: 'NEFT-001',
    status: 'completed',
  },
  {
    id: 2,
    vendor: 'Tech Supplies Ltd',
    amount: 15500,
    paymentMethod: 'cheque',
    paymentDate: '2024-05-18',
    referenceNumber: 'CHQ-2854',
    status: 'completed',
  },
  {
    id: 3,
    vendor: 'Office Essentials',
    amount: 8750,
    paymentMethod: 'upi',
    paymentDate: '2024-05-20',
    referenceNumber: 'UPI-5647',
    status: 'pending',
  },
  {
    id: 4,
    vendor: 'Manufacturing Parts Co',
    amount: 42300,
    paymentMethod: 'bank',
    paymentDate: '2024-05-22',
    referenceNumber: 'NEFT-002',
    status: 'pending',
  },
  {
    id: 5,
    vendor: 'Global Logistics',
    amount: 5200,
    paymentMethod: 'credit',
    paymentDate: '2024-05-25',
    referenceNumber: 'CC-9876',
    status: 'completed',
  },
]

export default function VendorPaymentsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [payments, setPayments] = useState(MOCK_PAYMENTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    setContext('Purchasing', 'Vendor Payments')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('Record Payment - connect to payment form')}>
        <Plus size={15} /> Record Payment
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const pendingCount = payments.filter(p => p.status === 'pending').length

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      setPayments(payments.filter(p => p.id !== id))
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Vendor Payments</h1>
          <p>Track and manage all payments made to your vendors and suppliers.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Paid</span>
            <DollarSign size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-success)' }}>
            {fmt.currency(totalPaid)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>completed payments</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Pending Payment</span>
            <AlertCircle size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-warning)' }}>
            {fmt.currency(totalPending)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>{pendingCount} payments due</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Amount</span>
            <TrendingUp size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-primary)' }}>
            {fmt.currency(totalAmount)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>all payments</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 340 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by vendor or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <select
          className="form-select"
          style={{ width: 160 }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredPayments.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<Banknote size={48} />}
              title="No payments recorded"
              description={searchTerm || filterStatus !== 'all'
                ? "Try adjusting your filters or search terms."
                : "Record vendor payments to track your supplier transactions."}
              action={
                <button className="btn btn-primary" onClick={() => alert('Record Payment - connect to payment form')}>
                  <Plus size={15} /> Record First Payment
                </button>
              }
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>VENDOR</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT</th>
                  <th style={{ textAlign: 'center' }}>METHOD</th>
                  <th style={{ textAlign: 'center' }}>DATE</th>
                  <th>REFERENCE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ width: 130, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(payment => (
                  <tr key={payment.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{payment.vendor}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>
                      {fmt.currency(payment.amount)}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                      {PAYMENT_METHODS[payment.paymentMethod]}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--c-text3)', fontFamily: 'monospace', fontWeight: 600 }}>
                      {payment.referenceNumber}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: STATUS_BADGES[payment.status]?.bg,
                          color: STATUS_BADGES[payment.status]?.color,
                        }}
                      >
                        {STATUS_BADGES[payment.status]?.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', paddingLeft: 8, paddingRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button
                          style={{
                            padding: '6px 8px',
                            background: 'var(--c-warning-lt)',
                            color: 'var(--c-warning)',
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
                          onClick={() => alert('Edit payment: ' + payment.referenceNumber)}
                          title="Edit payment"
                          onMouseOver={(e) => {
                            e.target.style.background = 'var(--c-warning)'
                            e.target.style.color = 'white'
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'var(--c-warning-lt)'
                            e.target.style.color = 'var(--c-warning)'
                          }}
                        >
                          <Edit2 size={14} />
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
                          onClick={() => handleDelete(payment.id)}
                          title="Delete payment"
                          onMouseOver={(e) => {
                            e.target.style.background = 'var(--c-error)'
                            e.target.style.color = 'white'
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'var(--c-error-lt)'
                            e.target.style.color = 'var(--c-error)'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Methods Legend */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--c-text3)' }}>Payment Methods</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--c-info)' }} />
              <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                <strong>{label}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
