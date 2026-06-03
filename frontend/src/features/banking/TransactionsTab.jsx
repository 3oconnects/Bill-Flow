import { Search, Download, Wallet, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { METHOD_META } from './BankingShared'

export default function TransactionsTab({ search, setSearch, typeFilter, setTypeFilter, withBalance, handleExport, totalIn, totalOut, netFlow }) {
  return (
    <div className="card">
      <div className="filter-bar" style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
        <div className="search-wrap" style={{ width: 280 }}>
          <Search className="search-icon" size={15} />
          <input className="form-input" style={{ paddingLeft: 34 }}
            placeholder="Search party, reference, method…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="pill-tabs">
          {[
            { id: 'all',     label: 'ALL' },
            { id: 'receipt', label: 'RECEIVED' },
            { id: 'payment', label: 'PAID' },
          ].map(t => (
            <button key={t.id}
              className={`pill-tab${typeFilter === t.id ? ' active' : ''}`}
              onClick={() => setTypeFilter(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>
          {withBalance.length} transactions
        </div>
        <button className="btn btn-ghost" onClick={handleExport} style={{ gap: 6 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {withBalance.length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--c-text3)' }}>
          <Wallet size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>No transactions found</div>
          <div style={{ fontSize: 13 }}>Try changing the date range or search filters.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Flow</th>
                <th>Party</th>
                <th>Reference</th>
                <th>Method</th>
                <th>Narration</th>
                <th style={{ textAlign: 'right' }}>Money In</th>
                <th style={{ textAlign: 'right' }}>Money Out</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {withBalance.map((txn, i) => {
                const isIn = txn.txn_type === 'receipt'
                const meta = METHOD_META[txn.method] || METHOD_META.bank_transfer
                const hasRef = txn.reference && txn.reference !== '—'
                return (
                  <tr key={i}>
                    <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--c-text2)', whiteSpace: 'nowrap' }}>
                      {txn.date?.split('T')[0]}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {isIn
                          ? <ArrowDownLeft size={14} color="#0a8754" />
                          : <ArrowUpRight  size={14} color="#d63d3d" />}
                        <span style={{ fontSize: 11, fontWeight: 700, color: isIn ? '#0a8754' : '#d63d3d', textTransform: 'uppercase' }}>
                          {isIn ? 'In' : 'Out'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{txn.party || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {hasRef
                          ? <CheckCircle2 size={12} color="#0a8754" />
                          : <Clock size={12} color="#c97b10" />}
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-text3)' }}>
                          {txn.reference || 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        background: meta.color + '18', color: meta.color,
                      }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--c-text2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {txn.narration || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#0a8754', fontWeight: isIn ? 700 : 400 }}>
                      {isIn ? fmt.currency(txn.amount) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#d63d3d', fontWeight: !isIn ? 700 : 400 }}>
                      {!isIn ? fmt.currency(txn.out_amount) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: txn.running_balance >= 0 ? 'var(--c-primary)' : '#d63d3d' }}>
                      {fmt.currency(txn.running_balance)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--c-border)', background: 'var(--c-surface2)', fontWeight: 800 }}>
                <td colSpan={6} style={{ padding: '10px 14px', fontSize: 12 }}>
                  {withBalance.length} transactions
                </td>
                <td style={{ textAlign: 'right', padding: '10px 14px', fontFamily: 'monospace', color: '#0a8754', fontSize: 13 }}>
                  {fmt.currency(totalIn)}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 14px', fontFamily: 'monospace', color: '#d63d3d', fontSize: 13 }}>
                  {fmt.currency(totalOut)}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 14px', fontFamily: 'monospace', color: netFlow >= 0 ? 'var(--c-primary)' : '#d63d3d', fontSize: 14 }}>
                  {fmt.currency(netFlow)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
