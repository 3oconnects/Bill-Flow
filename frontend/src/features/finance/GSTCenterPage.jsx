import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { Search, Plus, Eye, Edit2, AlertCircle, CheckCircle, FileText, DollarSign } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { fmt } from '@/lib/utils'

const FILING_STATUS = {
  filed: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Filed' },
  pending: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Pending' },
  overdue: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Overdue' },
}

const MOCK_GST_FILINGS = [
  { id: 1, period: 'May 2024', dueDate: '2024-06-20', filedDate: '2024-06-18', status: 'filed', gstCollected: 125000, gstPaid: 85000, netGST: 40000 },
  { id: 2, period: 'April 2024', dueDate: '2024-05-20', filedDate: '2024-05-19', status: 'filed', gstCollected: 118000, gstPaid: 78000, netGST: 40000 },
  { id: 3, period: 'March 2024', dueDate: '2024-04-20', filedDate: '2024-04-15', status: 'filed', gstCollected: 142000, gstPaid: 95000, netGST: 47000 },
  { id: 4, period: 'February 2024', dueDate: '2024-03-20', filedDate: '2024-03-18', status: 'filed', gstCollected: 105000, gstPaid: 72000, netGST: 33000 },
  { id: 5, period: 'January 2024', dueDate: '2024-02-20', filedDate: null, status: 'pending', gstCollected: 128000, gstPaid: 88000, netGST: 40000 },
]

const GST_RATES = [
  { ratePercent: 5, category: 'Essentials', transactions: 24 },
  { ratePercent: 12, category: 'Regular Goods', transactions: 18 },
  { ratePercent: 18, category: 'Standard Items', transactions: 32 },
  { ratePercent: 28, category: 'Luxury Items', transactions: 8 },
]

export default function GSTCenterPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [filings, setFilings] = useState(MOCK_GST_FILINGS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    setContext('Finance', 'GST Center')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('File GST Return - connect to filing form')}>
        <Plus size={15} /> File Return
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredFilings = filings.filter(filing => {
    const matchesSearch = filing.period.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || filing.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const totalGSTCollected = filings.reduce((sum, f) => sum + f.gstCollected, 0)
  const totalGSTPaid = filings.reduce((sum, f) => sum + f.gstPaid, 0)
  const netGST = totalGSTCollected - totalGSTPaid
  const filedCount = filings.filter(f => f.status === 'filed').length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>GST Center</h1>
          <p>Manage GST filings, track tax collected and paid, monitor filing deadlines.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>GST Collected</span>
            <DollarSign size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-success)' }}>
            {fmt.currency(totalGSTCollected)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>outbound GST</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>GST Paid</span>
            <DollarSign size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-warning)' }}>
            {fmt.currency(totalGSTPaid)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>inbound GST</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Net GST</span>
            <DollarSign size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-primary)' }}>
            {fmt.currency(netGST)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>payable/receivable</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Returns Filed</span>
            <CheckCircle size={18} style={{ color: 'var(--c-info)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-info)' }}>
            {filedCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>out of {filings.length}</div>
        </div>
      </div>

      {/* GST Rates Breakdown */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>GST Rates Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {GST_RATES.map((rate, idx) => (
            <div key={idx} style={{ padding: 12, background: 'var(--c-surface2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-primary)', marginBottom: 4 }}>
                {rate.ratePercent}% - {rate.category}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>
                {rate.transactions} txn
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 340 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by period..."
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
          <option value="filed">Filed</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* GST Filings Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredFilings.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<FileText size={48} />}
              title="No GST filings found"
              description={searchTerm || selectedStatus !== 'all'
                ? "Try adjusting your filters or search terms."
                : "No GST returns on record."}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>PERIOD</th>
                  <th style={{ textAlign: 'right' }}>GST COLLECTED</th>
                  <th style={{ textAlign: 'right' }}>GST PAID</th>
                  <th style={{ textAlign: 'right' }}>NET GST</th>
                  <th style={{ textAlign: 'center' }}>DUE DATE</th>
                  <th style={{ textAlign: 'center' }}>FILED DATE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ width: 100, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredFilings.map(filing => {
                  const Status = FILING_STATUS[filing.status]
                  const daysOverdue = filing.status === 'overdue' ? Math.floor((Date.now() - new Date(filing.dueDate)) / (1000 * 60 * 60 * 24)) : 0
                  return (
                    <tr key={filing.id}>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{filing.period}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-success)' }}>
                        {fmt.currency(filing.gstCollected)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-warning)' }}>
                        {fmt.currency(filing.gstPaid)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>
                        {fmt.currency(filing.netGST)}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                        {new Date(filing.dueDate).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                        {filing.filedDate ? new Date(filing.filedDate).toLocaleDateString() : '—'}
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
                          {daysOverdue > 0 && ` (${daysOverdue}d)`}
                        </span>
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
                            onClick={() => alert('View GST filing details: ' + filing.period)}
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
                          {filing.status === 'pending' && (
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
                              onClick={() => alert('Edit GST return: ' + filing.period)}
                              title="Edit return"
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

      {/* Filing Instructions */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--c-text3)' }}>Filing Instructions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>📋 GSTR-1:</strong> File outbound sales GST return by the 11th of following month. Mandatory for all registered dealers.
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>📊 GSTR-3B:</strong> Monthly return summary due by 20th of following month. Includes both inbound and outbound taxes.
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>💰 GSTR-4:</strong> Quarterly return for composition dealers due within specified dates. Check your registration type.
          </div>
        </div>
      </div>
    </div>
  )
}
