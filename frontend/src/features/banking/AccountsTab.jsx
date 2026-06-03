import { Wallet } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { AccountCard, METHOD_META } from './BankingShared'

export default function AccountsTab({ accountsByMethod, filtered, totalIn, totalOut, netFlow }) {
  if (accountsByMethod.length === 0) {
    return (
      <div className="empty-state">
        <Wallet className="empty-state-icon" />
        <h3>No account activity</h3>
        <p>Record payments and receipts to see your account breakdown here.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {accountsByMethod.map(acc => {
          const meta = METHOD_META[acc.method] || METHOD_META.bank_transfer
          return (
            <AccountCard
              key={acc.method}
              method={meta.label}
              totalIn={acc.in}
              totalOut={acc.out}
              txnCount={acc.count}
              color={meta.color}
              Icon={meta.icon}
            />
          )
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Account Summary</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Payment Channel</th>
                <th style={{ textAlign: 'right' }}>Transactions</th>
                <th style={{ textAlign: 'right' }}>Total Received</th>
                <th style={{ textAlign: 'right' }}>Total Paid</th>
                <th style={{ textAlign: 'right' }}>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {accountsByMethod.map(acc => {
                const meta = METHOD_META[acc.method] || METHOD_META.bank_transfer
                const net = acc.in - acc.out
                return (
                  <tr key={acc.method}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }} />
                        <span style={{ fontWeight: 600 }}>{meta.label}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--c-text2)' }}>{acc.count}</td>
                    <td style={{ textAlign: 'right', color: '#0a8754', fontWeight: 600, fontFamily: 'monospace' }}>
                      {fmt.currency(acc.in)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#d63d3d', fontWeight: 600, fontFamily: 'monospace' }}>
                      {fmt.currency(acc.out)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: net >= 0 ? '#0a8754' : '#d63d3d' }}>
                      {fmt.currency(net)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--c-border)', background: 'var(--c-surface2)', fontWeight: 800 }}>
                <td style={{ padding: '10px 14px' }}>Total</td>
                <td style={{ textAlign: 'right', padding: '10px 14px' }}>{filtered.length}</td>
                <td style={{ textAlign: 'right', padding: '10px 14px', color: '#0a8754', fontFamily: 'monospace' }}>{fmt.currency(totalIn)}</td>
                <td style={{ textAlign: 'right', padding: '10px 14px', color: '#d63d3d', fontFamily: 'monospace' }}>{fmt.currency(totalOut)}</td>
                <td style={{ textAlign: 'right', padding: '10px 14px', color: netFlow >= 0 ? '#0a8754' : '#d63d3d', fontFamily: 'monospace' }}>{fmt.currency(netFlow)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
