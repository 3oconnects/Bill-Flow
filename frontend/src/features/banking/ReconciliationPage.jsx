import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { GitMerge, CheckCircle, AlertCircle, HelpCircle, Search, Zap, Eye, Link2, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { fmt } from '@/lib/utils'

const MATCH_STATUS = {
  matched: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Matched' },
  unmatched: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Unmatched' },
  pending_review: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Pending Review' },
}

const MOCK_TRANSACTIONS = [
  { id: 1, date: '2024-06-03', description: 'NEFT-INV-2024-001', amount: 45000, type: 'credit', status: 'matched', confidence: 98, matchedWith: 'Invoice INV-2024-001', accountId: 'sbi' },
  { id: 2, date: '2024-06-02', description: 'PAYMENT-VENDOR-001', amount: -28500, type: 'debit', status: 'matched', confidence: 95, matchedWith: 'Payment VENDOR-001', accountId: 'sbi' },
  { id: 3, date: '2024-06-01', description: 'TRANSFER-HDFC', amount: -50000, type: 'debit', status: 'unmatched', confidence: 0, matchedWith: null, accountId: 'sbi' },
  { id: 4, date: '2024-05-31', description: 'DEPOSIT-CUSTOMER-X', amount: 125000, type: 'credit', status: 'pending_review', confidence: 78, matchedWith: 'INV-2024-005?', accountId: 'sbi' },
  { id: 5, date: '2024-05-30', description: 'NEFT-INV-2024-008', amount: 72500, type: 'credit', status: 'matched', confidence: 99, matchedWith: 'Invoice INV-2024-008', accountId: 'sbi' },
  { id: 6, date: '2024-05-29', description: 'SERVICE-CHARGE', amount: -250, type: 'debit', status: 'matched', confidence: 100, matchedWith: 'Bank Charge', accountId: 'sbi' },
  { id: 7, date: '2024-05-28', description: 'INTER-BANK-TRANSFER', amount: -100000, type: 'debit', status: 'unmatched', confidence: 0, matchedWith: null, accountId: 'sbi' },
]

export default function ReconciliationPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('sbi')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    setContext('Banking', 'Reconciliation Center')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('Auto-Match Transactions - connect to matching engine')}>
        <Zap size={15} /> Auto-Match
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.amount.toString().includes(searchTerm)
    const matchesAccount = t.accountId === selectedAccount
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus
    return matchesSearch && matchesAccount && matchesStatus
  })

  const matched = transactions.filter(t => t.status === 'matched').length
  const unmatched = transactions.filter(t => t.status === 'unmatched').length
  const pendingReview = transactions.filter(t => t.status === 'pending_review').length
  const matchedAmount = transactions.filter(t => t.status === 'matched').reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const unmatchedAmount = transactions.filter(t => t.status === 'unmatched').reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const matchPercentage = transactions.length > 0 ? Math.round((matched / transactions.length) * 100) : 0

  const handleMatchTransaction = (id, suggestion) => {
    if (confirm(`Match with ${suggestion}?`)) {
      setTransactions(transactions.map(t => t.id === id ? { ...t, status: 'matched', matchedWith: suggestion, confidence: 85 } : t))
    }
  }

  const handleUnmatch = (id) => {
    if (confirm('Unmatch this transaction?')) {
      setTransactions(transactions.map(t => t.id === id ? { ...t, status: 'unmatched', matchedWith: null, confidence: 0 } : t))
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Reconciliation Center</h1>
          <p>Match bank transactions to invoices and payments with AI confidence scoring.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Reconciliation %</span>
            <CheckCircle size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--c-success)' }}>
            {matchPercentage}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>{matched} of {transactions.length} matched</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Unmatched</span>
            <AlertCircle size={18} style={{ color: 'var(--c-error)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-error)' }}>
            {unmatched}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>{fmt.currency(unmatchedAmount)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Pending Review</span>
            <HelpCircle size={18} style={{ color: 'var(--c-warning)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-warning)' }}>
            {pendingReview}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>awaiting confirmation</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Matched Amount</span>
            <GitMerge size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-primary)' }}>
            {fmt.currency(matchedAmount)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>reconciled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 340 }}>
          <Search className="search-icon" />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by description or amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <select
          className="form-select"
          style={{ width: 140 }}
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
        >
          <option value="sbi">SBI Current</option>
          <option value="hdfc">HDFC Savings</option>
          <option value="icici">ICICI Current</option>
        </select>
        <select
          className="form-select"
          style={{ width: 160 }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="matched">Matched</option>
          <option value="unmatched">Unmatched</option>
          <option value="pending_review">Pending Review</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<GitMerge size={48} />}
              title="No transactions found"
              description={searchTerm || selectedStatus !== 'all'
                ? "Try adjusting your filters or search terms."
                : "All transactions are reconciled."}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>DATE</th>
                  <th>DESCRIPTION</th>
                  <th style={{ textAlign: 'right' }}>AMOUNT</th>
                  <th style={{ textAlign: 'center' }}>TYPE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>CONFIDENCE</th>
                  <th>MATCHED WITH</th>
                  <th style={{ width: 130, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(txn => {
                  const Status = MATCH_STATUS[txn.status]
                  const confidenceColor = txn.confidence >= 90 ? 'var(--c-success)' : txn.confidence >= 75 ? 'var(--c-warning)' : 'var(--c-text3)'
                  return (
                    <tr key={txn.id}>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                        {new Date(txn.date).toLocaleDateString()}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{txn.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: txn.amount > 0 ? 'var(--c-success)' : 'var(--c-text)' }}>
                        {fmt.currency(txn.amount)}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase' }}>
                        {txn.type === 'credit' ? '↓ IN' : '↑ OUT'}
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
                      <td style={{ textAlign: 'center' }}>
                        {txn.confidence > 0 ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: confidenceColor }}>
                            {txn.confidence}%
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--c-text3)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                        {txn.matchedWith || '—'}
                      </td>
                      <td style={{ textAlign: 'center', paddingLeft: 8, paddingRight: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {txn.status === 'unmatched' ? (
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
                              onClick={() => handleMatchTransaction(txn.id, 'INV-2024-XXX')}
                              title="Match transaction"
                              onMouseOver={(e) => {
                                e.target.style.background = 'var(--c-primary)'
                                e.target.style.color = 'white'
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'var(--c-primary-lt)'
                                e.target.style.color = 'var(--c-primary)'
                              }}
                            >
                              <Link2 size={14} />
                            </button>
                          ) : (
                            <>
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
                                onClick={() => alert('View match details for: ' + txn.description)}
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
                                onClick={() => handleUnmatch(txn.id)}
                                title="Unmatch transaction"
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
                            </>
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

      {/* Reconciliation Tips */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', color: 'var(--c-text3)' }}>Reconciliation Tips</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>✓ 90%+ Confidence:</strong> Automatically matched with high certainty. Review periodically but typically safe to trust.
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>⚠ 75-89% Confidence:</strong> Likely match but review needed. AI suggests a match; confirm it's correct.
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--c-text)' }}>⚠ Unmatched:</strong> No match found. Manually match or investigate discrepancies.
          </div>
        </div>
      </div>
    </div>
  )
}
