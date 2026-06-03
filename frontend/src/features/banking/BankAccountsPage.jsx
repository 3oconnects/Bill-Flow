import { useEffect, useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { Wallet, Plus, Edit2, Trash2, Eye, DollarSign, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { fmt } from '@/lib/utils'

const ACCOUNT_STATUS = {
  active: { bg: 'var(--c-success-lt)', color: 'var(--c-success)', label: 'Active' },
  inactive: { bg: 'var(--c-warning-lt)', color: 'var(--c-warning)', label: 'Inactive' },
  blocked: { bg: 'var(--c-error-lt)', color: 'var(--c-error)', label: 'Blocked' },
}

const MOCK_ACCOUNTS = [
  { id: 1, bankName: 'State Bank of India', accountType: 'Current', accountNumber: '****5678', ifscCode: 'SBIN0001234', balance: 450000, status: 'active', lastUpdated: '2024-06-03', monthlyTransactions: 34 },
  { id: 2, bankName: 'HDFC Bank', accountType: 'Savings', accountNumber: '****9012', ifscCode: 'HDFC0001456', balance: 280000, status: 'active', lastUpdated: '2024-06-02', monthlyTransactions: 12 },
  { id: 3, bankName: 'ICICI Bank', accountType: 'Current', accountNumber: '****3456', ifscCode: 'ICIC0001678', balance: 520000, status: 'active', lastUpdated: '2024-06-01', monthlyTransactions: 28 },
  { id: 4, bankName: 'Axis Bank', accountType: 'Savings', accountNumber: '****7890', ifscCode: 'UTIB0001234', balance: 125000, status: 'inactive', lastUpdated: '2024-05-20', monthlyTransactions: 0 },
]

export default function BankAccountsPage() {
  const { setActions, setContext, clear } = useTopbarStore()
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    setContext('Banking', 'Bank Accounts')
    setActions(
      <button className="btn btn-primary" onClick={() => alert('Add Account - connect to bank linking flow')}>
        <Plus size={15} /> Add Account
      </button>
    )
    return clear
  }, [setActions, setContext, clear])

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         acc.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || acc.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalTransactions = accounts.reduce((sum, acc) => sum + acc.monthlyTransactions, 0)
  const activeAccounts = accounts.filter(a => a.status === 'active').length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Bank Accounts</h1>
          <p>Manage your SBI, HDFC, ICICI and other bank accounts in one place.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Balance</span>
            <DollarSign size={18} style={{ color: 'var(--c-primary)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-primary)' }}>
            {fmt.currency(totalBalance)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>across all accounts</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Accounts</span>
            <Wallet size={18} style={{ color: 'var(--c-success)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{activeAccounts}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>out of {accounts.length} total</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--c-text3)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Transactions</span>
            <TrendingUp size={18} style={{ color: 'var(--c-info)' }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{totalTransactions}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>this month</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-wrap" style={{ width: 320 }}>
          <input
            className="form-input"
            placeholder="Search by bank name or account number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <select
          className="form-select"
          style={{ width: 140 }}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Accounts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredAccounts.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <EmptyState
              icon={<Wallet size={48} />}
              title="No bank accounts found"
              description={searchTerm || selectedStatus !== 'all'
                ? "Try adjusting your filters or search terms."
                : "Add your first bank account to get started."}
              action={
                <button className="btn btn-primary" onClick={() => alert('Add Account')}>
                  <Plus size={15} /> Add First Account
                </button>
              }
            />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>BANK NAME</th>
                  <th style={{ textAlign: 'center' }}>ACCOUNT TYPE</th>
                  <th>ACCOUNT NUMBER</th>
                  <th style={{ textAlign: 'right' }}>BALANCE</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                  <th style={{ textAlign: 'center' }}>MONTHLY TXN</th>
                  <th style={{ textAlign: 'center' }}>LAST UPDATED</th>
                  <th style={{ width: 130, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(account => {
                  const Status = ACCOUNT_STATUS[account.status]
                  return (
                    <tr key={account.id}>
                      <td style={{ fontWeight: 700 }}>{account.bankName}</td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>{account.accountType}</td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--c-text3)', fontWeight: 600 }}>
                        {account.accountNumber}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--c-primary)' }}>
                        {fmt.currency(account.balance)}
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
                        {account.monthlyTransactions}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--c-text2)' }}>
                        {new Date(account.lastUpdated).toLocaleDateString()}
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
                            onClick={() => alert('View account details for: ' + account.bankName)}
                            title="View details"
                            onMouseOver={(e) => e.target.style.background = 'var(--c-info)'}
                            onMouseOut={(e) => e.target.style.background = 'var(--c-info-lt)'}
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
                            onClick={() => alert('Edit account: ' + account.bankName)}
                            title="Edit account"
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
                            onClick={() => {
                              if (confirm('Delete this account?')) {
                                setAccounts(accounts.filter(a => a.id !== account.id))
                              }
                            }}
                            title="Delete account"
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Type Legend */}
      <div style={{ marginTop: 20, padding: 16, background: 'var(--c-surface2)', borderRadius: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--c-success)' }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Savings Account: Personal funds & interest</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--c-primary)' }} />
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>Current Account: Business transactions</span>
        </div>
      </div>
    </div>
  )
}
